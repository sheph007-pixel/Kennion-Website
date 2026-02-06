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
  updateGroupStatusSchema,
} from "@shared/schema";
import ConnectPgSimple from "connect-pg-simple";
import { log } from "./index";
import { sendMagicLinkEmail } from "./email";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

declare module "express-session" {
  interface SessionData {
    userId?: string;
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
    const csv = "First Name,Last Name,Date of Birth,Gender,Zip Code,Relationship\nJohn,Smith,1985-03-15,Male,30301,Employee\nJane,Smith,1987-08-22,Female,30301,Spouse\nTommy,Smith,2015-01-10,Male,30301,Dependent\n";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=census_template.csv");
    res.send(csv);
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

      const entries = rows.map((row: any) => ({
        firstName: (row.first_name || "").trim(),
        lastName: (row.last_name || "").trim(),
        dateOfBirth: (row.date_of_birth || "").trim(),
        gender: (row.gender || "").trim().toLowerCase(),
        zipCode: (row.zip_code || "").trim(),
        relationship: (row.relationship || "employee").trim().toLowerCase(),
      }));

      const invalid = entries.filter(
        (e) => !e.firstName || !e.lastName || !e.dateOfBirth || !e.gender || !e.zipCode
      );
      if (invalid.length > 0) {
        return res.status(400).json({
          message: `${invalid.length} row(s) have missing required fields. Please ensure all rows have First Name, Last Name, DOB, Gender, and Zip Code.`,
        });
      }

      const employeeCount = entries.filter((e) => e.relationship === "employee").length;
      const dependentCount = entries.filter((e) => e.relationship !== "employee").length;

      const group = await storage.createGroup({
        userId: user.id,
        companyName: user.companyName || "Unnamed Company",
        contactName: user.fullName,
        contactEmail: user.email,
        employeeCount,
        dependentCount,
        totalLives: entries.length,
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

      res.json({
        message: "Census uploaded successfully",
        group: {
          id: group.id,
          employeeCount,
          dependentCount,
          totalLives: entries.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  app.get("/api/groups", requireAuth, async (req: Request, res: Response) => {
    const userGroups = await storage.getGroupsByUserId(req.session.userId!);
    res.json(userGroups);
  });

  app.get("/api/admin/groups", requireAdmin, async (_req: Request, res: Response) => {
    const allGroups = await storage.getAllGroups();
    res.json(allGroups);
  });

  app.get("/api/admin/groups/:id/census", requireAdmin, async (req: Request, res: Response) => {
    const census = await storage.getCensusByGroupId(req.params.id);
    res.json(census);
  });

  app.patch("/api/admin/groups/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = updateGroupStatusSchema.parse(req.body);
      const updated = await storage.updateGroup(req.params.id, data);
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
