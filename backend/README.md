# Nagrik Setu Backend

This folder contains the standalone backend scaffold for Nagrik Setu. It is a separate Node.js and TypeScript project with its own package.json, Prisma setup, tests, linting, and local PostgreSQL configuration.

## Stack

- Node.js
- Express
- TypeScript in strict mode
- PostgreSQL
- Prisma
- Zod
- JWT access and refresh tokens
- dotenv

## Prerequisites

- Node.js 22 or newer
- npm
- Docker Desktop, for local PostgreSQL

## Setup

```bash
cd backend
npm install
```

Create a local `.env` file by following `.env.example`. Do not commit the real `.env` file.

## Environment Variables

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://nagrik:nagrik_password@localhost:5432/nagrik_setu?schema=public
FRONTEND_ORIGIN=http://127.0.0.1:5173
JWT_ACCESS_SECRET=replace-with-a-long-access-token-secret
JWT_REFRESH_SECRET=replace-with-a-long-refresh-token-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

The backend validates these values at startup and fails fast if required values are missing or invalid.

## Run PostgreSQL

```bash
docker compose up -d postgres
```

This starts a local PostgreSQL container using the same database URL shown in `.env.example`.

To stop it:

```bash
docker compose down
```

## Prisma

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate
```

The current Prisma schema intentionally has no application models yet. This phase is scaffolding only.

## Development

```bash
npm run dev
```

The API starts on `PORT`, which defaults to `4000`. The frontend development origin is locked through `FRONTEND_ORIGIN`.

## Health Check

```bash
GET /health
```

Response:

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-08-07T00:00:00.000Z"
}
```

## Validation

```bash
npm run build
npm run lint
npm test
```

Errors use a consistent response shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid.",
    "details": {}
  }
}
```
