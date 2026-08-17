/**
 * Frontend API client — applications
 * Requires a valid JWT access token.
 * Falls back to mock data when backend is unreachable.
 */

import { applications as MOCK_APPS } from "@/data/applications";
import type { Application } from "@/types";

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
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

interface ApiTimeline { stage: string; date: string; note: string; }
interface ApiApplication {
  id: string;
  schemeId: string;
  status: string;
  referenceNumber: string;
  submittedDate: string;
  lastUpdated: string;
  timeline: ApiTimeline[];
}

function toApplication(a: ApiApplication): Application {
  return {
    id: a.id,
    schemeId: a.schemeId,
    status: a.status as Application["status"],
    referenceNumber: a.referenceNumber,
    submittedDate: a.submittedDate,
    lastUpdated: a.lastUpdated,
    timeline: a.timeline,
  };
}

export async function apiListApplications(token: string): Promise<Application[]> {
  if (!token) return MOCK_APPS;
  try {
    const data = await authFetch<{ applications: ApiApplication[] }>("/api/applications", token);
    return data.applications.map(toApplication);
  } catch {
    return MOCK_APPS;
  }
}

export async function apiGetApplication(id: string, token: string): Promise<Application | null> {
  if (!token) return MOCK_APPS.find((a) => a.id === id) ?? null;
  try {
    const data = await authFetch<{ application: ApiApplication }>(`/api/applications/${id}`, token);
    return toApplication(data.application);
  } catch {
    return MOCK_APPS.find((a) => a.id === id) ?? null;
  }
}

export async function apiCreateApplication(schemeId: string, token: string): Promise<Application> {
  if (!token) throw new Error("Authentication required.");
  const data = await authFetch<{ application: ApiApplication }>("/api/applications", token, {
    method: "POST",
    body: JSON.stringify({ schemeId }),
  });
  return toApplication(data.application);
}
