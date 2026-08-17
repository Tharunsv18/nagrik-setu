/**
 * User profile controller.
 *
 * GET  /api/user/profile  — returns authenticated user's profile
 * PATCH /api/user/profile  — updates phone only; name/email are read-only
 */

import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Indian mobile number rules:
 *   - Optional +91 or 91 prefix
 *   - Followed by a digit in 6-9 range (valid Indian mobile prefix)
 *   - Followed by exactly 9 more digits
 * Stored as the bare 10-digit number (no country code).
 */
const PHONE_RE = /^\+?91?([6-9]\d{9})$/;

const patchBodySchema = z.object({
  // Only `phone` is honoured — any other fields (name, email) are silently stripped.
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (val === null || val === undefined || val === "") return null;
      return val.trim();
    })
    .refine(
      (val) => val === null || PHONE_RE.test(val),
      {
        message:
          "Phone must be a valid 10-digit Indian mobile number (optionally prefixed with +91 or 91).",
      },
    )
    .transform((val) => {
      if (val === null) return null;
      // Normalise: strip +91 / 91 prefix, keep bare 10 digits
      const match = PHONE_RE.exec(val);
      return match ? match[1] : val;
    }),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/** GET /api/user/profile — requires authGuard */
export const getProfileHandler: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.auth!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        uniqueId: true,
        displayName: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return next(new AppError(404, "USER_NOT_FOUND", "Account not found."));
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/user/profile — requires authGuard; only phone is writable */
export const updateProfileHandler: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.auth!;

    // Strip all fields except phone — name/email silently ignored
    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request body.";
      return next(new AppError(400, "VALIDATION_ERROR", message));
    }

    const { phone } = parsed.data;

    // Confirm user exists before updating
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existing) {
      return next(new AppError(404, "USER_NOT_FOUND", "Account not found."));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        // Only update phone if it was provided in the payload
        ...(phone !== undefined ? { phone } : {}),
      },
      select: {
        id: true,
        uniqueId: true,
        displayName: true,
        email: true,
        phone: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
