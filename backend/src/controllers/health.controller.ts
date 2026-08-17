import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";

/**
 * GET /health
 *
 * Returns server uptime and a live database connectivity check.
 *
 * Response shape:
 *   200  { status: "ok" | "degraded", uptime, timestamp, db: "ok" | "error", dbLatencyMs? }
 *
 * The endpoint always returns HTTP 200 so uptime monitors don't false-alarm
 * on a DB blip. Callers should inspect `status` / `db` for the real picture.
 */
export const getHealth: RequestHandler = async (_request, response) => {
  const start = Date.now();

  let dbStatus: "ok" | "error" = "error";
  let dbLatencyMs: number | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbStatus = "ok";
  } catch {
    // DB is unreachable — report degraded but still 200
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";

  response.json({
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: dbStatus,
    ...(dbLatencyMs !== undefined ? { dbLatencyMs } : {}),
  });
};
