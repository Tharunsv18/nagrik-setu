/**
 * Scheme controller
 * GET /api/schemes            — list / search (paginated, filterable by status)
 * GET /api/schemes/:id        — detail
 * GET /api/schemes/:id/related — related schemes
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import { listSchemes, getSchemeById, getRelatedSchemes } from "../services/data.service";
import type { SchemeRow } from "../services/data.service";

// ── Valid scheme statuses callers may request ─────────────────────────────────
// LEGACY_VERIFY is intentionally omitted — it's blocked server-side regardless.
const ALLOWED_STATUSES = ["CURRENT", "EXPIRED", "FUTURE"] as const;

const listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  state: z.string().optional(),
  level: z.enum(["central", "state"]).optional(),
  /** Filter by lifecycle status. Pass "CURRENT" for the "Running Schemes" view. */
  status: z.enum(ALLOWED_STATUSES).optional(),
  /** When "true", narrows to schemes with an open application window today. */
  applications_open: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** 1-based page number (used together with limit). Overrides offset. */
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

function parseScheme(row: SchemeRow) {
  return {
    id: row.id,
    name: row.name,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    department: row.department,
    level: row.level,
    state: row.state,
    category: row.category,
    benefits: JSON.parse(row.benefitsJson) as unknown,
    eligibility: JSON.parse(row.eligibilityJson) as unknown,
    documentsRequired: JSON.parse(row.documentsJson) as string[],
    applicationMode: row.applicationMode,
    officialLink: row.officialLink,
    deadline: row.deadline,
    status: row.status,
    applicationStartDate: row.applicationStartDate,
    applicationEndDate: row.applicationEndDate,
    tags: JSON.parse(row.tagsJson) as string[],
    popularityScore: row.popularityScore,
    launchedYear: row.launchedYear,
    rating: row.rating,
    sourceUrl: row.sourceUrl,
    lastVerifiedAt: row.lastVerifiedAt,
  };
}

export const listSchemesHandler = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid query parameters.", details: parsed.error.flatten() },
    });
    return;
  }

  const { q, category, state, level, status, applications_open, page, limit, offset } = parsed.data;

  const { rows, total } = await listSchemes({
    q,
    category,
    state,
    level,
    status,
    applicationsOpen: applications_open,
    page,
    limit,
    offset,
  });

  res.json({
    success: true,
    schemes: rows.map(parseScheme),
    total,
    /** Convenience: count of CURRENT schemes (for the "running now" UI counter).
     *  Only populated when status=CURRENT is requested. */
    ...(status === "CURRENT" ? { runningCount: total } : {}),
  });
});

export const getSchemeHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const row = await getSchemeById(id as string);
  if (!row || row.status === "LEGACY_VERIFY") {
    return next(new AppError(404, "SCHEME_NOT_FOUND", "Scheme not found."));
  }
  res.json({ success: true, scheme: parseScheme(row) });
});

export const getRelatedSchemesHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const row = await getSchemeById(id as string);
  if (!row || row.status === "LEGACY_VERIFY") {
    return next(new AppError(404, "SCHEME_NOT_FOUND", "Scheme not found."));
  }
  const related = await getRelatedSchemes(row.id, row.category, row.department);
  // Filter related results to exclude LEGACY_VERIFY
  const visible = related.filter((r) => r.status !== "LEGACY_VERIFY");
  res.json({ success: true, schemes: visible.map(parseScheme) });
});
