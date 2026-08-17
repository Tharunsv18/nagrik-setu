/**
 * Frontend API client — grievances
 * Requires a valid JWT access token.
 * Falls back to mock data when backend is unreachable.
 */

import { grievances as MOCK_GRIEVANCES } from "@/data/grievances";
import type { Grievance } from "@/types";

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
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

interface ApiGrievanceResponse { from: string; message: string; date: string; }
interface ApiGrievance {
  id: string;
  referenceNumber: string;
  subject: string;
  department: string;
  relatedSchemeId: string | null;
  description: string;
  status: string;
  submittedDate: string;
  attachments: string[];
  responses: ApiGrievanceResponse[];
}

function toGrievance(g: ApiGrievance): Grievance {
  return {
    id: g.id,
    referenceNumber: g.referenceNumber,
    subject: g.subject,
    department: g.department,
    relatedSchemeId: g.relatedSchemeId ?? undefined,
    description: g.description,
    status: g.status as Grievance["status"],
    submittedDate: g.submittedDate,
    attachments: g.attachments,
    responses: g.responses,
  };
}

export async function apiListGrievances(token: string): Promise<Grievance[]> {
  if (!token) return MOCK_GRIEVANCES;
  try {
    const data = await authFetch<{ grievances: ApiGrievance[] }>("/api/grievances", token);
    return data.grievances.map(toGrievance);
  } catch {
    return MOCK_GRIEVANCES;
  }
}

export async function apiGetGrievance(id: string, token: string): Promise<Grievance | null> {
  if (!token) return MOCK_GRIEVANCES.find((g) => g.id === id) ?? null;
  try {
    const data = await authFetch<{ grievance: ApiGrievance }>(`/api/grievances/${id}`, token);
    return toGrievance(data.grievance);
  } catch {
    return MOCK_GRIEVANCES.find((g) => g.id === id) ?? null;
  }
}

export interface CreateGrievanceInput {
  subject: string;
  department: string;
  relatedSchemeId?: string;
  description: string;
  attachments?: string[];
}

export async function apiCreateGrievance(input: CreateGrievanceInput, token: string): Promise<Grievance> {
  if (!token) throw new Error("Authentication required.");
  const data = await authFetch<{ grievance: ApiGrievance }>("/api/grievances", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toGrievance(data.grievance);
}
