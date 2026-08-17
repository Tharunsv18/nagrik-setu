# Nagrik Setu — Backend Setup Guide

> **Fresh clone → working local environment in under 10 minutes.**

---

## Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | bundled with Node |
| PostgreSQL | 16 | Via Docker **or** native install (see below) |

---

## Option A — PostgreSQL via Docker (recommended)

```powershell
# 1. Install Docker Desktop
winget install -e --id Docker.DockerDesktop --accept-package-agreements

# 2. Restart your terminal / open Docker Desktop and wait for it to start

# 3. From this directory (backend/), start the Postgres container
npm run db:up

# 4. Verify the container is healthy
docker ps  # should show nagrik-setu-postgres with "healthy" status
```

---

## Option B — PostgreSQL native (no Docker)

```powershell
# Install PostgreSQL 16 via winget
winget install -e --id PostgreSQL.PostgreSQL.16 --accept-package-agreements

# After install, PostgreSQL runs as a Windows service on port 5432.
# The default superuser is "postgres". Create the app role and DB:
psql -U postgres -c "CREATE USER nagrik WITH PASSWORD 'nagrik_password';"
psql -U postgres -c "CREATE DATABASE nagrik_setu OWNER nagrik;"
```

The `.env` `DATABASE_URL` already matches this credential set — no changes needed.

---

## Environment Setup

```powershell
# Copy the example env file (skip if .env already exists)
copy .env.example .env
```

The `.env` that ships with the project is pre-filled for local development:

```
DATABASE_URL=postgresql://nagrik:nagrik_password@localhost:5432/nagrik_setu?schema=public
PORT=4000
FRONTEND_ORIGIN=http://127.0.0.1:5173
```

---

## Email / SMTP Setup

### Option A — Ethereal (no config, dev only)

Leave all `SMTP_*` fields **empty** in `.env`. On first OTP request the server
auto-creates a free [Ethereal](https://ethereal.email/) test account and prints
a preview URL to the terminal:

```
[email.service] No SMTP_HOST set — using Ethereal test account
  User: abc123@ethereal.email
  Pass: xxxxxxx

[email.service] OTP email sent (Ethereal preview)
  To: user@example.com
  Code: 847291
  Preview: https://ethereal.email/message/...  ← open this to see the email
```

No real email is delivered. Perfect for local development.

### Option B — Gmail (real delivery)

1. Enable 2-Step Verification on your Google account
2. Generate an **App Password**: https://myaccount.google.com/apppasswords
3. Add to `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # 16-char app password
SMTP_FROM=you@gmail.com
```

### Option C — Mailtrap (staging sandbox)

Great for testing with a real SMTP transport without spamming real users.
Sign up at https://mailtrap.io → create an Inbox → copy SMTP credentials:

```
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=api
SMTP_PASS=your-mailtrap-token
SMTP_FROM=noreply@nagrikseva.gov.in
```

### Option D — Brevo / Sendinblue (free tier, production-ready)

Free tier: 300 emails/day. Sign up at https://www.brevo.com:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-login@email.com
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=noreply@nagrikseva.gov.in
```

---

## Install Dependencies

```powershell
npm install
```

---

## Run Prisma Migration

```powershell
# Apply all migrations (creates User and OtpRequest tables)
npx prisma migrate dev --name init
```

Expected output:
```
Applying migration `20260808_init`
Your database is now in sync with your schema.
Generated Prisma Client
```

---

## Verify the Database

```powershell
# Option 1 — Prisma Studio (browser UI)
npx prisma studio
# Opens http://localhost:5555 — you should see User and OtpRequest tables

# Option 2 — Health endpoint
npm run dev
# Then in another terminal:
curl http://localhost:4000/health
# Expected: { "status": "ok", "db": "ok", "dbLatencyMs": <number>, ... }
```

---

## Run the Dev Server

```powershell
npm run dev
# Server starts on http://localhost:4000
# Hot-reload via ts-node-dev
```

---

## Run Tests

```powershell
npm test
# 2 tests:
#   ✔ GET /health always returns HTTP 200          (passes with or without DB)
#   ✔ GET /health returns db:ok when DB reachable  (auto-skipped if DB is down)
```

---

## Common Issues

| Symptom | Fix |
|---|---|
| `Can't reach database server at localhost:5432` | Start the Postgres container/service first |
| `Environment validation failed: DATABASE_URL` | Run `copy .env.example .env` and fill in values |
| `prisma migrate dev` fails with auth error | Check the `nagrik` user exists and password matches |
| Port 4000 already in use | Change `PORT=` in `.env` or kill the other process |

---

## Useful Commands

```powershell
npm run dev            # Start dev server with hot-reload
npm run build          # Compile TypeScript to dist/
npm run db:up          # Start Postgres container (Docker only)
npm run db:down        # Stop Postgres container (Docker only)
npm run prisma:migrate # Run pending Prisma migrations
npm run prisma:generate # Regenerate Prisma client after schema changes
npx prisma studio      # Open browser DB UI
npm test               # Run test suite
```
