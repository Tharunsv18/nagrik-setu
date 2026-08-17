/**
 * RunningSchemesList — "All Running Schemes" view component
 *
 * Used by the Landing Page "Running Now" tab.
 * Fetches from GET /api/schemes?status=CURRENT
 * Supports filtering by category and state client-side (no duplicate logic —
 * all filtering is done via a single API call with fresh params on each change).
 */

import {
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  GraduationCap,
  HeartPulse,
  Home,
  LayoutGrid,
  Loader2,
  SearchX,
  Sprout,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SchemeCard } from "@/components/scheme/SchemeCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { apiListSchemes } from "@/lib/api/schemes";
import type { Scheme } from "@/types";

// ── Filter config ─────────────────────────────────────────────────────────────
const CATEGORY_FILTERS = [
  { id: "all", label: "All Categories", icon: LayoutGrid },
  { id: "agriculture", label: "Agriculture", icon: Sprout },
  { id: "housing", label: "Housing", icon: Home },
  { id: "health", label: "Healthcare", icon: HeartPulse },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "employment", label: "Employment", icon: BriefcaseBusiness },
  { id: "financial-inclusion", label: "Financial", icon: Banknote },
  { id: "women-child", label: "Social", icon: Users },
] as const;

type CategoryId = (typeof CATEGORY_FILTERS)[number]["id"];

interface RunningState {
  schemes: Scheme[];
  total: number;
  loading: boolean;
  error: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RunningSchemesList() {
  const [category, setCategory] = useState<CategoryId>("all");
  const [applicationsOpen, setApplicationsOpen] = useState(false);
  const [state, setState] = useState<RunningState>({
    schemes: [],
    total: 0,
    loading: true,
    error: null,
  });

  // Debounce ref to avoid hammering the API on rapid filter changes
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSchemes = useCallback(
    (cat: CategoryId, appsOpen: boolean) => {
      if (fetchRef.current) clearTimeout(fetchRef.current);
      setState((s) => ({ ...s, loading: true, error: null }));

      fetchRef.current = setTimeout(async () => {
        try {
          const result = await apiListSchemes({
            status: "CURRENT",
            category: cat === "all" ? undefined : cat,
            applicationsOpen: appsOpen || undefined,
            limit: 100,
          });
          setState({ schemes: result.schemes, total: result.total, loading: false, error: null });
        } catch {
          setState((s) => ({ ...s, loading: false, error: "Could not load schemes. Please try again." }));
        }
      }, 120);
    },
    [],
  );

  useEffect(() => {
    fetchSchemes(category, applicationsOpen);
    return () => {
      if (fetchRef.current) clearTimeout(fetchRef.current);
    };
  }, [category, applicationsOpen, fetchSchemes]);

  const { schemes, total, loading, error } = state;

  return (
    <div>
      {/* ── Header row ────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: "#d1fae5" }}
          >
            <Zap size={14} style={{ color: "#065f46" }} aria-hidden="true" />
          </span>
          <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
                Loading…
              </span>
            ) : (
              <>
                <span style={{ color: "#065f46" }}>{total}</span>
                {" "}scheme{total !== 1 ? "s" : ""} currently running
              </>
            )}
          </span>
        </div>

        {/* Applications-open toggle */}
        <button
          type="button"
          onClick={() => setApplicationsOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            applicationsOpen
              ? "border-transparent text-white"
              : "border-border bg-white"
          }`}
          style={applicationsOpen ? { background: "#065f46", color: "#fff" } : { color: "var(--muted-foreground)" }}
          aria-pressed={applicationsOpen}
          title="Only show schemes with an active application window"
        >
          <CalendarCheck size={12} aria-hidden="true" />
          Applications open now
        </button>
      </div>

      {/* ── Category pills ────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map(({ id, label, icon: Icon }) => {
          const isActive = category === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? "text-white"
                  : "border border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
              style={isActive ? { background: "var(--primary)" } : {}}
              aria-pressed={isActive}
            >
              <Icon aria-hidden="true" size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <div className="rounded-xl border border-border bg-white p-10 text-center">
          <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => fetchSchemes(category, applicationsOpen)}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Retry
          </button>
        </div>
      ) : schemes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-12 text-center">
          <SearchX size={36} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} aria-hidden="true" />
          <p className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            No running schemes match your filters
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {applicationsOpen
              ? "No schemes have an open application window right now in this category. Try removing the \"Applications open\" filter."
              : "Try selecting a different category."}
          </p>
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setApplicationsOpen(false);
            }}
            className="mt-1 rounded-lg px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {schemes.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              showStatusBadge
            />
          ))}
        </div>
      )}
    </div>
  );
}
