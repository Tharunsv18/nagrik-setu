/**
 * Frontend API client — schemes
 *
 * Calls the real backend at VITE_API_BASE_URL.
 * Falls back to the local mock data when the backend is unreachable.
 */

import { schemes as MOCK_SCHEMES } from "@/data/schemes";
import type { Scheme } from "@/types";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

// ── Shape returned by the backend ────────────────────────────────────────────

interface ApiScheme {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  department: string;
  level: string;
  state: string | null;
  category: string;
  benefits: { summary: string; amount?: string };
  eligibility: Record<string, unknown>;
  documentsRequired: string[];
  applicationMode: string;
  officialLink: string | null;
  deadline: string | null;
  status: string;
  applicationStartDate: string | null;
  applicationEndDate: string | null;
  tags: string[];
  popularityScore: number;
  launchedYear: number;
  rating: number | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
}

function toScheme(s: ApiScheme): Scheme {
  return {
    id: s.id,
    name: s.name,
    shortDescription: s.shortDescription,
    longDescription: s.longDescription,
    department: s.department,
    level: s.level as Scheme["level"],
    state: s.state ?? undefined,
    category: s.category as Scheme["category"],
    benefits: s.benefits,
    eligibility: s.eligibility as Scheme["eligibility"],
    documentsRequired: s.documentsRequired,
    applicationMode: s.applicationMode as Scheme["applicationMode"],
    officialLink: s.officialLink ?? undefined,
    deadline: s.deadline ?? undefined,
    status: (s.status as Scheme["status"]) ?? "CURRENT",
    applicationStartDate: s.applicationStartDate,
    applicationEndDate: s.applicationEndDate,
    tags: s.tags,
    popularityScore: s.popularityScore,
    launchedYear: s.launchedYear,
    rating: s.rating ?? undefined,
    sourceUrl: s.sourceUrl ?? undefined,
    lastVerifiedAt: s.lastVerifiedAt ?? undefined,
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export interface SchemeFilters {
  q?: string;
  category?: string;
  state?: string;
  level?: string;
  /** Only return schemes with this status. Pass "CURRENT" for the "Running Schemes" view. */
  status?: "CURRENT" | "EXPIRED" | "FUTURE";
  /** Narrow to schemes with an application window open today */
  applicationsOpen?: boolean;
  page?: number;
  limit?: number;
}

export interface SchemesApiResult {
  schemes: Scheme[];
  total: number;
}

export async function apiListSchemes(filters: SchemeFilters = {}): Promise<SchemesApiResult> {
  try {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.state) params.set("state", filters.state);
    if (filters.level) params.set("level", filters.level);
    if (filters.status) params.set("status", filters.status);
    if (filters.applicationsOpen) params.set("applications_open", "true");
    if (filters.page) params.set("page", String(filters.page));
    params.set("limit", String(filters.limit ?? 100));

    const qs = params.toString();
    const data = await fetchJson<{ schemes: ApiScheme[]; total: number }>(`/api/schemes${qs ? `?${qs}` : ""}`);
    return { schemes: data.schemes.map(toScheme), total: data.total };
  } catch {
    // Graceful fallback to mock data when backend is unreachable
    let result = [...MOCK_SCHEMES];

    // status filter — mock data has no status, so treat all as CURRENT
    if (filters.status && filters.status !== "CURRENT") result = [];

    if (filters.category) result = result.filter((s) => s.category === filters.category);
    if (filters.state) result = result.filter((s) => s.state === filters.state);
    if (filters.level) result = result.filter((s) => s.level === filters.level);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortDescription.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    // applications_open filter: in fallback mode, schemes with no dates pass through
    if (filters.applicationsOpen) {
      const today = new Date().toISOString().slice(0, 10);
      result = result.filter((s) => {
        if (!s.applicationStartDate || !s.applicationEndDate) return false;
        return s.applicationStartDate <= today && s.applicationEndDate >= today;
      });
    }
    return { schemes: result, total: result.length };
  }
}

export async function apiGetScheme(id: string): Promise<Scheme | null> {
  try {
    const data = await fetchJson<{ scheme: ApiScheme }>(`/api/schemes/${id}`);
    return toScheme(data.scheme);
  } catch {
    return MOCK_SCHEMES.find((s) => s.id === id) ?? null;
  }
}

export async function apiGetRelatedSchemes(schemeId: string): Promise<Scheme[]> {
  try {
    const data = await fetchJson<{ schemes: ApiScheme[] }>(`/api/schemes/${schemeId}/related`);
    return data.schemes.map(toScheme);
  } catch {
    const scheme = MOCK_SCHEMES.find((s) => s.id === schemeId);
    if (!scheme) return [];
    return MOCK_SCHEMES
      .filter((s) => s.id !== schemeId && (s.category === scheme.category || s.department === scheme.department))
      .slice(0, 4);
  }
}
