/**
 * Profile API client.
 *
 * All calls require a valid JWT access token (Bearer).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

export interface UserProfile {
  id: string;
  uniqueId: string;
  displayName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ProfileApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProfileApiError";
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    code?: string;
    message?: string;
  } & Record<string, unknown>;

  if (!res.ok) {
    throw new ProfileApiError(
      res.status,
      body.code ?? "UNKNOWN_ERROR",
      body.message ?? `Request failed (${res.status})`,
    );
  }

  return body as T;
}

/** Fetch the authenticated user's profile. */
export async function fetchProfile(token: string): Promise<UserProfile> {
  const data = await request<{ user: UserProfile }>("/api/user/profile", token);
  return data.user;
}

/** Update the authenticated user's phone number. Returns updated profile. */
export async function updatePhone(
  token: string,
  phone: string | null,
): Promise<UserProfile> {
  const data = await request<{ user: UserProfile }>("/api/user/profile", token, {
    method: "PATCH",
    body: JSON.stringify({ phone }),
  });
  return data.user;
}
