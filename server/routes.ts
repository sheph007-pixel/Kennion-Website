import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import Papa from "papaparse";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import {
  priceGroup,
  inferRatingAreaFromCensus,
  censusEntriesToMembers,
  loadFactorTables,
  reloadFactorTables,
  type CensusMember,
  type RatingArea,
  type Admin,
} from "./rate-engine";
import {
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateGroupStatusSchema,
} from "@shared/schema";
import ConnectPgSimple from "connect-pg-simple";
import { log } from "./index";
import { sendMagicLinkEmail } from "./email";
import { pool, testConnection } from "./db";
import { cleanCSVWithAI, generateValidationGuidance } from "./ai-csv-cleaner";
import { generateActuarialAnalysis, generateScoreReview } from "./ai-analysis";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const templateUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

declare module "express-session" {
  interface SessionData {
    userId?: string;
    pendingCensus?: {
      headers: string[];
      rows: any[];
      fileName: string;
      aiCleaned?: any;
    };
  }
}

function generateMagicToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const forwardedHost = req.headers["x-forwarded-host"] as string | undefined;
  if (forwardedHost) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    return `${proto}://${forwardedHost}`;
  }
  const host = req.headers.host;
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return `https://${host}`;
  }
  return `${req.protocol}://${host}`;
}

// STRICT: Require exact column names from template (no AI mapping)
const REQUIRED_COLUMNS = [
  "First Name",
  "Last Name",
  "Type",
  "Date of Birth",
  "Gender",
  "Zip Code"
];

/**
 * Validates that CSV has exactly the required columns
 * Returns error message if validation fails, null if valid
 */
function validateColumns(csvHeaders: string[]): string | null {
  const trimmedHeaders = csvHeaders.map(h => h.trim());

  // Check if all required columns are present
  const missingColumns = REQUIRED_COLUMNS.filter(
    required => !trimmedHeaders.includes(required)
  );

  if (missingColumns.length > 0) {
    return `Missing required columns: ${missingColumns.join(", ")}. Please download and use our template with exact column names.`;
  }

  // Check for extra columns (optional - could allow them)
  const extraColumns = trimmedHeaders.filter(
    header => header && !REQUIRED_COLUMNS.includes(header)
  );

  if (extraColumns.length > 0) {
    return `Unexpected columns found: ${extraColumns.join(", ")}. Please use only the 6 required columns from our template.`;
  }

  return null; // Valid
}

// Demographic Risk Analysis lookup table based on age band and gender
const DEMOGRAPHIC_RISK_TABLE: Record<string, { female: number; male: number }> = {
  "0-4": { female: 0.35, male: 0.40 },
  "5-9": { female: 0.30, male: 0.55 },
  "10-14": { female: 0.37, male: 0.46 },
  "15-19": { female: 0.62, male: 0.46 },
  "20-24": { female: 0.80, male: 0.46 },
  "25-29": { female: 0.92, male: 0.46 },
  "30-34": { female: 0.88, male: 0.45 },
  "35-39": { female: 0.81, male: 0.52 },
  "40-44": { female: 1.18, male: 0.77 },
  "45-49": { female: 1.03, male: 0.67 },
  "50-54": { female: 1.43, male: 1.20 },
  "55-59": { female: 1.22, male: 1.52 },
  "60-64": { female: 1.49, male: 1.99 },
  "65-69": { female: 3.81, male: 1.64 },
  "70-Above": { female: 10.36, male: 2.78 },
};

function getAgeBand(age: number): string {
  if (age < 5) return "0-4";
  if (age < 10) return "5-9";
  if (age < 15) return "10-14";
  if (age < 20) return "15-19";
  if (age < 25) return "20-24";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  if (age < 45) return "40-44";
  if (age < 50) return "45-49";
  if (age < 55) return "50-54";
  if (age < 60) return "55-59";
  if (age < 65) return "60-64";
  if (age < 70) return "65-69";
  return "70-Above";
}

function getRiskScoreForPerson(age: number, gender: string): number {
  const ageBand = getAgeBand(age);
  const riskData = DEMOGRAPHIC_RISK_TABLE[ageBand];

  if (!riskData) {
    // Fallback to default average if age band not found
    return gender.toLowerCase() === "female" || gender.toLowerCase() === "f" ? 0.97 : 0.80;
  }

  const isFemale = gender.toLowerCase() === "female" || gender.toLowerCase() === "f";
  return isFemale ? riskData.female : riskData.male;
}

function analyzeGroupRisk(entries: { dateOfBirth: string; gender: string; relationship: string }[]): {
  riskScore: number;
  riskTier: string;
  averageAge: number;
  maleCount: number;
  femaleCount: number;
  characteristics: any;
} {
  const now = new Date();
  const ages: number[] = [];
  let maleCount = 0;
  let femaleCount = 0;
  const eeAges: number[] = [];
  let totalRiskScore = 0;
  let validEntries = 0;

  // Count by age band and gender for detailed distribution
  const ageBandDistribution: Record<string, { female: number; male: number }> = {};

  for (const entry of entries) {
    let dob: Date | null = null;
    const dobStr = entry.dateOfBirth.trim();

    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    for (const fmt of formats) {
      const m = dobStr.match(fmt);
      if (m) {
        if (fmt === formats[0]) {
          dob = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
        } else {
          dob = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
        }
        break;
      }
    }

    if (!dob || isNaN(dob.getTime())) {
      dob = new Date(dobStr);
    }

    if (dob && !isNaN(dob.getTime())) {
      const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age > 0 && age < 120) {
        ages.push(age);
        const rel = entry.relationship.toUpperCase();
        if (rel === "EE" || rel === "EMPLOYEE") {
          eeAges.push(age);
        }

        // Calculate risk score for this person using the lookup table
        const personRiskScore = getRiskScoreForPerson(age, entry.gender);
        totalRiskScore += personRiskScore;
        validEntries++;

        // Track age band distribution
        const ageBand = getAgeBand(age);
        if (!ageBandDistribution[ageBand]) {
          ageBandDistribution[ageBand] = { female: 0, male: 0 };
        }
        const isFemale = entry.gender.toLowerCase() === "female" || entry.gender.toLowerCase() === "f";
        if (isFemale) {
          ageBandDistribution[ageBand].female++;
        } else {
          ageBandDistribution[ageBand].male++;
        }
      }
    }

    const g = entry.gender.toLowerCase();
    if (g === "male" || g === "m") maleCount++;
    else if (g === "female" || g === "f") femaleCount++;
  }

  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 35;
  const avgEeAge = eeAges.length > 0 ? eeAges.reduce((a, b) => a + b, 0) / eeAges.length : avgAge;

  // Calculate weighted average risk score based on the demographic lookup table
  let riskScore = validEntries > 0 ? totalRiskScore / validEntries : 1.0;

  // Round to 2 decimal places
  riskScore = Math.round(riskScore * 100) / 100;

  // CRITICAL: Risk tier categorization thresholds (DO NOT MODIFY without approval)
  // Preferred Risk: < 1.0 (Below 1.0)
  // Standard Risk: 1.0 - 1.49 (1.0 to less than 1.5)
  // High Risk: >= 1.5 (1.5 and above)
  let riskTier = "standard";
  if (riskScore < 1.0) {
    riskTier = "preferred";
  } else if (riskScore >= 1.5) {
    riskTier = "high";
  }

  const eeCount = entries.filter(e => {
    const r = e.relationship.toUpperCase();
    return r === "EE" || r === "EMPLOYEE";
  }).length;

  const ageRanges = {
    "0-4": ages.filter(a => a < 5).length,
    "5-9": ages.filter(a => a >= 5 && a < 10).length,
    "10-14": ages.filter(a => a >= 10 && a < 15).length,
    "15-19": ages.filter(a => a >= 15 && a < 20).length,
    "20-24": ages.filter(a => a >= 20 && a < 25).length,
    "25-29": ages.filter(a => a >= 25 && a < 30).length,
    "30-34": ages.filter(a => a >= 30 && a < 35).length,
    "35-39": ages.filter(a => a >= 35 && a < 40).length,
    "40-44": ages.filter(a => a >= 40 && a < 45).length,
    "45-49": ages.filter(a => a >= 45 && a < 50).length,
    "50-54": ages.filter(a => a >= 50 && a < 55).length,
    "55-59": ages.filter(a => a >= 55 && a < 60).length,
    "60-64": ages.filter(a => a >= 60 && a < 65).length,
    "65-69": ages.filter(a => a >= 65 && a < 70).length,
    "70+": ages.filter(a => a >= 70).length,
  };

  const femaleRatio = entries.length > 0 ? femaleCount / entries.length : 0.5;
  const olderEes = eeAges.filter(a => a > 55).length;
  const olderRatio = eeAges.length > 0 ? olderEes / eeAges.length : 0;

  // Calculate risk segments for individual members
  let lowRisk = 0;
  let avgRisk = 0;
  let highRisk = 0;

  for (const entry of entries) {
    const dobStr = entry.dateOfBirth.trim();
    let dob: Date | null = null;

    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    for (const fmt of formats) {
      const m = dobStr.match(fmt);
      if (m) {
        if (fmt === formats[0]) {
          dob = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
        } else {
          dob = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
        }
        break;
      }
    }

    if (!dob || isNaN(dob.getTime())) {
      dob = new Date(dobStr);
    }

    if (dob && !isNaN(dob.getTime())) {
      const now = new Date();
      const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age > 0 && age < 120) {
        const personRiskScore = getRiskScoreForPerson(age, entry.gender);
        if (personRiskScore < 1.0) lowRisk++;
        else if (personRiskScore < 1.5) avgRisk++;
        else highRisk++;
      }
    }
  }

  const total = lowRisk + avgRisk + highRisk || 1;
  const lowRiskPct = Math.round((lowRisk / total) * 100);
  const avgRiskPct = Math.round((avgRisk / total) * 100);
  const highRiskPct = Math.round((highRisk / total) * 100);

  const characteristics = {
    ageDistribution: ageRanges,
    ageBandDistribution,
    averageEmployeeAge: Math.round(avgEeAge * 10) / 10,
    dependencyRatio: eeCount > 0 ? Math.round(((entries.length - eeCount) / eeCount) * 100) / 100 : 0,
    groupSizeCategory: eeCount < 10 ? "Micro" : eeCount < 25 ? "Small" : eeCount < 50 ? "Mid-Size" : eeCount < 100 ? "Large" : "Enterprise",
    factors: [] as string[],
    riskSegments: {
      lowRisk,
      avgRisk,
      highRisk,
      lowRiskPct,
      avgRiskPct,
      highRiskPct,
    },
  };

  if (avgEeAge < 35) characteristics.factors.push("Young workforce (favorable)");
  if (avgEeAge > 50) characteristics.factors.push("Mature workforce (higher utilization expected)");
  if (eeCount >= 50) characteristics.factors.push("Large group size (favorable for risk pooling)");
  if (eeCount < 10) characteristics.factors.push("Small group (limited risk pooling)");
  if (olderRatio > 0.3) characteristics.factors.push("High concentration of members 55+");
  if (characteristics.dependencyRatio > 1.5) characteristics.factors.push("High dependency ratio");
  if (femaleRatio > 0.65) characteristics.factors.push("Female-dominant workforce");

  // Calculate qualification score: lower risk = higher qualification score
  const qualScore = Math.round(Math.max(0, Math.min(100, (2.0 - riskScore) / 2.0 * 100)));

  return {
    riskScore,
    riskTier,
    averageAge: Math.round(avgAge * 10) / 10,
    maleCount,
    femaleCount,
    characteristics: { ...characteristics, qualificationScore: qualScore },
    ageBandDistribution, // Include this for validation
  };
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  matchRate: number;
}

function validateCensusData(
  entries: { firstName: string; lastName: string; dateOfBirth: string; gender: string; zipCode: string; relationship: string }[],
  analysis: ReturnType<typeof analyzeGroupRisk>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate Age Band table totals
  const distribution = analysis.ageBandDistribution || {};
  let tableTotalFemales = 0;
  let tableTotalMales = 0;

  Object.values(distribution).forEach((bandData: any) => {
    const females = bandData.female || 0;
    const males = bandData.male || 0;
    tableTotalFemales += females;
    tableTotalMales += males;
  });
  const tableTotalMembers = tableTotalFemales + tableTotalMales;

  // Recalculate risk score for validation
  let tableWeightedRiskSum = 0;
  Object.entries(distribution).forEach(([band, bandData]: [string, any]) => {
    const females = bandData.female || 0;
    const males = bandData.male || 0;
    const riskData = DEMOGRAPHIC_RISK_TABLE[band];
    if (riskData) {
      tableWeightedRiskSum += females * riskData.female + males * riskData.male;
    }
  });
  const tableCalculatedRiskScore = tableTotalMembers > 0 ? Math.round((tableWeightedRiskSum / tableTotalMembers) * 100) / 100 : 0;

  // Census Details values
  const censusTotalMembers = entries.length;
  const censusEmployees = entries.filter(e => e.relationship === "EE").length;
  const censusSpouses = entries.filter(e => e.relationship === "SP").length;
  const censusChildren = entries.filter(e => e.relationship === "CH").length;
  const censusSumCheck = censusEmployees + censusSpouses + censusChildren;
  const censusFemales = analysis.femaleCount || 0;
  const censusMales = analysis.maleCount || 0;
  const censusGenderTotal = censusFemales + censusMales;

  // Validation checks
  const totalLivesMatch = tableTotalMembers === censusTotalMembers && censusTotalMembers === censusSumCheck;
  const genderTotalsMatch = tableTotalMembers === censusGenderTotal;
  const genderBreakdownMatch = tableTotalFemales === censusFemales && tableTotalMales === censusMales;
  const riskScoreExists = analysis.riskScore != null;
  const riskScoreMatches = riskScoreExists && Math.abs(analysis.riskScore - tableCalculatedRiskScore) < 0.01;

  // Risk tier validation
  let riskTierCorrect = false;
  if (riskScoreExists) {
    if (analysis.riskScore < 1.0 && analysis.riskTier === 'preferred') riskTierCorrect = true;
    else if (analysis.riskScore >= 1.0 && analysis.riskScore < 1.5 && analysis.riskTier === 'standard') riskTierCorrect = true;
    else if (analysis.riskScore >= 1.5 && analysis.riskTier === 'high') riskTierCorrect = true;
  }

  // Build error messages
  if (!totalLivesMatch) {
    errors.push(`Total Lives Mismatch: Census (${censusTotalMembers}) ≠ Age Band Table (${tableTotalMembers}) ≠ Sum (${censusSumCheck}). Please ensure all employee records have valid dates of birth.`);
  }

  if (!genderTotalsMatch) {
    errors.push(`Gender Total Mismatch: Age Band Table (${tableTotalMembers}) ≠ Gender Count (${censusGenderTotal}). Some records may have invalid gender values.`);
  }

  if (!genderBreakdownMatch) {
    errors.push(`Gender Breakdown Mismatch: Table (${tableTotalFemales}F + ${tableTotalMales}M) ≠ Census (${censusFemales}F + ${censusMales}M). Check that all gender values are 'Male' or 'Female'.`);
  }

  if (!riskScoreMatches) {
    errors.push(`Risk Score Calculation Error: Stored (${analysis.riskScore?.toFixed(3)}) ≠ Calculated (${tableCalculatedRiskScore.toFixed(3)}). Date of birth or gender data may be invalid.`);
  }

  if (!riskTierCorrect) {
    errors.push(`Risk Tier Categorization Error: Score ${analysis.riskScore?.toFixed(3)} should be categorized as ${analysis.riskScore < 1.0 ? 'Preferred (<1.0)' : analysis.riskScore < 1.5 ? 'Standard (1.0-1.49)' : 'High (≥1.5)'}, but is marked as '${analysis.riskTier}'.`);
  }

  const allChecks = [totalLivesMatch, genderTotalsMatch, genderBreakdownMatch, riskScoreExists, riskScoreMatches, riskTierCorrect];
  const passedChecks = allChecks.filter(Boolean).length;
  const matchRate = Math.round((passedChecks / allChecks.length) * 100);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    matchRate,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Test database connection before starting
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error("WARNING: Starting server without verified database connection");
  }

  // Create session table manually (connect-pg-simple's createTableIfMissing
  // reads a bundled .sql file that doesn't survive the Railway build).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);

  const PgStore = ConnectPgSimple(session);

  app.use(
    session({
      store: new PgStore({
        pool,
        errorLog: (err: Error) => {
          console.error("Session store error:", err.message);
        },
      }),
      secret: process.env.SESSION_SECRET || "kennion-secret-key",
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  // Health check endpoint (no DB required)
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // DB health check endpoint
  app.get("/api/health/db", async (_req: Request, res: Response) => {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      res.json({ status: "ok", database: "connected" });
    } catch (err: any) {
      res.status(503).json({ status: "error", database: err.message });
    }
  });

  // xlsm rate-engine diagnostic endpoint — surfaces which python is resolved,
  // whether uno/openpyxl/soffice are importable/present, and the last run's
  // stderr log. No auth (read-only environment info only). Use ?run=1 to
  // force a live invocation with a tiny hardcoded census.
  app.get("/api/_diag/xlsm", async (req: Request, res: Response) => {
    try {
      const mod = await import("./xlsm-rate-engine");
      const env = await mod.probeXlsmEnv();
      let pipeline: unknown = null;
      if (req.query.run === "1") {
        try {
          pipeline = await mod.priceGroupViaXlsm({
            group: "__diag__",
            effectiveDate: "2026-04-01",
            ratingArea: "Birmingham",
            admin: "EBPA",
            census: [
              { relationship: "Employee", firstName: "Diag", lastName: "Test",
                dob: "1988-07-31", sex: "F", zip: "35243" },
              { relationship: "Spouse", firstName: "Diag", lastName: "Spouse",
                dob: "1990-01-01", sex: "M", zip: "35243" },
              { relationship: "Child", firstName: "Diag", lastName: "Kid",
                dob: "2015-06-01", sex: "F", zip: "35243" },
            ],
          });
        } catch (e: any) {
          pipeline = { error: e && e.message ? e.message : String(e) };
        }
      }
      res.json({ env, pipeline, now: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err && err.message ? err.message : String(err) });
    }
  });


  app.post("/api/auth/magic-link", async (req: Request, res: Response) => {
    try {
      const data = magicLinkRequestSchema.parse(req.body);
      const token = generateMagicToken();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      let user = await storage.getUserByEmail(data.email);

      if (user) {
        await storage.updateUser(user.id, {
          magicToken: token,
          magicTokenExpiry: expiry,
          ...(data.fullName && { fullName: data.fullName }),
          ...(data.companyName && { companyName: data.companyName }),
        });
      } else {
        if (!data.fullName) {
          return res.json({ message: "Please provide your details", needsSignup: true });
        }
        user = await storage.createUser({
          fullName: data.fullName,
          email: data.email,
          companyName: data.companyName || null,
          phone: null,
          password: null,
          magicToken: token,
          magicTokenExpiry: expiry,
        });
      }

      const baseUrl = getBaseUrl(req);
      const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

      await sendMagicLinkEmail(data.email, magicLinkUrl, user.fullName);

      res.json({ message: "Sign-in link sent to your email", email: data.email });
    } catch (err: any) {
      log(`Magic link error: ${err.message}`);
      res.status(400).json({ message: err.message || "Failed to send sign-in link" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);

      // Validate access code
      if (data.accessCode !== "8787") {
        return res.status(400).json({ message: "Invalid access code. Please check your code and try again." });
      }

      const fullName = `${data.firstName} ${data.lastName}`;

      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user as verified (access code grants instant access)
      const user = await storage.createUser({
        fullName,
        email: data.email,
        companyName: data.companyName,
        phone: data.phone,
        password: hashedPassword,
        verified: true,
        magicToken: null,
        magicTokenExpiry: null,
      });

      // Log user in immediately
      req.session.userId = user.id;

      res.json({
        message: "Account created successfully",
        email: data.email,
        verified: true
      });
    } catch (err: any) {
      log(`Registration error: ${err.message}`);
      res.status(400).json({ message: err.message || "Registration failed" });
    }
  });

  app.post("/api/auth/verify-magic-link", async (req: Request, res: Response) => {
    try {
      const data = magicLinkVerifySchema.parse(req.body);
      const user = await storage.getUserByMagicToken(data.token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired link" });
      }

      if (!user.magicTokenExpiry || new Date() > user.magicTokenExpiry) {
        await storage.updateUser(user.id, { magicToken: null, magicTokenExpiry: null });
        return res.status(400).json({ message: "This link has expired. Please request a new one." });
      }

      await storage.updateUser(user.id, {
        verified: true,
        magicToken: null,
        magicTokenExpiry: null,
      });

      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) {
          log(`Session save error: ${saveErr.message}`);
          return res.status(500).json({ message: "Failed to create session. Please try again." });
        }
        res.json({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
        });
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Verification failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);

      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Login failed" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists, a password reset link has been sent" });
      }

      // Generate reset token
      const resetToken = generateMagicToken();
      const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await storage.updateUser(user.id, {
        magicToken: resetToken,
        magicTokenExpiry: resetExpiry,
      });

      // Send reset email
      const baseUrl = getBaseUrl(req);
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      await sendMagicLinkEmail(data.email, resetUrl, user.fullName);

      res.json({ message: "If an account exists, a password reset link has been sent" });
    } catch (err: any) {
      log(`Forgot password error: ${err.message}`);
      res.status(400).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const user = await storage.getUserByMagicToken(data.token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (!user.magicTokenExpiry || new Date() > user.magicTokenExpiry) {
        await storage.updateUser(user.id, { magicToken: null, magicTokenExpiry: null });
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        magicToken: null,
        magicTokenExpiry: null,
      });

      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (err: any) {
      log(`Reset password error: ${err.message}`);
      res.status(400).json({ message: err.message || "Failed to reset password" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
      phone: user.phone,
      verified: user.verified,
      createdAt: user.createdAt,
    });
  });

  // User management endpoints
  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers);
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const data = req.body;

      // Build update object with only provided fields
      const updates: any = {};
      if (data.fullName !== undefined) updates.fullName = data.fullName;
      if (data.email !== undefined) updates.email = data.email;
      if (data.companyName !== undefined) updates.companyName = data.companyName;
      if (data.phone !== undefined) updates.phone = data.phone;
      if (data.role !== undefined) updates.role = data.role;
      if (data.verified !== undefined) updates.verified = data.verified;

      const updated = await storage.updateUser(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Update failed" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow deleting yourself
      if (req.session.userId === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Cascade delete: first remove all groups belonging to this user
      // (groups have FK to users; census and proposals cascade with groups)
      const userGroups = await storage.getGroupsByUserId(id);
      for (const group of userGroups) {
        await storage.deleteCensusByGroupId(group.id);
        await storage.deleteGroup(group.id);
      }

      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Delete failed" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate reset token
      const resetToken = generateMagicToken();
      const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for admin resets

      await storage.updateUser(user.id, {
        magicToken: resetToken,
        magicTokenExpiry: resetExpiry,
      });

      // Send reset email
      const baseUrl = getBaseUrl(req);
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      await sendMagicLinkEmail(user.email, resetUrl, user.fullName);

      res.json({
        message: "Password reset email sent to user",
        resetUrl: resetUrl // Include for admin to see/share if needed
      });
    } catch (err: any) {
      log(`Admin password reset error: ${err.message}`);
      res.status(500).json({ message: err.message || "Failed to send reset email" });
    }
  });

  // User updates their own profile — name, company, phone. Email + role
  // are deliberately not editable here (email changes need verification).
  app.patch("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const data = req.body || {};
      const updates: any = {};
      if (typeof data.fullName === "string") updates.fullName = data.fullName.trim();
      if (typeof data.companyName === "string") updates.companyName = data.companyName.trim();
      if (typeof data.phone === "string") updates.phone = data.phone.trim();

      if (updates.fullName !== undefined && updates.fullName.length < 1) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      if (updates.companyName !== undefined && updates.companyName.length < 1) {
        return res.status(400).json({ message: "Company name cannot be empty." });
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update." });
      }

      const updated = await storage.updateUser(req.session.userId, updates);
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json({
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        companyName: updated.companyName,
        phone: updated.phone,
        verified: updated.verified,
        createdAt: updated.createdAt,
      });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Profile update failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/groups/template", (_req: Request, res: Response) => {
    const csv = "First Name,Last Name,Type,Date of Birth,Gender,Zip Code\nJohn,Smith,EE,3/15/1985,Male,30301\nJane,Smith,SP,8/22/1987,Female,30301\nTommy,Smith,CH,1/10/2015,Male,30301\nSarah,Johnson,EE,6/12/1990,Female,30301\nMike,Williams,EE,11/3/1978,Male,30302\n";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=census_template.csv");
    res.send(csv);
  });

  app.get("/api/groups/sample", (_req: Request, res: Response) => {
    const sampleData = [
      { "First Name": "John", "Last Name": "Smith", "Type": "EE", "Date of Birth": "3/15/1985", "Gender": "Male", "Zip Code": "30301" },
      { "First Name": "Jane", "Last Name": "Smith", "Type": "SP", "Date of Birth": "8/22/1987", "Gender": "Female", "Zip Code": "30301" },
      { "First Name": "Tommy", "Last Name": "Smith", "Type": "CH", "Date of Birth": "1/10/2015", "Gender": "Male", "Zip Code": "30301" },
      { "First Name": "Sarah", "Last Name": "Johnson", "Type": "EE", "Date of Birth": "6/12/1990", "Gender": "Female", "Zip Code": "30301" },
      { "First Name": "Mike", "Last Name": "Williams", "Type": "EE", "Date of Birth": "11/3/1978", "Gender": "Male", "Zip Code": "30302" },
    ];
    res.json(sampleData);
  });

  app.post("/api/groups/parse", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvText = req.file.buffer.toString("utf-8");
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        return res.status(400).json({
          message: "CSV parsing error: " + parsed.errors[0].message,
        });
      }

      const rows = parsed.data as any[];
      if (rows.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      const headers = Object.keys(rows[0]).filter(h => h.trim() !== "");

      log(`Found ${headers.length} columns: ${headers.join(", ")}`);

      // Filter out completely empty rows (rows where all values are empty/null)
      const nonEmptyRows = rows.filter(row => {
        const values = Object.values(row);
        return values.some(val => val != null && String(val).trim() !== "");
      });

      log(`Filtered ${rows.length} rows down to ${nonEmptyRows.length} non-empty rows`);

      if (nonEmptyRows.length === 0) {
        return res.status(400).json({ message: "CSV file contains no valid data" });
      }

      // Detect column mapping with AI (don't clean data yet)
      log("Detecting column mapping with AI...");
      const aiResult = await cleanCSVWithAI(headers, nonEmptyRows);

      // Store raw data and AI result in session
      req.session.pendingCensus = {
        headers,
        rows: nonEmptyRows,
        fileName: req.file.originalname || "census.csv",
        detectedMapping: aiResult.columnMapping
      };

      // Return detected mapping and sample data for confirmation
      const sampleRows = nonEmptyRows.slice(0, 3).map(row => {
        const sample: Record<string, string> = {};
        headers.forEach(h => {
          sample[h] = row[h]?.toString() || "";
        });
        return sample;
      });

      res.json({
        totalRows: rows.length,
        validRows: nonEmptyRows.length,
        headers: headers,
        columnMapping: aiResult.columnMapping,
        sampleRows: sampleRows,
        message: "Column mapping detected. Please confirm the mapping below."
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Parse failed" });
    }
  });

  app.post("/api/groups/apply-mapping", requireAuth, async (req: Request, res: Response) => {
    try {
      const pendingCensus = req.session.pendingCensus;
      if (!pendingCensus || !pendingCensus.headers || !pendingCensus.rows) {
        return res.status(400).json({ message: "No pending census data. Please upload a file first." });
      }

      const { columnMapping } = req.body;
      if (!columnMapping) {
        return res.status(400).json({ message: "Column mapping is required" });
      }

      log("Applying user-confirmed column mapping and cleaning data...");

      // Clean data with user-confirmed mapping
      const aiResult = await cleanCSVWithAI(
        pendingCensus.headers,
        pendingCensus.rows,
        columnMapping
      );

      // Convert cleaned data to preview format
      const previewRows = aiResult.cleanedData.slice(0, 10).map(cleaned => ({
        firstName: cleaned.firstName,
        lastName: cleaned.lastName,
        relationship: cleaned.relationship,
        dob: cleaned.dob,
        gender: cleaned.gender,
        zip: cleaned.zip,
        issues: cleaned.issues
      }));

      // Store cleaned data in session for submission
      req.session.pendingCensus = {
        ...pendingCensus,
        aiCleaned: aiResult,
        confirmedMapping: columnMapping
      };

      res.json({
        totalRows: pendingCensus.rows.length,
        cleanedRows: aiResult.cleanedData.length,
        previewRows,
        summary: aiResult.summary,
        warnings: aiResult.warnings,
        confidence: aiResult.confidence
      });
    } catch (err: any) {
      log(`Apply mapping error: ${err.message}`);
      res.status(500).json({ message: err.message || "Failed to apply column mapping" });
    }
  });

  app.post("/api/groups/confirm", requireAuth, async (req: Request, res: Response) => {
    try {
      const pendingCensus = req.session.pendingCensus;
      if (!pendingCensus || !pendingCensus.aiCleaned) {
        return res.status(400).json({ message: "No pending census data. Please upload a file first." });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const aiCleaned = pendingCensus.aiCleaned;

      // Convert AI-cleaned data to storage format
      interface CensusEntry {
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        gender: string;
        zipCode: string;
        relationship: string;
      }

      const entries: CensusEntry[] = aiCleaned.cleanedData.map((cleaned: any) => {
        return {
          firstName: cleaned.firstName,
          lastName: cleaned.lastName,
          dateOfBirth: cleaned.dob,
          gender: cleaned.gender,
          zipCode: cleaned.zip,
          relationship: cleaned.relationship, // Already in "EE"/"SP"/"CH" format from AI cleaner
        };
      });

      const invalid = entries.filter(
        (e: CensusEntry) => !e.firstName || !e.lastName || !e.dateOfBirth || !e.gender || !e.zipCode
      );
      if (invalid.length > 0) {
        log(`Validation failed: ${invalid.length} invalid rows after AI cleaning`);
        return res.status(400).json({
          message: `${invalid.length} row(s) have missing required fields after AI processing. Please check your CSV file.`,
        });
      }

      const employeeCount = entries.filter((e: CensusEntry) => e.relationship === "EE").length;
      const spouseCount = entries.filter((e: CensusEntry) => e.relationship === "SP").length;
      const childrenCount = entries.filter((e: CensusEntry) => e.relationship === "CH").length;

      const analysis = analyzeGroupRisk(entries);

      // CRITICAL: Validate data integrity before saving
      const validation = validateCensusData(entries, analysis);
      if (!validation.valid) {
        log(`Census validation failed: Match Rate ${validation.matchRate}%`);

        // Generate AI-powered guidance to help users fix the issues
        const guidance = await generateValidationGuidance(validation.errors, validation.matchRate);

        return res.status(400).json({
          message: "Census data validation failed",
          guidance,
          errors: validation.errors,
          matchRate: validation.matchRate,
          needsReupload: true,
        });
      }

      log(`Census validation passed: Match Rate ${validation.matchRate}%`);

      const group = await storage.createGroup({
        userId: user.id,
        companyName: user.companyName || "Unnamed Company",
        contactName: user.fullName,
        contactEmail: user.email,
        contactPhone: user.phone,
        employeeCount,
        childrenCount,
        spouseCount,
        totalLives: entries.length,
      });

      // Generate AI-powered actuarial analysis
      const adminNotes = await generateActuarialAnalysis({
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        employeeCount,
        spouseCount,
        childrenCount,
        totalLives: entries.length,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        characteristics: analysis.characteristics,
        companyName: user.companyName || "Unnamed Company",
      });

      await storage.updateGroup(group.id, {
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        groupCharacteristics: analysis.characteristics,
        score: analysis.characteristics.qualificationScore,
        adminNotes,
        status: "analyzing",
      });

      await storage.createCensusEntries(
        entries.map((e: any) => ({
          groupId: group.id,
          firstName: e.firstName,
          lastName: e.lastName,
          dateOfBirth: e.dateOfBirth,
          gender: e.gender,
          zipCode: e.zipCode,
          relationship: e.relationship,
        }))
      );

      delete req.session.pendingCensus;

      const updatedGroup = await storage.getGroup(group.id);

      res.json({
        message: "Census uploaded and analyzed successfully",
        group: updatedGroup,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  app.post("/api/groups/upload", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const csvText = req.file.buffer.toString("utf-8");
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      });

      if (parsed.errors.length > 0) {
        return res.status(400).json({
          message: "CSV parsing error: " + parsed.errors[0].message,
        });
      }

      const rows = parsed.data as any[];
      if (rows.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      const requiredFields = ["first_name", "last_name", "date_of_birth", "gender", "zip_code"];
      const headers = Object.keys(rows[0]);
      const missing = requiredFields.filter((f) => !headers.includes(f));
      if (missing.length > 0) {
        return res.status(400).json({
          message: `Missing required columns: ${missing.join(", ")}. Required: First Name, Last Name, Date of Birth, Gender, Zip Code`,
        });
      }

      const entries = rows.map((row: any) => {
        const rel = (row.type || row.relationship || "EE").trim().toUpperCase();
        let relationship = "EE";
        if (["SP", "SPOUSE"].includes(rel)) relationship = "SP";
        else if (["CH", "CHILD", "CHILDREN", "DEP", "DEPENDENT"].includes(rel)) relationship = "CH";

        return {
          firstName: (row.first_name || "").trim(),
          lastName: (row.last_name || "").trim(),
          dateOfBirth: (row.date_of_birth || "").trim(),
          gender: (row.gender || "").trim(),
          zipCode: (row.zip_code || "").trim(),
          relationship,
        };
      });

      const invalid = entries.filter(
        (e) => !e.firstName || !e.lastName || !e.dateOfBirth || !e.gender || !e.zipCode
      );
      if (invalid.length > 0) {
        return res.status(400).json({
          message: `${invalid.length} row(s) have missing required fields.`,
        });
      }

      const employeeCount = entries.filter(e => e.relationship === "EE").length;
      const spouseCount = entries.filter(e => e.relationship === "SP").length;
      const childrenCount = entries.filter(e => e.relationship === "CH").length;

      const analysis = analyzeGroupRisk(entries);

      // CRITICAL: Validate data integrity before saving
      const validation = validateCensusData(entries, analysis);
      if (!validation.valid) {
        log(`Census validation failed (legacy upload): Match Rate ${validation.matchRate}%`);

        // Generate AI-powered guidance to help users fix the issues
        const guidance = await generateValidationGuidance(validation.errors, validation.matchRate);

        return res.status(400).json({
          message: "Census data validation failed",
          guidance,
          errors: validation.errors,
          matchRate: validation.matchRate,
          needsReupload: true,
        });
      }

      log(`Census validation passed (legacy upload): Match Rate ${validation.matchRate}%`);

      const group = await storage.createGroup({
        userId: user.id,
        companyName: user.companyName || "Unnamed Company",
        contactName: user.fullName,
        contactEmail: user.email,
        contactPhone: user.phone,
        employeeCount,
        childrenCount,
        spouseCount,
        totalLives: entries.length,
      });

      // Generate AI-powered actuarial analysis
      const adminNotes = await generateActuarialAnalysis({
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        employeeCount,
        spouseCount,
        childrenCount,
        totalLives: entries.length,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        characteristics: analysis.characteristics,
        companyName: user.companyName || "Unnamed Company",
      });

      await storage.updateGroup(group.id, {
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        groupCharacteristics: analysis.characteristics,
        score: analysis.characteristics.qualificationScore,
        adminNotes,
        status: "analyzing",
      });

      await storage.createCensusEntries(
        entries.map((e: any) => ({
          groupId: group.id,
          firstName: e.firstName,
          lastName: e.lastName,
          dateOfBirth: e.dateOfBirth,
          gender: e.gender,
          zipCode: e.zipCode,
          relationship: e.relationship,
        }))
      );

      const updatedGroup = await storage.getGroup(group.id);

      res.json({
        message: "Census uploaded successfully",
        group: updatedGroup,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  app.get("/api/groups", requireAuth, async (req: Request, res: Response) => {
    log(`📋 /api/groups called - Session userId: ${req.session.userId}`);
    const userGroups = await storage.getGroupsByUserId(req.session.userId!);
    log(`📋 Found ${userGroups.length} groups for user ${req.session.userId}`);
    log(`📋 First group userId (if any): ${userGroups[0]?.userId}`);
    res.json(userGroups);
  });

  app.get("/api/groups/:id", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const group = await storage.getGroup(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (group.userId !== req.session.userId) {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    res.json(group);
  });

  app.get("/api/groups/:id/census", requireAuth, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const group = await storage.getGroup(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (group.userId !== req.session.userId) {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    const census = await storage.getCensusByGroupId(id);
    res.json(census);
  });

  // Replace the group's census with a new roster. Used by the in-app
  // "Edit" census flow (see client/src/components/proposal/census-modal.tsx).
  // Re-runs risk analysis so the tier, score, and per-count fields on the
  // group match the new roster immediately.
  app.post("/api/groups/:id/census", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const group = await storage.getGroup(id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.userId !== req.session.userId) {
        const user = await storage.getUser(req.session.userId!);
        if (!user || user.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const incoming = Array.isArray(req.body?.entries) ? req.body.entries : null;
      if (!incoming || incoming.length === 0) {
        return res.status(400).json({ message: "Census must include at least one row" });
      }

      // Normalize inbound rows and validate required fields.
      const entries = incoming.map((r: any) => ({
        firstName: String(r.firstName || "").trim(),
        lastName: String(r.lastName || "").trim(),
        dateOfBirth: String(r.dateOfBirth || "").trim(),
        gender: String(r.gender || "").trim(),
        zipCode: String(r.zipCode || "").trim(),
        relationship: String(r.relationship || "").trim(),
      }));

      const missingFields = entries.filter(
        (e: any) => !e.firstName || !e.lastName || !e.dateOfBirth || !e.gender || !e.zipCode || !e.relationship,
      );
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `${missingFields.length} row(s) are missing required fields.`,
        });
      }

      const hasEmployee = entries.some((e: any) => /^(ee|employee)$/i.test(e.relationship));
      if (!hasEmployee) {
        return res.status(400).json({ message: "Census needs at least one Employee row." });
      }

      // Canonicalize relationship codes (EE / SP / CH) before analysis.
      for (const e of entries as any[]) {
        const r = e.relationship.toLowerCase();
        e.relationship = r === "ee" || r === "employee"
          ? "EE"
          : r === "sp" || r === "spouse"
            ? "SP"
            : "CH";
      }

      const analysis = analyzeGroupRisk(entries);
      const validation = validateCensusData(entries, analysis);
      if (!validation.valid) {
        const guidance = await generateValidationGuidance(validation.errors, validation.matchRate);
        return res.status(400).json({
          message: "Census data validation failed",
          guidance,
          errors: validation.errors,
          matchRate: validation.matchRate,
        });
      }

      const employeeCount = entries.filter((e: any) => e.relationship === "EE").length;
      const spouseCount = entries.filter((e: any) => e.relationship === "SP").length;
      const childrenCount = entries.filter((e: any) => e.relationship === "CH").length;

      // Replace the roster. No transaction wrapper in this codebase; the
      // confirm endpoint takes the same tradeoff (brief window with an
      // empty roster) and this is a low-traffic, single-user-per-group
      // operation.
      await storage.deleteCensusByGroupId(id);
      await storage.createCensusEntries(
        entries.map((e: any) => ({
          groupId: id,
          firstName: e.firstName,
          lastName: e.lastName,
          dateOfBirth: e.dateOfBirth,
          gender: e.gender,
          zipCode: e.zipCode,
          relationship: e.relationship,
        })),
      );

      const adminNotes = await generateActuarialAnalysis({
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        employeeCount,
        spouseCount,
        childrenCount,
        totalLives: entries.length,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        characteristics: analysis.characteristics,
        companyName: group.companyName,
      });

      await storage.updateGroup(id, {
        employeeCount,
        spouseCount,
        childrenCount,
        totalLives: entries.length,
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        groupCharacteristics: analysis.characteristics,
        score: analysis.characteristics.qualificationScore,
        adminNotes,
      });

      const updatedGroup = await storage.getGroup(id);
      const updatedEntries = await storage.getCensusByGroupId(id);
      res.json({ group: updatedGroup, entries: updatedEntries });
    } catch (err: any) {
      log(`Census replace error: ${err.message}`, "routes");
      res.status(500).json({ message: err.message || "Census update failed" });
    }
  });

  // Score audit: per-age-band breakdown + signed audit id + cached AI
  // narrative. Used by the ScoreAuditDialog on the customer cockpit.
  app.post("/api/groups/:id/score-review", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const group = await storage.getGroup(id);
      if (!group) return res.status(404).json({ message: "Group not found" });
      if (group.userId !== req.session.userId) {
        const user = await storage.getUser(req.session.userId!);
        if (!user || user.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const rows = await storage.getCensusByGroupId(id);
      if (rows.length === 0) {
        return res.status(400).json({ message: "No census rows to audit." });
      }

      // Per-band accumulator: { females, males, sumRisk, count }
      const bandOrder = [
        "0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34",
        "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-Above",
      ];
      const bandAcc: Record<string, { females: number; males: number; sumRisk: number; count: number }> = {};
      for (const b of bandOrder) bandAcc[b] = { females: 0, males: 0, sumRisk: 0, count: 0 };

      const today = new Date();
      let totalFemale = 0;
      let totalMale = 0;
      let sumAge = 0;
      let ageCount = 0;
      let overallRiskSum = 0;
      let overallRiskCount = 0;

      for (const r of rows) {
        // Parse DOB tolerant of MM/DD/YYYY or YYYY-MM-DD.
        const dobStr = (r.dateOfBirth || "").trim();
        let dob: Date | null = null;
        const iso = dobStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const us = dobStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (iso) dob = new Date(+iso[1], +iso[2] - 1, +iso[3]);
        else if (us) dob = new Date(+us[3], +us[1] - 1, +us[2]);
        if (!dob || isNaN(dob.getTime())) continue;
        const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
        if (age < 0 || age > 120) continue;

        const band = getAgeBand(age);
        const score = getRiskScoreForPerson(age, r.gender || "");
        const g = (r.gender || "").toLowerCase();
        const isFemale = g === "f" || g === "female";
        const isMale = g === "m" || g === "male";

        if (!bandAcc[band]) bandAcc[band] = { females: 0, males: 0, sumRisk: 0, count: 0 };
        if (isFemale) { bandAcc[band].females++; totalFemale++; }
        if (isMale) { bandAcc[band].males++; totalMale++; }
        bandAcc[band].sumRisk += score;
        bandAcc[band].count++;

        sumAge += age;
        ageCount++;
        overallRiskSum += score;
        overallRiskCount++;
      }

      const ageBands = bandOrder.map((band) => {
        const a = bandAcc[band];
        return {
          band,
          females: a.females,
          males: a.males,
          total: a.count,
          avgRiskScore: a.count > 0 ? Math.round((a.sumRisk / a.count) * 1000) / 1000 : 0,
        };
      });
      const overallAvgRisk = overallRiskCount > 0 ? overallRiskSum / overallRiskCount : 1;

      // Stable audit id: FNV-1a 32-bit over a minimal identity fingerprint
      // so the customer can quote it back for later reconciliation.
      const fingerprint = `${group.id}:${group.updatedAt?.toISOString?.() ?? ""}:${rows.length}:${overallAvgRisk.toFixed(4)}`;
      let h = 0x811c9dc5;
      for (let i = 0; i < fingerprint.length; i++) {
        h ^= fingerprint.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      const auditId = "K-" + h.toString(36).toUpperCase().padStart(7, "0").slice(0, 8);

      // Cache check: if we've already generated a narrative for this
      // fingerprint, return the cached value instead of re-billing OpenAI.
      const chars = (group.groupCharacteristics as any) || {};
      const cached = chars.scoreReview;
      let narrative: string;
      if (cached?.auditId === auditId && typeof cached?.narrative === "string") {
        narrative = cached.narrative;
      } else {
        try {
          narrative = await generateScoreReview({
            companyName: group.companyName,
            riskScore: group.riskScore ?? overallAvgRisk,
            riskTier: group.riskTier ?? "standard",
            totalLives: rows.length,
            averageAge: ageCount > 0 ? sumAge / ageCount : 0,
            femalePct: (totalFemale + totalMale) > 0 ? (totalFemale / (totalFemale + totalMale)) * 100 : 0,
            bands: ageBands.map((b) => ({ band: b.band, total: b.total, avgRiskScore: b.avgRiskScore })),
          });
        } catch (err: any) {
          log(`Score review AI error: ${err?.message || err}`, "routes");
          narrative = "Score is consistent with the reported demographic profile.";
        }
        await storage.updateGroup(id, {
          groupCharacteristics: { ...chars, scoreReview: { auditId, narrative, generatedAt: new Date().toISOString() } },
        });
      }

      res.json({
        auditId,
        narrative,
        ageBands,
        totals: { females: totalFemale, males: totalMale, total: totalFemale + totalMale },
        overallAvgRisk,
        engineVersion: "risk-v1",
      });
    } catch (err: any) {
      log(`Score review error: ${err?.message || err}`, "routes");
      res.status(500).json({ message: err?.message || "Score review failed" });
    }
  });

  app.delete("/api/groups/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const group = await storage.getGroup(id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.userId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteCensusByGroupId(id);
      await storage.deleteGroup(id);
      res.json({ message: "Census deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Delete failed" });
    }
  });

  app.get("/api/admin/groups", requireAdmin, async (_req: Request, res: Response) => {
    const allGroups = await storage.getAllGroups();
    res.json(allGroups);
  });

  app.get("/api/admin/groups/:id/census", requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const census = await storage.getCensusByGroupId(id);
    res.json(census);
  });

  app.patch("/api/admin/groups/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const data = updateGroupStatusSchema.parse(req.body);
      const updated = await storage.updateGroup(id, data);
      if (!updated) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Update failed" });
    }
  });

  // Admin approves a group for proposal generation
  app.post("/api/admin/groups/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const group = await storage.getGroup(id);
      if (!group) return res.status(404).json({ message: "Group not found" });
      if (group.status !== "census_uploaded") {
        return res.status(400).json({
          message: `Cannot approve group from status "${group.status}" (must be "census_uploaded")`,
        });
      }
      const updated = await storage.updateGroup(id, { status: "approved" });
      res.json({ ok: true, group: updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Approve failed" });
    }
  });

  // Admin un-approves a group (revert to census_uploaded)
  app.post("/api/admin/groups/:id/unapprove", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const group = await storage.getGroup(id);
      if (!group) return res.status(404).json({ message: "Group not found" });
      if (group.status !== "approved") {
        return res.status(400).json({
          message: `Cannot unapprove group from status "${group.status}" (must be "approved")`,
        });
      }
      const updated = await storage.updateGroup(id, { status: "census_uploaded" });
      res.json({ ok: true, group: updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Unapprove failed" });
    }
  });

  app.delete("/api/admin/groups/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const group = await storage.getGroup(id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      await storage.deleteCensusByGroupId(id);
      await storage.deleteGroup(id);
      res.json({ message: "Group deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Delete failed" });
    }
  });

  // ============================================================
  // Proposal Generator — XLSM template upload & census injection
  // ============================================================

  const TEMPLATE_DIR = path.join(process.cwd(), "uploads", "templates");

  // Ensure template directory exists
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });

  // GET  — check if a template has been uploaded
  app.get("/api/admin/proposal/template-info", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const files = fs.readdirSync(TEMPLATE_DIR).filter((f) => /\.xlsm$/i.test(f));
      if (files.length === 0) {
        return res.json({ uploaded: false });
      }
      const fileName = files[0];
      const stat = fs.statSync(path.join(TEMPLATE_DIR, fileName));
      res.json({
        uploaded: true,
        fileName,
        fileSize: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to check template" });
    }
  });

  // POST — upload an XLSM template
  app.post("/api/admin/proposal/upload-template", requireAdmin, templateUpload.single("template"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const originalName = req.file.originalname;
      if (!originalName.toLowerCase().endsWith(".xlsm")) {
        return res.status(400).json({ message: "Only .xlsm files are accepted" });
      }

      // Clear any existing templates
      const existing = fs.readdirSync(TEMPLATE_DIR).filter((f) => /\.xlsm$/i.test(f));
      for (const f of existing) {
        fs.unlinkSync(path.join(TEMPLATE_DIR, f));
      }

      // Save the new template
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const destPath = path.join(TEMPLATE_DIR, safeName);
      fs.writeFileSync(destPath, req.file.buffer);

      // Validate with SheetJS (preserves VBA/macros)
      const workbook = XLSX.read(req.file.buffer, { type: "buffer", bookVBA: true });
      const sheetNames = workbook.SheetNames;

      res.json({
        message: "Template uploaded successfully",
        fileName: safeName,
        fileSize: req.file.size,
        sheetNames,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  // DELETE — remove the uploaded template
  app.delete("/api/admin/proposal/template", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const files = fs.readdirSync(TEMPLATE_DIR).filter((f) => /\.xlsm$/i.test(f));
      for (const f of files) {
        fs.unlinkSync(path.join(TEMPLATE_DIR, f));
      }
      res.json({ message: "Template removed" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Delete failed" });
    }
  });

  // POST — generate proposal: inject census → run LibreOffice → PDF → store
  app.post("/api/admin/proposal/generate/:groupId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId as string;
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Group must be approved (or census_uploaded during transition) before proposal generation.
      if (group.status !== "approved" && group.status !== "census_uploaded" && group.status !== "proposal_sent") {
        return res.status(400).json({
          message: `Group must be approved before generating a proposal (current status: ${group.status}).`,
        });
      }

      const census = await storage.getCensusByGroupId(groupId);
      if (census.length === 0) {
        return res.status(400).json({ message: "No census entries found for this group" });
      }

      // Parse optional request body overrides.
      const body = (req.body || {}) as {
        effectiveDate?: string;
        ratingArea?: string;
        admin?: string;
      };
      const effectiveDate =
        body.effectiveDate ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const administrator = (body.admin as Admin | undefined) || "EBPA";

      // Convert stored census rows into the engine's CensusMember shape.
      const members: CensusMember[] = censusEntriesToMembers(census);
      const ratingArea: RatingArea =
        body.ratingArea && body.ratingArea !== "auto"
          ? (body.ratingArea as RatingArea)
          : inferRatingAreaFromCensus(members);

      // Run the deterministic pricing engine (in-process) to get all the
      // metadata fields (age factors, area factor, trend, tier multipliers).
      const pricing = priceGroup({
        census: members,
        effectiveDate,
        ratingArea,
        admin: administrator,
        group: group.companyName,
      });

      // Rate calculation is fully in-process via priceGroup() above.
      // (Historical xlsm-recalc fallback removed 2026-04-21 for reliability.)


      // Render the proposal PDF with pdfkit (native, no LibreOffice dependency).
      const { renderProposalPdf } = await import("./proposal-pdf");
      const { pdfBuffer, fileName } = await renderProposalPdf(group, pricing, members.length);

      // Persist to proposals table. pdfBase64 is used by the PDF download
      // endpoints so the file survives Railway redeploys (ephemeral fs).
      const proposal = await storage.createProposal({
        groupId,
        pdfPath: `proposals/${fileName}`,
        pdfBase64: pdfBuffer.toString("base64"),
        fileName,
        ratesData: pricing,
      });

      // Advance group status (safe to call even if already proposal_sent).
      const curStatus: string = group.status;
      if (curStatus !== "proposal_sent" && curStatus !== "proposal_accepted" && curStatus !== "client") {
        await storage.updateGroup(groupId, { status: "proposal_sent" });
      }

      res.json({
        message: "Proposal generated successfully",
        proposalId: proposal.id,
        fileName,
        planCount: Object.keys(pricing.plan_rates).length,
        ratingArea: pricing.rating_area,
        effectiveDate: pricing.effective_date,
      });
    } catch (err: any) {
      log(`Proposal generation error: ${err.message}`, "proposal");
      res.status(500).json({ message: err.message || "Failed to generate proposal" });
    }
  });

  // GET — download proposal PDF (admin)
  app.get("/api/admin/proposal/:proposalId/pdf", requireAdmin, async (req: Request, res: Response) => {
    try {
      const proposal = await storage.getProposal(req.params.proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${proposal.fileName}"`);

      // Try filesystem first, fall back to DB-stored base64
      if (fs.existsSync(proposal.pdfPath)) {
        fs.createReadStream(proposal.pdfPath).pipe(res);
      } else if (proposal.pdfBase64) {
        const buffer = Buffer.from(proposal.pdfBase64, "base64");
        res.setHeader("Content-Length", buffer.length);
        res.end(buffer);
      } else {
        return res.status(404).json({ message: "PDF file not found — please regenerate this proposal" });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to serve PDF" });
    }
  });

  // GET — list proposals for a group (admin)
  app.get("/api/admin/proposal/group/:groupId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const proposals = await storage.getProposalsByGroupId(req.params.groupId);
      res.json(proposals);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch proposals" });
    }
  });

  // GET — view proposal PDF (client — for their own group)
  app.get("/api/proposals/:proposalId/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const proposal = await storage.getProposal(req.params.proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Verify the user owns this group
      const group = await storage.getGroup(proposal.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      if (group.userId !== req.session.userId && req.session.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${proposal.fileName}"`);

      if (fs.existsSync(proposal.pdfPath)) {
        fs.createReadStream(proposal.pdfPath).pipe(res);
      } else if (proposal.pdfBase64) {
        const buffer = Buffer.from(proposal.pdfBase64, "base64");
        res.setHeader("Content-Length", buffer.length);
        res.end(buffer);
      } else {
        return res.status(404).json({ message: "PDF file not found" });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to serve PDF" });
    }
  });

  // GET — list proposals for a group (client — for their own groups)
  app.get("/api/groups/:groupId/proposals", requireAuth, async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroup(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      if (group.userId !== req.session.userId && req.session.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const proposals = await storage.getProposalsByGroupId(req.params.groupId);
      res.json(proposals);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch proposals" });
    }
  });

  // GET — list sheet names in the uploaded template
  app.get("/api/admin/proposal/sheets", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const templates = fs.readdirSync(TEMPLATE_DIR).filter((f) => /\.xlsm$/i.test(f));
      if (templates.length === 0) {
        return res.json({ sheets: [] });
      }
      const fileBuffer = fs.readFileSync(path.join(TEMPLATE_DIR, templates[0]));
      const workbook = XLSX.read(fileBuffer, { type: "buffer", bookVBA: true });
      res.json({ sheets: workbook.SheetNames });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to read sheets" });
    }
  });


  // ──────────────────────────────────────────────────────────────────────
  // Rate engine endpoints — price a census through the actuary's rater math.
  // Factor tables live in server/factor-tables.json, synced from
  // Kennion Actuarial Rater.xlsm via scripts/sync-rater.py.
  // ──────────────────────────────────────────────────────────────────────

  // Public factor table metadata (no auth — so the UI can show "rater v1.0
  // synced at 2026-04-21" without revealing factor values).
  app.get("/api/rate/tables", (_req: Request, res: Response) => {
    try {
      const t = loadFactorTables();
      res.json({
        version: t.version,
        source_file: t.source_file,
        source_sha256: t.source_sha256,
        synced_at: t.synced_at,
        n_plans: Object.keys(t.plan_base_pmpm_6to1).length,
        n_age_factors: Object.keys(t.age_factors).length,
        area_factors: t.area_factors,
        tier_factors: t.tier_factors_default,
        trend_rate: t.trend_rate,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Factor tables not loaded" });
    }
  });

  // Reload factor tables from disk — admin only. Use after replacing
  // server/factor-tables.json (e.g. after the actuary updates the xlsm).
  app.post("/api/rate/reload", requireAdmin, (_req: Request, res: Response) => {
    try {
      const t = reloadFactorTables();
      res.json({ ok: true, version: t.version, sha256: t.source_sha256, synced_at: t.synced_at });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Reload failed" });
    }
  });

  // Price an arbitrary census (JSON body) — for ad-hoc quoting or tests.
  app.post("/api/rate/price", requireAuth, async (req: Request, res: Response) => {
    try {
      const {
        census,
        effective_date,
        rating_area,
        admin,
        group,
      } = req.body as {
        census: CensusMember[];
        effective_date: string;
        rating_area?: RatingArea;
        admin?: Admin;
        group?: string;
      };
      if (!Array.isArray(census) || census.length === 0) {
        return res.status(400).json({ message: "census is required" });
      }
      if (!effective_date) {
        return res.status(400).json({ message: "effective_date is required" });
      }
      const result = priceGroup({
        census,
        effectiveDate: effective_date,
        ratingArea: rating_area,
        admin,
        group,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Pricing failed" });
    }
  });

  // Price a stored group's census (looks up group + census_entries by groupId).
  // This is the endpoint the proposal flow should call.
  app.post("/api/rate/price-group/:groupId", requireAuth, async (req: Request, res: Response) => {
    try {
      const groupId = req.params.groupId as string;
      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: "Group not found" });

      const rows = await storage.getCensusByGroupId(groupId);
      if (rows.length === 0) {
        return res.status(400).json({ message: "No census entries for this group" });
      }

      const members = censusEntriesToMembers(rows);
      const {
        effective_date = new Date().toISOString().slice(0, 10),
        rating_area,
        admin,
      } = (req.body || {}) as {
        effective_date?: string;
        rating_area?: RatingArea;
        admin?: Admin;
      };

      const area: RatingArea = rating_area && rating_area !== "auto"
        ? rating_area
        : inferRatingAreaFromCensus(members);

      const result = priceGroup({
        census: members,
        effectiveDate: effective_date,
        ratingArea: area,
        admin: admin ?? "EBPA",
        group: group.companyName,
      });
      res.json(result);
    } catch (err: any) {
      log(`Rate pricing error: ${err.message}`, "rate");
      res.status(500).json({ message: err.message || "Pricing failed" });
    }
  });

  return httpServer;
}
