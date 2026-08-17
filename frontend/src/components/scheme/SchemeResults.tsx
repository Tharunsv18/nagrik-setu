import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { categoryLabels, schemeCategories } from "@/data/options";
import { getPopularSchemes, getSchemes, matchSchemes } from "@/lib/mockApi";
import type { CitizenProfile, Scheme, SchemeMatch } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAsyncData } from "@/hooks/useAsyncData";
import { SchemeCard } from "./SchemeCard";

type ResultItem = SchemeMatch | { scheme: Scheme; score: number; strength: "general"; reasons: string[] };

export function SchemeResults({
  mode,
  profile,
}: {
  mode: "browse" | "matched";
  profile?: CitizenProfile | null;
}) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "all");
  const [department, setDepartment] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState(mode === "matched" ? "relevance" : "popular");
  const profileKey = JSON.stringify(profile ?? {});

  const { data, loading, error, retry } = useAsyncData<ResultItem[]>(
    async () => {
      if (mode === "matched" && profile) return matchSchemes(profile);
      const all = await getSchemes();
      return all.map((scheme) => ({ scheme, score: 0, strength: "general", reasons: [] }));
    },
    [mode, profileKey],
  );

  const fallback = useAsyncData(getPopularSchemes, []);

  const departments = useMemo(() => {
    const source = data?.map((item) => item.scheme) ?? [];
    return [...new Set(source.map((scheme) => scheme.department))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    const lowered = search.toLowerCase();
    const items = data ?? [];
    return items
      .filter(({ scheme }) => {
        const matchesSearch =
          !lowered ||
          scheme.name.toLowerCase().includes(lowered) ||
          scheme.department.toLowerCase().includes(lowered) ||
          scheme.tags.some((tag) => tag.toLowerCase().includes(lowered));
        const matchesCategory = category === "all" || scheme.category === category;
        const matchesDepartment = department === "all" || scheme.department === department;
        const matchesLevel = level === "all" || scheme.level === level;
        return matchesSearch && matchesCategory && matchesDepartment && matchesLevel;
      })
      .sort((a, b) => {
        if (sort === "newest") return b.scheme.launchedYear - a.scheme.launchedYear;
        if (sort === "popular") return b.scheme.popularityScore - a.scheme.popularityScore;
        return b.score - a.score || b.scheme.popularityScore - a.scheme.popularityScore;
      });
  }, [category, data, department, level, search, sort]);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error} onRetry={retry} />;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <SlidersHorizontal aria-hidden="true" size={17} />
          {t("common.filter")}
        </div>
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <label className="relative">
            <span className="sr-only">{t("common.search")}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" size={17} />
            <input
              className="form-control pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("discover.searchPlaceholder")}
            />
          </label>
          <select className="form-control" value={category} onChange={(event) => setCategory(event.target.value)} aria-label={t("common.category")}>
            <option value="all">{t("schemes.allCategories")}</option>
            {schemeCategories.map((item) => (
              <option key={item} value={item}>
                {categoryLabels[item]}
              </option>
            ))}
          </select>
          <select className="form-control" value={department} onChange={(event) => setDepartment(event.target.value)} aria-label={t("common.department")}>
            <option value="all">{t("schemes.allDepartments")}</option>
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select className="form-control" value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Scheme level">
            <option value="all">{t("schemes.allLevels")}</option>
            <option value="central">{t("schemes.central")}</option>
            <option value="state">{t("schemes.state")}</option>
          </select>
          <select className="form-control" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort schemes">
            <option value="relevance">{t("schemes.relevance")}</option>
            <option value="newest">{t("schemes.newest")}</option>
            <option value="popular">{t("schemes.popular")}</option>
          </select>
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <SchemeCard key={item.scheme.id} scheme={item.scheme} match={mode === "matched" ? item : undefined} />
          ))}
        </div>
      ) : mode === "matched" ? (
        <div className="space-y-4">
          <EmptyState
            title={t("discover.noMatches")}
            description={t("discover.fallback")}
            actionLabel={t("discover.refine")}
            actionTo="/discover"
          />
          {fallback.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {fallback.data.map((scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="No schemes found"
          description="Try a different search term or remove one filter."
          actionLabel={t("common.findSchemes")}
          actionTo="/discover"
        />
      )}
    </div>
  );
}
