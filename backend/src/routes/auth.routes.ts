import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  checkUniqueIdHandler,
  checkUniqueIdSchema,
  loginHandler,
  loginSchema,
  logoutHandler,
  logoutSchema,
  refreshHandler,
  refreshSchema,
  registerHandler,
  registerSchema,
  resendOtpHandler,
  resendOtpSchema,
  verifyOtpHandler,
  verifyOtpSchema,
} from "../controllers/auth.controller";
import { validate } from "../middleware/validate";

export const authRoutes = Router();

/** Tight rate limit for OTP-related writes — 10 requests / 15 min per IP. */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts from this device. Please wait 15 minutes and try again.",
    },
  },
  skip: () => process.env.NODE_ENV === "test",
});

/** Lighter limit for the availability probe (called on every keystroke via debounce). */
const availabilityRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});

// POST /auth/check-unique-id
authRoutes.post("/auth/check-unique-id", availabilityRateLimit, validate({ body: checkUniqueIdSchema }), checkUniqueIdHandler);

// POST /auth/register
authRoutes.post("/auth/register", authRateLimit, validate({ body: registerSchema }), registerHandler);

// POST /auth/login
authRoutes.post("/auth/login", authRateLimit, validate({ body: loginSchema }), loginHandler);

// POST /auth/verify-otp
authRoutes.post("/auth/verify-otp", authRateLimit, validate({ body: verifyOtpSchema }), verifyOtpHandler);

// POST /auth/resend-otp
authRoutes.post("/auth/resend-otp", authRateLimit, validate({ body: resendOtpSchema }), resendOtpHandler);

// POST /auth/refresh  — no rate limit (uses token validation as protection)
authRoutes.post("/auth/refresh", validate({ body: refreshSchema }), refreshHandler);

// POST /auth/logout
authRoutes.post("/auth/logout", validate({ body: logoutSchema }), logoutHandler);
