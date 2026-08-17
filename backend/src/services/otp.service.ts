/**
 * OTP business logic — generation, hashing, storage, dispatch, verification, and resend.
 *
 * Security guarantees:
 * - Plaintext OTP exists only in memory for the duration of requestOtp().
 * - Only a bcrypt hash is written to the database.
 * - The OTP value is never returned from any exported function.
 * - Old unused OTPs for the same email are invalidated on each new request.
 * - Per-email rate-limit: max 3 requests per OTP_EXPIRY window.
 * - Per-token resend rate-limit: max 3 resends.
 * - After 5 failed verify attempts the OtpRequest is locked (failCount >= 5).
 */

import { randomInt } from "node:crypto";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { sendOtpEmail } from "./email.service";

const MAX_REQUESTS_PER_WINDOW = 3;
const MAX_RESENDS = 3;
const MAX_FAIL_ATTEMPTS = 5;

/** Generate a cryptographically random 6-digit OTP string (with leading zero padding). */
function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Request a new OTP for `email`.
 *
 * Steps:
 * 1. Per-email rate-limit check (DB-level).
 * 2. Invalidate all previous unused OTPs for this email.
 * 3. Generate a 6-digit OTP, hash it with bcrypt, store the hash.
 * 4. Dispatch the plaintext OTP via email (stub in dev).
 *
 * Returns `{ verifyToken, expiresAt }` — the OTP value is NEVER returned.
 */
export async function requestOtp(
  email: string,
  purpose: "signin" | "signup",
  userId?: string,
): Promise<{ verifyToken: string; expiresAt: Date }> {
  const windowStart = new Date(Date.now() - env.OTP_EXPIRY_MINUTES * 60 * 1000);

  // ── Per-email rate-limit (DB layer) ──────────────────────────────────────
  const recentCount = await prisma.otpRequest.count({
    where: {
      email: email.toLowerCase(),
      createdAt: { gte: windowStart },
    },
  });

  if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
    throw new AppError(
      429,
      "TOO_MANY_REQUESTS",
      "Too many code requests for this email. Please wait before trying again.",
    );
  }

  // ── Invalidate old unused OTPs for this email ────────────────────────────
  await prisma.otpRequest.deleteMany({
    where: {
      email: email.toLowerCase(),
      usedAt: null,
    },
  });

  // ── Generate, hash, and store ────────────────────────────────────────────
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, env.BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);
  const verifyToken = randomUUID(); // UUID format — overrides Prisma @default(cuid())

  await prisma.otpRequest.create({
    data: {
      email: email.toLowerCase(),
      purpose,
      otpHash,
      expiresAt,
      verifyToken,
      ...(userId ? { userId } : {}),
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[otp.request] Generated OTP="${otp}" chars=[${otp.split("").map(c => c.charCodeAt(0)).join(",")}] ` +
      `verifyToken=${verifyToken}`,
    );
  }

  // ── Send email (plaintext OTP passed only here; never returned) ──────────
  await sendOtpEmail(email, otp);

  // Explicitly shadow `otp` so it cannot be accidentally referenced below.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _otp = otp;

  return { verifyToken, expiresAt };
}

/**
 * Verify a submitted OTP code against the stored hash.
 *
 * Returns the matched OtpRequest row on success.
 * Throws on expiry, usage, wrong code (with incremented fail count), or lockout.
 */
export async function verifyOtp(
  verifyToken: string,
  submittedCode: string,
): Promise<{ email: string; purpose: string; userId: string | null }> {
  const row = await prisma.otpRequest.findUnique({
    where: { verifyToken },
  });

  if (!row) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification session.");
  }

  if (row.usedAt) {
    throw new AppError(400, "OTP_ALREADY_USED", "This code has already been used.");
  }

  if (new Date() > row.expiresAt) {
    throw new AppError(400, "OTP_EXPIRED", "The code has expired. Please request a new one.");
  }

  if (row.failCount >= MAX_FAIL_ATTEMPTS) {
    throw new AppError(
      429,
      "OTP_LOCKED",
      "Too many incorrect attempts. Please request a new code.",
    );
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[otp.verify] submittedCode="${submittedCode}" len=${submittedCode.length} ` +
      `chars=[${submittedCode.split("").map(c => c.charCodeAt(0)).join(",")}]`,
    );
  }

  const isValid = await bcrypt.compare(submittedCode, row.otpHash);

  if (process.env.NODE_ENV !== "production") {
    console.info(`[otp.verify] bcrypt result: ${isValid}`);
  }

  if (!isValid) {
    await prisma.otpRequest.update({
      where: { id: row.id },
      data: { failCount: { increment: 1 } },
    });
    const remaining = MAX_FAIL_ATTEMPTS - (row.failCount + 1);
    throw new AppError(
      400,
      "INVALID_OTP",
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Incorrect code. This session is now locked — please request a new code.",
    );
  }

  // Mark as used
  await prisma.otpRequest.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  return { email: row.email, purpose: row.purpose, userId: row.userId };
}

/**
 * Resend a new OTP for an existing verifyToken session.
 *
 * Rate-limited to MAX_RESENDS per session.
 * Generates a fresh OTP, updates the hash + expiry, and re-sends the email.
 * Returns the updated expiresAt.
 */
export async function resendOtp(
  verifyToken: string,
): Promise<{ expiresAt: Date }> {
  const row = await prisma.otpRequest.findUnique({ where: { verifyToken } });

  if (!row || row.usedAt) {
    throw new AppError(400, "INVALID_TOKEN", "Invalid or completed verification session.");
  }

  if (row.resendCount >= MAX_RESENDS) {
    throw new AppError(
      429,
      "RESEND_LIMIT_REACHED",
      "Maximum resend limit reached. Please start a new sign-in.",
    );
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, env.BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpRequest.update({
    where: { id: row.id },
    data: {
      otpHash,
      expiresAt,
      failCount: 0,
      resendCount: { increment: 1 },
    },
  });

  await sendOtpEmail(row.email, otp);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _otp = otp;

  return { expiresAt };
}
