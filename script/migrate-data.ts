/**
 * One-time migration script to copy data from old Railway Postgres to new one.
 * Runs on Railway deploy where both databases are network-accessible.
 * Safe to re-run: uses ON CONFLICT DO NOTHING to skip existing rows.
 *
 * Remove this script and the migrate npm script after successful migration.
 */

import pg from "pg";

const OLD_DATABASE_URL = "postgresql://postgres:UHttzexcgHcuhvsIdiESHZCWwxckssfV@switchback.proxy.rlwy.net:59872/railway";
const NEW_DATABASE_URL = process.env.DATABASE_URL;

if (!NEW_DATABASE_URL) {
  console.error("DATABASE_URL not set, skipping migration");
  process.exit(0);
}

async function migrate() {
  console.log("Starting data migration from old DB to new DB...");

  const oldPool = new pg.Pool({ connectionString: OLD_DATABASE_URL });
  const newPool = new pg.Pool({ connectionString: NEW_DATABASE_URL });

  try {
    // Test connections
    await oldPool.query("SELECT 1");
    console.log("Connected to old database");
    await newPool.query("SELECT 1");
    console.log("Connected to new database");

    // Migrate users
    const { rows: users } = await oldPool.query("SELECT * FROM users");
    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      await newPool.query(
        `INSERT INTO users (id, full_name, email, password, company_name, phone, verified, magic_token, magic_token_expiry, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.full_name, user.email, user.password, user.company_name, user.phone, user.verified, user.magic_token, user.magic_token_expiry, user.role, user.created_at]
      );
    }
    console.log(`Migrated ${users.length} users`);

    // Migrate groups
    const { rows: groups } = await oldPool.query("SELECT * FROM groups");
    console.log(`Found ${groups.length} groups to migrate`);

    for (const group of groups) {
      await newPool.query(
        `INSERT INTO groups (id, user_id, company_name, contact_name, contact_email, employee_count, dependent_count, spouse_count, total_lives, status, score, risk_score, risk_tier, average_age, male_count, female_count, group_characteristics, admin_notes, submitted_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         ON CONFLICT (id) DO NOTHING`,
        [group.id, group.user_id, group.company_name, group.contact_name, group.contact_email, group.employee_count, group.dependent_count, group.spouse_count, group.total_lives, group.status, group.score, group.risk_score, group.risk_tier, group.average_age, group.male_count, group.female_count, group.group_characteristics ? JSON.stringify(group.group_characteristics) : null, group.admin_notes, group.submitted_at, group.updated_at]
      );
    }
    console.log(`Migrated ${groups.length} groups`);

    // Migrate census entries
    const { rows: censusEntries } = await oldPool.query("SELECT * FROM census_entries");
    console.log(`Found ${censusEntries.length} census entries to migrate`);

    for (const entry of censusEntries) {
      await newPool.query(
        `INSERT INTO census_entries (id, group_id, first_name, last_name, date_of_birth, gender, zip_code, relationship)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [entry.id, entry.group_id, entry.first_name, entry.last_name, entry.date_of_birth, entry.gender, entry.zip_code, entry.relationship]
      );
    }
    console.log(`Migrated ${censusEntries.length} census entries`);

    // Also migrate session table if it exists
    try {
      const { rows: sessions } = await oldPool.query("SELECT * FROM session");
      if (sessions.length > 0) {
        console.log(`Found ${sessions.length} sessions (skipping - users will re-login)`);
      }
    } catch {
      // session table may not exist, that's fine
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    // Don't exit with error code - we don't want to block deployment
    // The app will still work, just without old data
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

migrate();
