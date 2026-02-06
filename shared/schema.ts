import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  companyName: text("company_name"),
  phone: text("phone"),
  verified: boolean("verified").default(false).notNull(),
  magicToken: text("magic_token"),
  magicTokenExpiry: timestamp("magic_token_expiry"),
  role: text("role").default("client").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  employeeCount: integer("employee_count").default(0),
  dependentCount: integer("dependent_count").default(0),
  spouseCount: integer("spouse_count").default(0),
  totalLives: integer("total_lives").default(0),
  status: text("status").default("pending_review").notNull(),
  score: integer("score"),
  riskScore: real("risk_score"),
  riskTier: text("risk_tier"),
  averageAge: real("average_age"),
  maleCount: integer("male_count").default(0),
  femaleCount: integer("female_count").default(0),
  groupCharacteristics: jsonb("group_characteristics"),
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const censusEntries = pgTable("census_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  zipCode: text("zip_code").notNull(),
  relationship: text("relationship").default("EE").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  verified: true,
  magicToken: true,
  magicTokenExpiry: true,
  role: true,
  createdAt: true,
});

export const magicLinkRequestSchema = z.object({
  email: z.string().email("Valid email required"),
  fullName: z.string().min(2, "Full name is required").optional(),
  companyName: z.string().optional(),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  status: true,
  score: true,
  riskScore: true,
  riskTier: true,
  averageAge: true,
  maleCount: true,
  femaleCount: true,
  groupCharacteristics: true,
  adminNotes: true,
  submittedAt: true,
  updatedAt: true,
});

export const insertCensusEntrySchema = createInsertSchema(censusEntries).omit({
  id: true,
});

export const updateGroupStatusSchema = z.object({
  status: z.enum(["pending_review", "under_review", "analyzing", "qualified", "not_qualified", "rates_available"]),
  score: z.number().min(0).max(100).optional(),
  riskScore: z.number().optional(),
  riskTier: z.enum(["preferred", "standard", "high"]).optional(),
  adminNotes: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type CensusEntry = typeof censusEntries.$inferSelect;
export type InsertCensusEntry = z.infer<typeof insertCensusEntrySchema>;
