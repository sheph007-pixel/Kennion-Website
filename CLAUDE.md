# Kennion Website - Claude Instructions

## Core Principle
**Do everything yourself. Never ask the user to do tasks manually.** Complete all work end-to-end including testing and verification. If something is blocked (e.g., network), find a workaround or alternative approach.

## Project Overview
- Full-stack web app deployed on Railway (www.kennion.com)
- **Database**: PostgreSQL via Drizzle ORM
- **Backend**: Express.js with PostgreSQL session store (connect-pg-simple)
- **Frontend**: React
- **Schema**: defined in `shared/schema.ts` (users, groups, census_entries)
- **DB connection**: `server/db.ts` using `DATABASE_URL` env var
- **Deployment**: Railway with `railway.toml` config
  - Build: `npm install && npm run build`
  - Deploy: `npm run db:push && npm run start`

## Database
- Drizzle ORM with PostgreSQL dialect
- Config: `drizzle.config.ts`
- Schema: `shared/schema.ts`
- Migrations output: `./migrations`
- Sessions stored in PostgreSQL via `connect-pg-simple`
- Seed creates default admin: `admin@kennion.com`

## Environment Variables
- `DATABASE_URL` (required) - PostgreSQL connection string
- `SESSION_SECRET` - Express session secret
- `RESEND_API_KEY` - Email service
- `OPENAI_API_KEY` - Required for AI-powered CSV cleaning and data standardization
- `PORT` - defaults to 5000
