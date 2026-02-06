# Kennion Benefit Advisors

## Overview
A professional employee benefits advisory platform for small to mid-sized businesses. Combines brokerage expertise with AI-powered risk analytics. Clients register, upload employee census data (CSV), and receive qualification scores. Admin console for managing groups as a simple CRM.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui components
- **Backend**: Express.js with session-based auth (bcryptjs for password hashing)
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing
- **State**: TanStack React Query for data fetching

## Key Features
- Public landing page (professional corporate look, blue theme)
- User registration with email verification (6-digit code)
- Client dashboard with CSV census upload and status tracking
- Admin console (CRM) for managing groups, scores, statuses
- Role-based access (client vs admin)

## Data Models
- **users**: fullName, email, password, companyName, verified, role (client|admin)
- **groups**: companyName, contact info, employee/dependent counts, status, score, riskTier, adminNotes
- **census_entries**: firstName, lastName, dateOfBirth, gender, zipCode, relationship

## Auth Flow
- Register → verification code sent (displayed in server logs for development) → verify → login
- Sessions stored in PostgreSQL via connect-pg-simple
- Admin account: admin@kennion.com / admin123

## Routes
- `/` - Landing page
- `/register` - Registration with email verification
- `/login` - Login page
- `/dashboard` - Client portal (CSV upload, status tracking)
- `/admin` - Admin console (group management, CRM)

## API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify` - Verify email with code
- `POST /api/auth/login` - Login
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
