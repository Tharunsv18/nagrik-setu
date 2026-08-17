import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requestOtpHandler, requestOtpSchema } from "../controllers/otp.controller";
import { validate } from "../middleware/validate";

export const otpRoutes = Router();

/**
 * IP-level rate limiter: max 5 OTP requests per 10 minutes per IP.
 * This is the outer guard; per-email enforcement is handled in otp.service.ts.
 */
const otpIpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts from this device. Please wait 10 minutes and try again.",
    },
  },
  // Skip rate-limit in tests so integration tests don't trip over it.
  skip: () => process.env.NODE_ENV === "test",
});

/**
 * POST /auth/otp/request
 * Body: { email: string, purpose: "signin" | "signup" }
 *
 * Pipeline: IP rate-limit → body validation → handler
 */
otpRoutes.post(
  "/auth/otp/request",
  otpIpRateLimit,
  validate({ body: requestOtpSchema }),
  requestOtpHandler,
);

// ── TODO: verify step ─────────────────────────────────────────────────────────
// otpRoutes.post("/auth/otp/verify", otpIpRateLimit, validate({ body: verifyOtpSchema }), verifyOtpHandler);
