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
  state: text("state"),
  zipCode: text("zip_code"),
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
  contactPhone: text("contact_phone"),
  employeeCount: integer("employee_count").default(0),
  childrenCount: integer("dependent_count").default(0),
  spouseCount: integer("spouse_count").default(0),
  totalLives: integer("total_lives").default(0),
  status: text("status").default("census_uploaded").notNull(),
  score: integer("score"),
  riskScore: real("risk_score"),
  riskTier: text("risk_tier"),
  averageAge: real("average_age"),
  maleCount: integer("male_count").default(0),
  femaleCount: integer("female_count").default(0),
  groupCharacteristics: jsonb("group_characteristics"),
  adminNotes: text("admin_notes"),
  // Two-letter state (e.g. "AL") + ZIP that identifies this group's
  // primary business address. Used as the authoritative input to the
  // rate engine's rating-area inference, overriding per-employee
  // census zips.
  state: text("state"),
  zipCode: text("zip_code"),
  // When true, the owner can no longer edit or replace the census —
  // the proposal is frozen as-is. Only admins can toggle this.
  locked: boolean("locked").default(false).notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const censusEntries = pgTable("census_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  zipCode: text("zip_code").notNull(),
  relationship: text("relationship").default("EE").notNull(),
});

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  pdfPath: text("pdf_path").notNull(),
  pdfBase64: text("pdf_base64"),
  fileName: text("file_name").notNull(),
  ratesData: jsonb("rates_data"),
  status: text("status").default("generated").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Every turn of a dashboard chat (user prompt or assistant reply) is
// appended here after the stream completes. Grouped by conversationId
// (generated client-side per widget mount) so admins can replay a full
// exchange. No PHI is ever stored — the chat endpoint constrains what
// the assistant sees; this table only captures what was actually said.
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "set null" }),
  role: text("role").notNull(),          // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin-editable behaviour overrides appended to the chat assistant's
// system prompt. Enabled rules are concatenated into a dedicated
// "=== ADMIN RULES ===" section so admins can nudge answers, add new
// facts, or correct mistakes without a code deploy.
export const chatRules = pgTable("chat_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  content: text("content").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  phone: z.string().optional(),
});

// Personal email domains blocklist
const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
  'ymail.com', 'rocketmail.com', 'protonmail.com', 'mail.com',
  'gmx.com', 'zoho.com', 'inbox.com', 'hey.com'
];

// Validate US phone number (accepts multiple formats)
function isValidUSPhone(phone: string): boolean {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Accept 10 digits (e.g., 5551234567)
  // Or 11 digits starting with 1 (e.g., 15551234567)
  if (digits.length === 10) {
    return true;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return true;
  }

  return false;
}

// Ordered list of US state codes + names. The 2-letter code is what's
// stored; the name is for UI display (dropdowns, labels). Client and
// server share this list so validation and the picker can't drift.
export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const US_STATE_CODES = new Set(US_STATES.map((s) => s.code));

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required").refine(
    (email) => {
      const domain = email.split('@')[1]?.toLowerCase();
      return !BLOCKED_EMAIL_DOMAINS.includes(domain);
    },
    { message: "Please use your business email address (not Gmail, Yahoo, Hotmail, etc.)" }
  ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(1, "Phone number is required").refine(
    isValidUSPhone,
    { message: "Please enter a valid US phone number (10 digits)" }
  ),
  companyName: z.string().min(1, "Company name is required"),
  state: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .refine((s) => US_STATE_CODES.has(s), { message: "Enter a valid 2-letter state (e.g. AL)" }),
  zipCode: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => /^\d{5}(-\d{4})?$/.test(s), { message: "Enter a 5-digit ZIP (or ZIP+4)" }),
  accessCode: z.string().min(1, "Access code is required"),
});

// Required details when creating an additional group under an existing
// login. Reused by the server's pending-group-details session stash
// and by the confirm endpoint.
export const newGroupDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  state: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .refine((s) => US_STATE_CODES.has(s), { message: "Enter a valid 2-letter state" }),
  zipCode: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => /^\d{5}(-\d{4})?$/.test(s), { message: "Enter a 5-digit ZIP" }),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
  status: z.enum(["census_uploaded", "approved", "proposal_sent", "proposal_accepted", "client", "not_approved"]),
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
export type Proposal = typeof proposals.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatRule = typeof chatRules.$inferSelect;

export const chatRuleInputSchema = z.object({
  label: z.string().min(1, "Label is required").max(120),
  content: z.string().min(1, "Rule content is required").max(4000),
  enabled: z.boolean().default(true),
});
export type ChatRuleInput = z.infer<typeof chatRuleInputSchema>;
