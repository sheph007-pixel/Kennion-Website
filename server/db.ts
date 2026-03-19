import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL || "";

// Log connection target (without credentials) for debugging
try {
  const parsed = new URL(databaseUrl);
  console.log(`Database target: ${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`);
} catch {
  console.error("DATABASE_URL is not set or invalid");
}

// SSL is only needed for external connections. Railway internal connections
// (same project) don't support SSL and will ECONNRESET if SSL is attempted.
// Use DATABASE_SSL=true to explicitly enable SSL for external databases.
const useSSL = process.env.DATABASE_SSL === "true";

export const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
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
      console.log("Database connection verified successfully");
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
