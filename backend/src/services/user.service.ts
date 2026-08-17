/**
 * User business logic — look-up, availability check, and creation.
 *
 * Unique ID rules enforced here AND at the DB level:
 *  - 4–20 characters
 *  - alphanumeric + underscore only
 *  - must start with a letter
 *  - case-insensitive uniqueness (stored as lowercase in uniqueIdNorm)
 */

import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

export const UNIQUE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/;

/** Returns true when the given uniqueId is available (case-insensitive). */
export async function checkUniqueIdAvailability(uniqueId: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { uniqueIdNorm: uniqueId.toLowerCase() },
    select: { id: true },
  });
  return existing === null;
}

/**
 * Find a user by unique ID or email (used for login lookup).
 * Returns null when no match — callers must NOT reveal this to the client.
 */
export async function findUserByIdentifier(identifier: string): Promise<{ id: string; email: string; uniqueId: string } | null> {
  const lower = identifier.toLowerCase().trim();

  // Determine whether the identifier looks like an email
  const isEmail = lower.includes("@");

  if (isEmail) {
    return prisma.user.findUnique({
      where: { email: lower },
      select: { id: true, email: true, uniqueId: true },
    });
  }

  return prisma.user.findUnique({
    where: { uniqueIdNorm: lower },
    select: { id: true, email: true, uniqueId: true },
  });
}

/**
 * Create a new user after OTP verification.
 * Throws UNIQUE_ID_TAKEN (409) or EMAIL_TAKEN (409) on conflict.
 */
export async function createUser(
  uniqueId: string,
  email: string,
): Promise<{ id: string; email: string; uniqueId: string }> {
  try {
    return await prisma.user.create({
      data: {
        uniqueId,
        uniqueIdNorm: uniqueId.toLowerCase(),
        email: email.toLowerCase(),
        displayName: uniqueId,
      },
      select: { id: true, email: true, uniqueId: true },
    });
  } catch (error: unknown) {
    // Prisma unique constraint violation code
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as Record<string, unknown>).code === "P2002"
    ) {
      const meta = (error as Record<string, unknown>).meta as Record<string, unknown> | undefined;
      const target = Array.isArray(meta?.target) ? (meta!.target as string[]) : [];

      if (target.includes("uniqueIdNorm")) {
        throw new AppError(409, "UNIQUE_ID_TAKEN", "This unique ID is already taken.");
      }
      if (target.includes("email")) {
        throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.");
      }
    }
    throw error;
  }
}
