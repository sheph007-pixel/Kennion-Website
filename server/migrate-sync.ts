import type { Express, Request, Response } from "express";
import { pool } from "./db";

// Temporary, admin-only data export used by the one-time migration of
// this system to its new home. Streams table rows as JSON in chunks.
// Remove this file and its registration in server/index.ts once the
// migration is confirmed complete.

const TABLES = ["users", "groups", "census_entries", "proposals", "risk_screens"];

export function registerMigrateExport(app: Express) {
  app.get("/api/admin/migrate-export", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ message: "Authentication required" });
      const u = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
      if (u.rows[0]?.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const table = String(req.query.table ?? "");
      if (!TABLES.includes(table)) return res.status(400).json({ message: "Unknown table" });
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "100"), 10) || 100, 1), 500);
      const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

      const r = await pool.query(`SELECT * FROM ${table} ORDER BY id LIMIT ${limit} OFFSET ${offset}`);
      // res.send, not res.json: keeps row data out of the response logger.
      res
        .type("application/json")
        .send(JSON.stringify({ table, offset, count: r.rows.length, rows: r.rows }));
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "export failed" });
    }
  });
}
