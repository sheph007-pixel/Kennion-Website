import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL || "";

// Railway internal connections use sslmode=disable in the URL
// Only enable SSL if the URL doesn't explicitly disable it
function getSslConfig(): boolean | { rejectUnauthorized: boolean } {
  if (!isProduction) return false;
  if (databaseUrl.includes("sslmode=disable")) return false;
  if (databaseUrl.includes(".railway.internal")) return false;
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: getSslConfig(),
  max: 5,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Database pool error:", err.message);
});

// Test database connectivity on startup with retries
export async function testConnection(retries = 5, delay = 2000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      console.log("Database connection verified");
      return true;
    } catch (err: any) {
      console.error(`Database connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }
  }
  console.error("All database connection attempts failed");
  return false;
}

export const db = drizzle(pool, { schema });
