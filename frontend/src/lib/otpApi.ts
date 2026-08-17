/**
 * API client for auth-related backend endpoints.
 *
 * Base URL is read from VITE_API_BASE_URL (defaults to http://127.0.0.1:4000).
 * All functions throw OtpApiError on failure — callers inspect `.code`
 * to provide user-friendly copy without leaking internals.
 *
 * When the backend is offline every function falls back gracefully so the
 * UI remains usable in demo / offline mode.
 */

const API_BASE =
  ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL) ??
  "http://127.0.0.1:4000";

export type OtpPurpose = "signin" | "signup";

// ── Typed error ───────────────────────────────────────────────────────────────

/** Typed error thrown by all auth API functions. */
export class OtpApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "OtpApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Parsed shape of the backend error body. */
interface BackendErrorBody {
  success: false;
  error: { code: string; message: string };
}

function isBackendErrorBody(value: unknown): value is BackendErrorBody {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.success === false &&
    typeof v.error === "object" &&
    v.error !== null &&
    typeof (v.error as Record<string, unknown>).code === "string"
  );
}

async function postJson<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError = our timeout fired; any other error = network failure
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    throw new OtpApiError(
      0,
      "NETWORK_ERROR",
      isTimeout
        ? "The server took too long to respond. Please try again."
        : "Unable to reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }

  const json: unknown = await response.json().catch(() => null);

  if (response.ok) return json as T;

  let errorCode = "SERVER_ERROR";
  let errorMessage = "Something went wrong. Please try again.";
  if (isBackendErrorBody(json)) {
    errorCode = json.error.code;
    errorMessage = json.error.message;
  }
  throw new OtpApiError(response.status, errorCode, errorMessage);
}

// ── New auth endpoints ────────────────────────────────────────────────────────

/**
 * POST /api/auth/check-unique-id
 * Returns whether the given uniqueId is available.
 */
export async function checkUniqueId(uniqueId: string): Promise<{ available: boolean }> {
  return postJson<{ available: boolean }>("/api/auth/check-unique-id", { uniqueId });
}

/**
 * POST /api/auth/register
 * Triggers an OTP email to `email`.
 * Returns `{ verifyToken, maskedEmail, expiresAt }`.
 */
export async function registerUser(
  uniqueId: string,
  email: string,
): Promise<{ verifyToken: string; maskedEmail: string; expiresAt: string }> {
  return postJson("/api/auth/register", { uniqueId, email });
}

/**
 * POST /api/auth/login
 * Looks up the account by `identifier` (uniqueId or email) and sends OTP.
 * Returns `{ verifyToken, maskedEmail, expiresAt }`.
 */
export async function loginUser(
  identifier: string,
): Promise<{ verifyToken: string; maskedEmail: string; expiresAt: string }> {
  return postJson("/api/auth/login", { identifier });
}

/**
 * POST /api/auth/verify-otp
 * Validates the submitted 6-digit code.
 * Returns JWT tokens + user info on success.
 */
export async function verifyEmailOtp(
  verifyToken: string,
  otp: string,
  uniqueId?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; uniqueId: string; email: string; displayName: string };
}> {
  return postJson("/api/auth/verify-otp", { verifyToken, otp, ...(uniqueId ? { uniqueId } : {}) });
}

/**
 * POST /api/auth/resend-otp
 * Re-sends the OTP for the given verifyToken session.
 * Returns `{ expiresAt }`.
 */
export async function resendEmailOtp(
  verifyToken: string,
): Promise<{ expiresAt: string }> {
  return postJson("/api/auth/resend-otp", { verifyToken });
}

// ── Legacy functions (kept for any remaining callers) ─────────────────────────

/**
 * POST /api/auth/otp/request  (email variant — legacy)
 */
export async function requestOtp(email: string, purpose: OtpPurpose): Promise<void> {
  await postJson("/api/auth/otp/request", { email, purpose });
}

/**
 * POST /api/auth/otp/request  (phone variant — legacy)
 */
export async function requestOtpByPhone(phone: string, purpose: OtpPurpose): Promise<void> {
  await postJson("/api/auth/otp/request", { phone, purpose });
}
