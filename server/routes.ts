import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import multer from "multer";
import Papa from "papaparse";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import {
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  loginSchema,
  registerSchema,
  updateGroupStatusSchema,
} from "@shared/schema";
import ConnectPgSimple from "connect-pg-simple";
import { log } from "./index";
import { sendMagicLinkEmail } from "./email";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

declare module "express-session" {
  interface SessionData {
    userId?: string;
    pendingCensus?: {
      headers: string[];
      rows: any[];
      fileName: string;
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
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    return `https://${process.env.REPLIT_DEPLOYMENT_URL}`;
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
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return `${req.protocol}://${host}`;
}

const REQUIRED_FIELDS = [
  { key: "first_name", label: "First Name", aliases: ["first name", "firstname", "first", "fname", "given name", "given_name"] },
  { key: "last_name", label: "Last Name", aliases: ["last name", "lastname", "last", "lname", "surname", "family name", "family_name"] },
  { key: "type", label: "Type (EE/SP/DEP)", aliases: ["type", "relationship", "relation", "member type", "member_type", "coverage type", "coverage_type", "ee/sp/dep", "enrollment type", "enrollment_type", "subscriber type", "subscriber_type", "dependent type", "dependent_type"] },
  { key: "date_of_birth", label: "Date of Birth", aliases: ["date of birth", "dob", "dateofbirth", "birth date", "birthdate", "birth_date", "birthday", "date_of_birth", "d.o.b.", "d.o.b"] },
  { key: "gender", label: "Gender", aliases: ["gender", "sex", "m/f", "male/female"] },
  { key: "zip_code", label: "Zip Code", aliases: ["zip code", "zipcode", "zip", "zip_code", "postal code", "postal_code", "postalcode"] },
];

function smartMatchHeaders(csvHeaders: string[]): Record<string, string | null> {
  const mappings: Record<string, string | null> = {};

  for (const field of REQUIRED_FIELDS) {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const csvHeader of csvHeaders) {
      const normalized = csvHeader.trim().toLowerCase().replace(/[_\-\.]/g, " ").replace(/\s+/g, " ");

      if (normalized === field.key.replace(/_/g, " ")) {
        bestMatch = csvHeader;
        bestScore = 100;
        break;
      }

      for (const alias of field.aliases) {
        if (normalized === alias) {
          bestMatch = csvHeader;
          bestScore = 100;
          break;
        }
        if (normalized.includes(alias) || alias.includes(normalized)) {
          const score = Math.max(normalized.length, alias.length) > 0
            ? (Math.min(normalized.length, alias.length) / Math.max(normalized.length, alias.length)) * 80
            : 0;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = csvHeader;
          }
        }
      }
      if (bestScore === 100) break;
    }

    mappings[field.key] = bestScore >= 50 ? bestMatch : null;
  }

  return mappings;
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
      }
    }

    const g = entry.gender.toLowerCase();
    if (g === "male" || g === "m") maleCount++;
    else if (g === "female" || g === "f") femaleCount++;
  }

  const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 35;
  const avgEeAge = eeAges.length > 0 ? eeAges.reduce((a, b) => a + b, 0) / eeAges.length : avgAge;

  let riskScore = 1.0;

  if (avgEeAge < 30) riskScore -= 0.15;
  else if (avgEeAge < 35) riskScore -= 0.08;
  else if (avgEeAge < 40) riskScore += 0.0;
  else if (avgEeAge < 45) riskScore += 0.08;
  else if (avgEeAge < 50) riskScore += 0.15;
  else if (avgEeAge < 55) riskScore += 0.22;
  else riskScore += 0.30;

  const femaleRatio = entries.length > 0 ? femaleCount / entries.length : 0.5;
  if (femaleRatio > 0.65) riskScore += 0.05;
  else if (femaleRatio < 0.35) riskScore -= 0.03;

  const eeCount = entries.filter(e => {
    const r = e.relationship.toUpperCase();
    return r === "EE" || r === "EMPLOYEE";
  }).length;
  if (eeCount < 10) riskScore += 0.08;
  else if (eeCount < 25) riskScore += 0.03;
  else if (eeCount > 100) riskScore -= 0.05;

  const olderEes = eeAges.filter(a => a > 55).length;
  const olderRatio = eeAges.length > 0 ? olderEes / eeAges.length : 0;
  if (olderRatio > 0.3) riskScore += 0.10;
  else if (olderRatio > 0.15) riskScore += 0.05;

  riskScore = Math.max(0.40, Math.min(2.0, Math.round(riskScore * 100) / 100));

  let riskTier = "standard";
  if (riskScore < 0.85) riskTier = "preferred";
  else if (riskScore > 1.15) riskTier = "high";

  const ageRanges = {
    "18-29": ages.filter(a => a >= 18 && a < 30).length,
    "30-39": ages.filter(a => a >= 30 && a < 40).length,
    "40-49": ages.filter(a => a >= 40 && a < 50).length,
    "50-59": ages.filter(a => a >= 50 && a < 60).length,
    "60+": ages.filter(a => a >= 60).length,
    "Under 18": ages.filter(a => a < 18).length,
  };

  const characteristics = {
    ageDistribution: ageRanges,
    averageEmployeeAge: Math.round(avgEeAge * 10) / 10,
    dependencyRatio: eeCount > 0 ? Math.round(((entries.length - eeCount) / eeCount) * 100) / 100 : 0,
    groupSizeCategory: eeCount < 10 ? "Micro" : eeCount < 25 ? "Small" : eeCount < 50 ? "Mid-Size" : eeCount < 100 ? "Large" : "Enterprise",
    factors: [] as string[],
  };

  if (avgEeAge < 35) characteristics.factors.push("Young workforce (favorable)");
  if (avgEeAge > 50) characteristics.factors.push("Mature workforce (higher utilization expected)");
  if (eeCount >= 50) characteristics.factors.push("Large group size (favorable for risk pooling)");
  if (eeCount < 10) characteristics.factors.push("Small group (limited risk pooling)");
  if (olderRatio > 0.3) characteristics.factors.push("High concentration of members 55+");
  if (characteristics.dependencyRatio > 1.5) characteristics.factors.push("High dependency ratio");
  if (femaleRatio > 0.65) characteristics.factors.push("Female-dominant workforce");

  const qualScore = Math.round(Math.max(0, Math.min(100, (2.0 - riskScore) / 1.6 * 100)));

  return {
    riskScore,
    riskTier,
    averageAge: Math.round(avgAge * 10) / 10,
    maleCount,
    femaleCount,
    characteristics: { ...characteristics, qualificationScore: qualScore },
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = ConnectPgSimple(session);

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "kennion-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      },
    })
  );

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
      const fullName = `${data.firstName} ${data.lastName}`;

      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
      }

      const token = generateMagicToken();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      const user = await storage.createUser({
        fullName,
        email: data.email,
        companyName: data.companyName,
        phone: data.phone,
        password: null,
        magicToken: token,
        magicTokenExpiry: expiry,
      });

      const baseUrl = getBaseUrl(req);
      const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

      await sendMagicLinkEmail(data.email, magicLinkUrl, fullName);

      res.json({ message: "Sign-in link sent to your email", email: data.email });
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
      res.json({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
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

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/groups/template", (_req: Request, res: Response) => {
    const csv = "First Name,Last Name,Type,Date of Birth,Gender,Zip Code\nJohn,Smith,EE,1985-03-15,Male,30301\nJane,Smith,SP,1987-08-22,Female,30301\nTommy,Smith,DEP,2015-01-10,Male,30301\nSarah,Johnson,EE,1990-06-12,Female,30301\nMike,Williams,EE,1978-11-03,Male,30302\n";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=census_template.csv");
    res.send(csv);
  });

  app.get("/api/groups/sample", (_req: Request, res: Response) => {
    const sampleData = [
      { "First Name": "John", "Last Name": "Smith", "Type": "EE", "Date of Birth": "1985-03-15", "Gender": "Male", "Zip Code": "30301" },
      { "First Name": "Jane", "Last Name": "Smith", "Type": "SP", "Date of Birth": "1987-08-22", "Gender": "Female", "Zip Code": "30301" },
      { "First Name": "Tommy", "Last Name": "Smith", "Type": "DEP", "Date of Birth": "2015-01-10", "Gender": "Male", "Zip Code": "30301" },
      { "First Name": "Sarah", "Last Name": "Johnson", "Type": "EE", "Date of Birth": "1990-06-12", "Gender": "Female", "Zip Code": "30301" },
      { "First Name": "Mike", "Last Name": "Williams", "Type": "EE", "Date of Birth": "1978-11-03", "Gender": "Male", "Zip Code": "30302" },
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
      const suggestedMappings = smartMatchHeaders(headers);

      const previewRows = rows.slice(0, 5).map(row => {
        const preview: Record<string, string> = {};
        for (const h of headers) {
          preview[h] = String(row[h] || "").substring(0, 50);
        }
        return preview;
      });

      req.session.pendingCensus = {
        headers,
        rows,
        fileName: req.file.originalname || "census.csv",
      };

      res.json({
        headers,
        totalRows: rows.length,
        suggestedMappings,
        previewRows,
        requiredFields: REQUIRED_FIELDS.map(f => ({ key: f.key, label: f.label })),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Parse failed" });
    }
  });

  app.post("/api/groups/confirm", requireAuth, async (req: Request, res: Response) => {
    try {
      const { mappings } = req.body;

      if (!mappings) {
        return res.status(400).json({ message: "Column mappings are required" });
      }

      const missingFields = REQUIRED_FIELDS.filter(f => !mappings[f.key]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Missing mappings for: ${missingFields.map(f => f.label).join(", ")}`,
        });
      }

      const pendingCensus = req.session.pendingCensus;
      if (!pendingCensus || !pendingCensus.rows || pendingCensus.rows.length === 0) {
        return res.status(400).json({ message: "No pending census data. Please upload a file first." });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const entries = pendingCensus.rows.map((row: any) => {
        const rel = (String(row[mappings.type] || "EE")).trim().toUpperCase();
        let relationship = "EE";
        if (["SP", "SPOUSE"].includes(rel)) relationship = "SP";
        else if (["DEP", "DEPENDENT", "CHILD"].includes(rel)) relationship = "DEP";
        else if (["EE", "EMPLOYEE"].includes(rel)) relationship = "EE";

        return {
          firstName: String(row[mappings.first_name] || "").trim(),
          lastName: String(row[mappings.last_name] || "").trim(),
          dateOfBirth: String(row[mappings.date_of_birth] || "").trim(),
          gender: String(row[mappings.gender] || "").trim(),
          zipCode: String(row[mappings.zip_code] || "").trim(),
          relationship,
        };
      });

      const invalid = entries.filter(
        (e) => !e.firstName || !e.lastName || !e.dateOfBirth || !e.gender || !e.zipCode
      );
      if (invalid.length > 0) {
        return res.status(400).json({
          message: `${invalid.length} row(s) have missing required fields. Please ensure all rows have First Name, Last Name, DOB, Gender, and Zip Code.`,
        });
      }

      const employeeCount = entries.filter(e => e.relationship === "EE").length;
      const spouseCount = entries.filter(e => e.relationship === "SP").length;
      const dependentCount = entries.filter(e => e.relationship === "DEP" || e.relationship === "SP").length;

      const analysis = analyzeGroupRisk(entries);

      const group = await storage.createGroup({
        userId: user.id,
        companyName: user.companyName || "Unnamed Company",
        contactName: user.fullName,
        contactEmail: user.email,
        employeeCount,
        dependentCount,
        spouseCount,
        totalLives: entries.length,
      });

      await storage.updateGroup(group.id, {
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        groupCharacteristics: analysis.characteristics,
        score: analysis.characteristics.qualificationScore,
        status: "analyzing",
      });

      await storage.createCensusEntries(
        entries.map((e) => ({
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
        else if (["DEP", "DEPENDENT", "CHILD"].includes(rel)) relationship = "DEP";

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
      const dependentCount = entries.filter(e => e.relationship === "DEP" || e.relationship === "SP").length;

      const analysis = analyzeGroupRisk(entries);

      const group = await storage.createGroup({
        userId: user.id,
        companyName: user.companyName || "Unnamed Company",
        contactName: user.fullName,
        contactEmail: user.email,
        employeeCount,
        dependentCount,
        spouseCount,
        totalLives: entries.length,
      });

      await storage.updateGroup(group.id, {
        riskScore: analysis.riskScore,
        riskTier: analysis.riskTier,
        averageAge: analysis.averageAge,
        maleCount: analysis.maleCount,
        femaleCount: analysis.femaleCount,
        groupCharacteristics: analysis.characteristics,
        score: analysis.characteristics.qualificationScore,
        status: "analyzing",
      });

      await storage.createCensusEntries(
        entries.map((e) => ({
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
    const userGroups = await storage.getGroupsByUserId(req.session.userId!);
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

  return httpServer;
}
