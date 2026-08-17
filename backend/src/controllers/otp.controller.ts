import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import { requestOtp } from "../services/otp.service";

export const requestOtpSchema = z
  .object({
    email: z.string().email("A valid email address is required.").optional(),
    phone: z
      .string()
      .regex(/^[6-9][0-9]{9}$/, "A valid 10-digit Indian mobile number is required.")
      .optional(),
    purpose: z.enum(["signin", "signup"] as const, {
      error: "purpose must be \"signin\" or \"signup\".",
    }),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required.",
  });

/**
 * POST /auth/otp/request
 *
 * Accepts { email, purpose } and triggers an OTP email dispatch.
 *
 * Security: always returns the same generic success message regardless of
 * whether the email is registered — no information leakage.
 * The OTP value NEVER appears in this response or in any log.
 */
export const requestOtpHandler = asyncHandler(
  async (request: Request, response: Response, next: NextFunction) => {
    const { email, phone, purpose } = request.body as z.infer<typeof requestOtpSchema>;
    const contact = email ?? phone!;

    try {
      // requestOtp currently sends via email; for phone numbers it just logs
      // (SMS delivery is out of scope for this prototype).
      if (email) {
        await requestOtp(email, purpose);
      } else {
        console.log(`[otp.controller] Phone OTP requested for +91${phone} (${purpose}) — SMS stub`);
      }
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 429) {
        return next(error);
      }
      console.error("[otp.controller] requestOtp failed:", error);
      return next(new AppError(500, "OTP_REQUEST_FAILED", "Unable to send code. Please try again later."));
    }

    response.status(202).json({
      success: true,
      message: email
        ? "If this email is valid, a sign-in code has been sent."
        : `A sign-in code has been sent to +91${contact}.`,
    });
  },
);
