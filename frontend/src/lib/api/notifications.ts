/**
 * Frontend API client — notifications
 * Requires a valid JWT access token.
 */

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

async function authFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export interface ApiNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function apiListNotifications(token: string): Promise<ApiNotification[]> {
  if (!token) return [];
  try {
    const data = await authFetch<{ notifications: ApiNotification[] }>("/api/notifications", token);
    return data.notifications;
  } catch {
    return [];
  }
}

export async function apiGetUnreadCount(token: string): Promise<number> {
  if (!token) return 0;
  try {
    const data = await authFetch<{ count: number }>("/api/notifications/unread-count", token);
    return data.count;
  } catch {
    return 0;
  }
}

export async function apiMarkNotificationRead(id: string, token: string): Promise<void> {
  if (!token) return;
  await authFetch(`/api/notifications/${id}/read`, token, { method: "PATCH" });
}

export async function apiMarkAllRead(token: string): Promise<void> {
  if (!token) return;
  await authFetch("/api/notifications/read-all", token, { method: "PATCH" });
}

/** Auth: token refresh */
export async function apiRefreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    return data;
  } catch {
    return null;
  }
}

/** Auth: logout (revoke refresh token) */
export async function apiLogout(refreshToken: string): Promise<void> {
  try {
    await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Silent — local sign-out still happens even if request fails
  }
}
