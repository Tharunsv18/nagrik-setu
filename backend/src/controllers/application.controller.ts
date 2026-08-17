/**
 * Application controller
 * POST   /api/applications          — create
 * GET    /api/applications          — list mine
 * GET    /api/applications/:id      — detail
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import {
  createApplication,
  listApplications,
  getApplicationById,
} from "../services/data.service";

const createSchema = z.object({
  schemeId: z.string().min(1, "schemeId is required."),
});

function formatApplication(app: Awaited<ReturnType<typeof getApplicationById>>) {
  if (!app) return null;
  return {
    id: app.id,
    schemeId: app.schemeId,
    status: app.status,
    referenceNumber: app.referenceNumber,
    submittedDate: app.submittedDate,
    lastUpdated: app.lastUpdated,
    timeline: app.timeline.map((t) => ({ stage: t.stage, date: t.date, note: t.note })),
  };
}

export const createApplicationHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid body."));
  }

  const { userId } = req.auth!;
  const { schemeId } = parsed.data;

  // Verify scheme exists
  const scheme = await prisma.scheme.findUnique({ where: { id: schemeId }, select: { id: true } });
  if (!scheme) {
    return next(new AppError(404, "SCHEME_NOT_FOUND", "Scheme not found."));
  }

  const application = await createApplication(userId, schemeId);
  res.status(201).json({ success: true, application: formatApplication(application) });
});

export const listApplicationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.auth!;
  const applications = await listApplications(userId);
  res.json({ success: true, applications: applications.map(formatApplication) });
});

export const getApplicationHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.auth!;
  const { id } = req.params;
  const application = await getApplicationById(id as string, userId);
  if (!application) {
    return next(new AppError(404, "APPLICATION_NOT_FOUND", "Application not found."));
  }
  res.json({ success: true, application: formatApplication(application) });
});
