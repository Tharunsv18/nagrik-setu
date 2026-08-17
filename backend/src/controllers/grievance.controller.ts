/**
 * Grievance controller
 * POST /api/grievances        — file
 * GET  /api/grievances        — list mine
 * GET  /api/grievances/:id    — detail
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import {
  createGrievance,
  listGrievances,
  getGrievanceById,
} from "../services/data.service";

const createSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters.").max(200),
  department: z.string().min(2, "Department is required.").max(200),
  relatedSchemeId: z.string().optional(),
  description: z.string().min(20, "Description must be at least 20 characters.").max(5000),
  attachments: z.array(z.string()).optional(),
});

function formatGrievance(g: Awaited<ReturnType<typeof getGrievanceById>>) {
  if (!g) return null;
  return {
    id: g.id,
    referenceNumber: g.referenceNumber,
    subject: g.subject,
    department: g.department,
    relatedSchemeId: g.relatedSchemeId,
    description: g.description,
    status: g.status,
    submittedDate: g.submittedDate,
    attachments: JSON.parse(g.attachmentsJson) as string[],
    responses: g.responses.map((r) => ({ from: r.from, message: r.message, date: r.date })),
  };
}

export const createGrievanceHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid body."));
  }

  const { userId } = req.auth!;
  const grievance = await createGrievance(userId, parsed.data);
  res.status(201).json({ success: true, grievance: formatGrievance(grievance) });
});

export const listGrievancesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.auth!;
  const grievances = await listGrievances(userId);
  res.json({ success: true, grievances: grievances.map(formatGrievance) });
});

export const getGrievanceHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.auth!;
  const { id } = req.params;
  const grievance = await getGrievanceById(id as string, userId);
  if (!grievance) {
    return next(new AppError(404, "GRIEVANCE_NOT_FOUND", "Grievance not found."));
  }
  res.json({ success: true, grievance: formatGrievance(grievance) });
});
