/// <reference path="../src/types/express.d.ts" />
import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.DATABASE_URL = "file:./dev.db";
process.env.FRONTEND_ORIGIN = "http://127.0.0.1:5173";
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-characters";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";

test("GET /health always returns HTTP 200", async () => {
  const { createApp } = await import("../src/app");
  const response = await request(createApp()).get("/health").expect(200);

  // Status is "ok" when DB is up, "degraded" when DB is unreachable —
  // both are valid in the test environment depending on whether Postgres is running.
  assert.ok(
    response.body.status === "ok" || response.body.status === "degraded",
    `status should be "ok" or "degraded", got: ${response.body.status}`,
  );

  assert.equal(typeof response.body.uptime, "number");
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);

  // db field must always be present
  assert.ok(
    response.body.db === "ok" || response.body.db === "error",
    `db should be "ok" or "error", got: ${response.body.db}`,
  );
});

test("GET /health returns db:ok when DB is reachable (integration)", async () => {
  // SQLite is file-based — always available if dev.db exists.
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
  const dbExists = fs.existsSync(dbPath) || fs.existsSync(path.resolve(process.cwd(), "dev.db"));

  if (!dbExists) {
    console.log("  ↳ Skipped: dev.db not found. Run `npx prisma migrate dev` first.");
    return;
  }

  const { createApp } = await import("../src/app");
  const response = await request(createApp()).get("/health").expect(200);

  assert.equal(response.body.status, "ok");
  assert.equal(response.body.db, "ok");
  assert.equal(typeof response.body.dbLatencyMs, "number");
});
