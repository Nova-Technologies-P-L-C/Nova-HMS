# Nova HMS

A hospital management system built for Ethiopian hospitals — public and private.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Query
- **Backend**: Express + tRPC v11
- **Database**: SQLite via Prisma + libsql
- **Auth**: better-auth (email/password, session cookies)
- **Monorepo**: Turborepo + npm workspaces

## Roles

Hospital Admin · Receptionist · Doctor · Nurse · Lab Technician · Pharmacist · Billing Officer · Referral Coordinator · Ward Manager · Nova Admin

## Quick start

```bash
# Install dependencies
npm install

# Start backend (port 3000)
npm run dev:server

# Start frontend (port 3001)
npm run dev:web
```

Open `http://localhost:3001/nova`

## Demo accounts

All use workspace `dmrh` and password `password123`:

| Role | Email |
|------|-------|
| Hospital Admin | admin@dmrh.gov.et |
| Doctor | tigist@dmrh.gov.et |
| Receptionist | girma@dmrh.gov.et |
| Nurse | mekdes@dmrh.gov.et |
| Lab Technician | bereket@dmrh.gov.et |
| Pharmacist | selam@dmrh.gov.et |
| Billing Officer | hiwot@dmrh.gov.et |
| Referral Coordinator | solomon@dmrh.gov.et |

## Seed database

```bash
cd packages/db
DATABASE_URL="file:/path/to/local.db" npx tsx src/seed.ts
```

## Modules

- OPD Queue Management
- Patient Registration & EMR
- Nurse Triage & Vitals
- Doctor Consultation, Lab Orders, e-Prescription
- Lab Results with doctor notification
- Pharmacy Dispensing & Inventory
- Billing, CBHI Claims, Fee Waivers
- Referral Management (in/out)
- Ward / Bed Management
- Hospital Admin Dashboard & Audit Log
- Nova Admin (multi-tenant platform)
