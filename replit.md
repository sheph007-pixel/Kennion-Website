# Kennion Benefit Advisors

## Overview
A professional employee benefits advisory platform for small to mid-sized businesses. Combines brokerage expertise with AI-powered risk analytics. Clients register, upload employee census data (CSV), and receive qualification scores. Admin console for managing groups as a simple CRM.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Email**: Resend (via Replit connector) for transactional emails
- **Routing**: wouter for client-side routing
- **State**: TanStack React Query for data fetching

## Key Features
- Public landing page (professional corporate look, blue theme, Kennion logo)
- Magic link authentication (passwordless sign-in via email)
- Client dashboard with CSV census upload and status tracking
- Admin console (CRM) for managing groups, scores, statuses
- Role-based access (client vs admin)

## Data Models
- **users**: fullName, email, password (nullable, for admin), companyName, verified, magicToken, magicTokenExpiry, role (client|admin)
- **groups**: companyName, contact info, employee/dependent counts, status, score, riskTier, adminNotes
- **census_entries**: firstName, lastName, dateOfBirth, gender, zipCode, relationship

## Auth Flow
- **Clients**: Enter email → receive magic link via Resend email → click link → signed in (no password needed)
- **New users**: If email not found, prompted for name/company → magic link sent → account created on verification
- **Admin**: Password-based login (admin@kennion.com / admin123) via toggle on login page
- Sessions stored in PostgreSQL via connect-pg-simple
- Magic tokens are 64-char hex strings, expire in 15 minutes, single-use

## Routes
- `/` - Landing page
- `/login` - Sign-in page (magic link + admin password toggle)
- `/register` - Redirects to /login
- `/auth/verify` - Magic link verification (auto-processes token from URL)
- `/dashboard` - Client portal (CSV upload, status tracking)
- `/admin` - Admin console (group management, CRM)

## API Endpoints
- `POST /api/auth/magic-link` - Request magic link (email, optional fullName/companyName)
- `POST /api/auth/verify-magic-link` - Verify magic link token
- `POST /api/auth/login` - Admin password login
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout
- `GET /api/groups/template` - Download CSV template
- `POST /api/groups/upload` - Upload census CSV
- `GET /api/groups` - Get user's groups
- `GET /api/admin/groups` - All groups (admin)
- `GET /api/admin/groups/:id/census` - Group census data (admin)
- `PATCH /api/admin/groups/:id` - Update group status (admin)

## CSV Format
Required columns: First Name, Last Name, Date of Birth, Gender, Zip Code
Optional: Relationship (defaults to "employee"; can be "spouse", "dependent")

## Status Flow
pending_review → under_review → analyzing → qualified/not_qualified → rates_available

## Email Service
- Uses Resend via Replit connector integration
- server/email.ts handles credential fetching and email sending
- Magic link emails are HTML formatted with Kennion branding
