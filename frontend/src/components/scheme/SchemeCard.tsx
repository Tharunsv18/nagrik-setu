import { ArrowRight, Bookmark, BookmarkCheck, CalendarCheck, CalendarOff, Clock, MapPin, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getStateTranslationKey } from "@/data/locations";
import type { Scheme, SchemeMatch } from "@/types";
import { useAppState } from "@/context/AppStateContext";

// ── Category → tag style ──────────────────────────────────────────────────
const CATEGORY_TAG_CLASS: Record<string, string> = {
  agriculture: "tag-green",
  education: "tag-blue",
  health: "tag-pink",
  housing: "tag-blue",
  employment: "tag-teal",
  "women-child": "tag-pink",
  "senior-citizen": "tag-purple",
  disability: "tag-purple",
  minority: "tag-yellow",
  business: "tag-teal",
  "financial-inclusion": "tag-green",
  pension: "tag-purple",
};

const CATEGORY_LABEL: Record<string, string> = {
  agriculture: "Agriculture",
  education: "Education",
  health: "Healthcare",
  housing: "Housing",
  employment: "Employment",
  "women-child": "Women & Child",
  "senior-citizen": "Senior Citizen",
  disability: "Disability",
  minority: "Minority",
  business: "Business",
  "financial-inclusion": "Financial",
  pension: "Pension",
};

/** True when scheme's legacy deadline field is within 30 days from today */
function isClosingSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

/**
 * Determine the application window state for Task 3 logic.
 *
 * Returns:
 *   "open"   → dates set and today is within window
 *   "future" → dates set but window hasn't started yet
 *   "closed" → dates set but window has ended
 *   "none"   → no dates set (ongoing scheme with no fixed window)
 */
export type WindowState = "open" | "future" | "closed" | "none";

export function getWindowState(scheme: Scheme): WindowState {
  const { applicationStartDate: start, applicationEndDate: end } = scheme;
  if (!start || !end) return "none";

  const today = new Date().toISOString().slice(0, 10);
  if (today >= start && today <= end) return "open";
  if (today < start) return "future";
  return "closed";
}

/** Format a date string like "2026-10-31" → "31 Oct 2026" */
function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Flatten eligibility criteria into human-readable pills */
function eligibilityPills(scheme: Scheme): string[] {
  const pills: string[] = [];
  const e = scheme.eligibility;
  if (e.minAge && e.maxAge) pills.push(`Age ${e.minAge}–${e.maxAge}`);
  else if (e.minAge) pills.push(`Age ${e.minAge}+`);
  else if (e.maxAge) pills.push(`Age up to ${e.maxAge}`);
  if (e.gender) pills.push(e.gender.charAt(0).toUpperCase() + e.gender.slice(1));
  if (e.incomeCeiling) pills.push(`Income ≤ ₹${(e.incomeCeiling / 100000).toFixed(1)}L`);
  if (e.socialCategories?.length) pills.push(e.socialCategories.slice(0, 2).join(", "));
  if (e.disabilityRequired) pills.push("Disability cert.");
  if (e.occupations?.length) pills.push(e.occupations[0]);
  (e.otherCriteria ?? []).slice(0, 1).forEach((c) => {
    const short = c.length > 30 ? c.slice(0, 28) + "…" : c;
    pills.push(short);
  });
  return pills;
}

// ── Component ─────────────────────────────────────────────────────────────
export function SchemeCard({
  scheme,
  match,
  /** When true, show the "Active" status badge prominently (for Running Schemes view) */
  showStatusBadge = false,
}: {
  scheme: Scheme;
  match?: SchemeMatch;
  showStatusBadge?: boolean;
}) {
  const { t } = useTranslation();
  const { savedSchemeIds, toggleSavedScheme } = useAppState();
  const saved = savedSchemeIds.includes(scheme.id);

  const tagClass = CATEGORY_TAG_CLASS[scheme.category] ?? "tag-blue";
  const categoryLabel = CATEGORY_LABEL[scheme.category] ?? scheme.category;
  const closing = isClosingSoon(scheme.deadline);
  const pills = eligibilityPills(scheme);
  const visiblePills = pills.slice(0, 3);
  const extraCount = pills.length - visiblePills.length;

  const schemeState = scheme.state
    ? t(getStateTranslationKey(scheme.state), { defaultValue: scheme.state })
    : null;

  // Benefit type label for second tag
  const benefitTypeLabel =
    scheme.benefits.amount
      ? scheme.benefits.amount.toLowerCase().includes("insurance") ||
        scheme.benefits.summary.toLowerCase().includes("insurance")
        ? "Insurance"
        : scheme.benefits.amount.toLowerCase().includes("loan")
        ? "Loan"
        : "Cash Benefit"
      : scheme.benefits.summary.toLowerCase().includes("subsid")
      ? "Subsidy"
      : "Service";

  const benefitTagClass =
    benefitTypeLabel === "Insurance"
      ? "tag-pink"
      : benefitTypeLabel === "Loan"
      ? "tag-teal"
      : benefitTypeLabel === "Subsidy"
      ? "tag-blue"
      : benefitTypeLabel === "Cash Benefit"
      ? "tag-green"
      : "tag-purple";

  // ── Task 3: Application window display ────────────────────────────────────
  const windowState = getWindowState(scheme);

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-white transition hover:shadow-soft hover:-translate-y-0.5">
      <div className="flex flex-1 flex-col p-5">

        {/* Top row: tags + bookmark */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tagClass}`}>
              {categoryLabel}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${benefitTagClass}`}>
              {benefitTypeLabel}
            </span>
            {/* "Active" badge — only in Running Schemes view */}
            {showStatusBadge && (scheme.status === "CURRENT" || !scheme.status) && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: "#d1fae5", color: "#065f46" }}
              >
                <Zap aria-hidden="true" size={9} />
                Active
              </span>
            )}
            {closing && (
              <span className="tag-closing inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                <Clock aria-hidden="true" size={10} />
                Closing Soon
              </span>
            )}
          </div>

          {/* Star rating + bookmark */}
          <div className="flex shrink-0 items-center gap-2">
            {scheme.rating != null && (
              <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color: "var(--accent)" }}>
                <Star aria-hidden="true" size={12} fill="currentColor" />
                {scheme.rating.toFixed(1)}
              </span>
            )}
            <button
              type="button"
              onClick={() => toggleSavedScheme(scheme.id)}
              aria-pressed={saved}
              aria-label={saved ? `Saved: ${scheme.name}` : `Save ${scheme.name}`}
              title={saved ? t("common.saved") : t("common.save")}
              className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-muted"
              style={{ color: saved ? "var(--accent)" : "var(--muted-foreground)" }}
            >
              {saved
                ? <BookmarkCheck aria-hidden="true" size={15} />
                : <Bookmark aria-hidden="true" size={15} />}
            </button>
          </div>
        </div>

        {/* Title + department */}
        <Link to={`/schemes/${scheme.id}`} className="mt-3 block rounded-md">
          <h3 className="text-base font-bold leading-snug hover:underline" style={{ color: "var(--foreground)" }}>
            {scheme.name}
          </h3>
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
          {scheme.department}
        </p>

        {/* Benefit amount (amber) */}
        {(scheme.benefits.amount || scheme.benefits.summary) && (
          <p className="mt-3 text-sm font-bold" style={{ color: "var(--accent)" }}>
            {scheme.benefits.amount ?? scheme.benefits.summary}
          </p>
        )}

        {/* ── Task 3: Application window status row ─────────────────────── */}
        <div className="mt-3">
          {windowState === "open" && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{ background: "#d1fae5", color: "#065f46" }}
            >
              <CalendarCheck aria-hidden="true" size={11} />
              Applications open
              {scheme.applicationEndDate && (
                <span className="font-medium opacity-80">· closes {fmtDate(scheme.applicationEndDate)}</span>
              )}
            </span>
          )}
          {windowState === "future" && scheme.applicationStartDate && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: "#eff6ff", color: "#1d4ed8" }}
            >
              <CalendarOff aria-hidden="true" size={11} />
              Opens {fmtDate(scheme.applicationStartDate)}
            </span>
          )}
          {windowState === "closed" && scheme.applicationEndDate && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: "#fef3c7", color: "#92400e" }}
            >
              <CalendarOff aria-hidden="true" size={11} />
              Window closed {fmtDate(scheme.applicationEndDate)}
            </span>
          )}
          {/* windowState === "none" → no date row, just "Active" badge above is enough */}
        </div>

        {/* Eligibility pills */}
        {visiblePills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visiblePills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {pill}
              </span>
            ))}
            {extraCount > 0 && (
              <Link
                to={`/schemes/${scheme.id}`}
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold underline"
                style={{ color: "var(--primary)" }}
              >
                +{extraCount} more
              </Link>
            )}
          </div>
        )}

        {/* Match strength badge (only in matched mode) */}
        {match && match.strength !== "general" && (
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                match.strength === "strong" ? "tag-green" : "tag-yellow"
              }`}
            >
              {match.strength === "strong" ? "Strong match" : "Partial match"}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom row: scope + view details */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            <MapPin aria-hidden="true" size={12} />
            {schemeState ?? "All India"}
          </span>
          <Link
            to={`/schemes/${scheme.id}`}
            className="inline-flex items-center gap-1 text-sm font-bold transition hover:gap-1.5"
            style={{ color: "var(--primary)" }}
          >
            View Details
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
