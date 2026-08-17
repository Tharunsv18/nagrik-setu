import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  FRONTEND_ORIGIN: z.string().url("FRONTEND_ORIGIN must be a valid URL"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
  /** Minutes before an OTP expires (default: 5) */
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),
  /** bcrypt cost rounds for hashing OTPs (default: 10) */
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(14).default(10),
  /** Seconds the user must wait before requesting a resend (default: 60) */
  RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),

  // ── SMTP / Email ─────────────────────────────────────────────────────────
  /**
   * SMTP host. Leave empty in dev to auto-create an Ethereal test account.
   * Examples: smtp.gmail.com, smtp.office365.com, smtp.sendgrid.net
   */
  SMTP_HOST: z.string().optional(),
  /** SMTP port — 587 (STARTTLS) or 465 (SSL) are most common. */
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  /** Set to "true" for port 465 (implicit TLS). Leave false for STARTTLS (587). */
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** SMTP username / login */
  SMTP_USER: z.string().optional(),
  /** SMTP password or app password */
  SMTP_PASS: z.string().optional(),
  /**
   * "From" address shown in sent emails.
   * Defaults to a NagrikSeva no-reply address.
   */
  SMTP_FROM: z.string().email().default("noreply@nagrikseva.gov.in"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid backend environment: ${details}`);
}

export const env = result.data;

export type Env = typeof env;
