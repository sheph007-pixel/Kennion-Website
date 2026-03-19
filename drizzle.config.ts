import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = process.env.DATABASE_URL!;
const sslDisabled = databaseUrl.includes("sslmode=disable") || databaseUrl.includes(".railway.internal");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: (!sslDisabled && process.env.NODE_ENV === "production") ? "require" : false,
  },
});
