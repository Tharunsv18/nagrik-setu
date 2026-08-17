import {
  Banknote,
  BarChart2,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle,
  GraduationCap,
  HeartPulse,
  Home,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Sprout,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { schemes } from "@/data/schemes";
import { SchemeCard } from "@/components/scheme/SchemeCard";
import { RunningSchemesList } from "@/components/scheme/RunningSchemesList";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getSchemes } from "@/lib/mockApi";

// ── Category filter config ───────────────────────────────────────────────────
const CATEGORY_FILTERS = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "agriculture", label: "Agriculture", icon: Sprout },
  { id: "housing", label: "Housing", icon: Home },
  { id: "health", label: "Healthcare", icon: HeartPulse },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "employment", label: "Employment", icon: BriefcaseBusiness },
  { id: "financial-inclusion", label: "Financial", icon: Banknote },
  { id: "women-child", label: "Social", icon: Users },
] as const;

type FilterId = (typeof CATEGORY_FILTERS)[number]["id"];

// ── Sub-nav tabs ─────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: "discover",      label: "Discover Schemes",      icon: Search,        to: "/" },
  { id: "running",       label: "Running Now",            icon: Zap,           to: null },   // tab — no navigate
  { id: "eligibility",   label: "Check Eligibility",      icon: CheckCircle,   to: "/discover" },
  { id: "applications",  label: "My Applications",        icon: BarChart2,     to: "/dashboard" },
  { id: "services",      label: "Services",               icon: Building2,     to: "/services" },
] as const;

type TabId = (typeof NAV_TABS)[number]["id"];

// ── Derived stats from live data ─────────────────────────────────────────────
const totalSchemes = schemes.length;
const totalDepartments = new Set(schemes.map((s) => s.department)).size;

// ── Component ────────────────────────────────────────────────────────────────
export function LandingPage() {
  useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterId>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("discover");

  const { data: allSchemes, loading } = useAsyncData(getSchemes, []);

  const filtered = useMemo(() => {
    const items = allSchemes ?? [];
    return items
      .filter((s) => activeCategory === "all" ? true : s.category === activeCategory)
      .sort((a, b) => b.popularityScore - a.popularityScore);
  }, [allSchemes, activeCategory]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/schemes?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/schemes");
    }
  }

  function handleTabClick(tab: (typeof NAV_TABS)[number]) {
    if (tab.id === "running") {
      setActiveTab("running");
      return;
    }
    if (tab.id === "discover") {
      setActiveTab("discover");
      return;
    }
    if (tab.to) navigate(tab.to);
  }

  return (
    <div>
      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section
        className="hero-grid-bg relative pb-10 pt-12"
        style={{ background: "var(--header-bg)" }}
      >
        <div className="container-shell">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38 }}
          >
            {/* Eyebrow */}
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
              Government of India · Digital India
            </p>

            {/* Headline */}
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-[3.2rem]">
              Find schemes you qualify for&nbsp;—{" "}
              <span style={{ color: "var(--accent)" }}>instantly.</span>
            </h1>

            {/* Subtext */}
            <p className="mt-4 max-w-xl text-base leading-7" style={{ color: "rgba(255,255,255,0.65)" }}>
              Search across {totalSchemes}+ central and state government schemes, check your
              eligibility in minutes, and track your applications — all in one place.
            </p>

            {/* Search bar */}
            <form
              className="mt-7 flex max-w-2xl items-stretch gap-0 overflow-hidden rounded-xl bg-white shadow-soft"
              onSubmit={handleSearch}
              role="search"
            >
              <span className="grid place-items-center pl-4" aria-hidden="true">
                <Search size={18} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
              </span>
              <input
                id="hero-search"
                type="search"
                className="flex-1 bg-transparent px-3 py-3.5 text-sm focus:outline-none"
                style={{ color: "var(--foreground)" }}
                placeholder="Search by scheme name, benefit, or keyword…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search schemes"
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-r-xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                <Search size={16} aria-hidden="true" />
                Search
              </button>
            </form>

            {/* Stats row */}
            <div className="mt-8 flex flex-wrap gap-8">
              {[
                { value: `${totalSchemes}+`, label: "Schemes Available" },
                { value: "1.2 Cr+", label: "Citizens Benefited (illustrative)" },
                { value: `${totalDepartments}+`, label: "Departments Covered" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-3xl font-extrabold text-white">{value}</div>
                  <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Sub-nav Tabs ──────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-white shadow-sm">
        <div className="container-shell">
          <nav
            className="flex items-stretch gap-0 overflow-x-auto scrollbar-thin"
            aria-label="Section navigation"
          >
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  className={`flex cursor-pointer items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "border-accent text-accent"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  style={isActive && tab.id === "running" ? { borderColor: "#065f46", color: "#065f46" } : {}}
                >
                  <Icon aria-hidden="true" size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ── Discovery Content ─────────────────────────────────────────────── */}
      <section className="container-shell py-8">
        <AnimatePresence mode="wait">

          {/* ── Tab: Discover Schemes ────────────────────────────────────── */}
          {activeTab === "discover" && (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Category filter row */}
              <div className="mb-6">
                <p
                  className="mb-3 text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Browse by Category
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Pills */}
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_FILTERS.map(({ id, label, icon: Icon }) => {
                      const isActive = activeCategory === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActiveCategory(id as FilterId)}
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

                  {/* Count + More Filters */}
                  <div className="flex items-center gap-3">
                    {!loading && (
                      <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                        {filtered.length} scheme{filtered.length !== 1 ? "s" : ""} found
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowFilters((v) => !v)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold transition hover:bg-muted"
                      style={{ color: "var(--primary)" }}
                    >
                      <SlidersHorizontal aria-hidden="true" size={14} />
                      More Filters
                    </button>
                  </div>
                </div>

                {/* Inline filter panel */}
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-border bg-white p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--muted-foreground)" }}>
                      <SlidersHorizontal aria-hidden="true" size={15} />
                      Advanced Filters
                    </div>
                    <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                      For full filtering (department, level, sort, and keyword search), use the{" "}
                      <a
                        href="/schemes"
                        onClick={(e) => { e.preventDefault(); navigate("/schemes"); }}
                        className="font-semibold underline"
                        style={{ color: "var(--primary)" }}
                      >
                        Browse All Schemes
                      </a>{" "}
                      page.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Scheme cards grid */}
              {loading ? (
                <LoadingSkeleton rows={6} />
              ) : (
                <>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.slice(0, 9).map((scheme) => (
                      <SchemeCard key={scheme.id} scheme={scheme} />
                    ))}
                  </div>

                  {filtered.length > 9 && (
                    <div className="mt-8 text-center">
                      <a
                        href="/schemes"
                        onClick={(e) => { e.preventDefault(); navigate("/schemes"); }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 px-6 py-2.5 text-sm font-bold transition hover:text-white"
                        style={{
                          borderColor: "var(--primary)",
                          color: "var(--primary)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = "var(--primary)";
                          (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.background = "";
                          (e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)";
                        }}
                      >
                        <BookOpen aria-hidden="true" size={16} />
                        View all {filtered.length} schemes
                      </a>
                    </div>
                  )}

                  {filtered.length === 0 && (
                    <div className="rounded-xl border border-border bg-white p-10 text-center">
                      <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                        No schemes found for this category.
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── Tab: Running Now ─────────────────────────────────────────── */}
          {activeTab === "running" && (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Section header */}
              <div className="mb-5">
                <p
                  className="mb-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Currently Active
                </p>
                <h2 className="text-xl font-extrabold" style={{ color: "var(--foreground)" }}>
                  All Running Schemes
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Every scheme with <strong>status = Active</strong> right now. Does not include
                  expired, future, or unverified records. Filter by category or narrow to schemes
                  with an open application window today.
                </p>
              </div>

              <RunningSchemesList />
            </motion.div>
          )}

        </AnimatePresence>
      </section>
    </div>
  );
}
