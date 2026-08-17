import type { CitizenProfile, EligibilityCriteria, MatchStrength, Scheme, SchemeMatch } from "@/types";

interface EligibilityChecklistOptions {
  formatStateName?: (state: string) => string;
}

const hasValue = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null && value !== "";

export function formatCurrency(value?: number) {
  if (!hasValue(value)) return "";
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

export function formatDate(value?: string) {
  if (!value) return "Not specified";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function daysUntil(value?: string) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  const today = new Date();
  const ms = target.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function getEligibilityChecklist(
  criteria: EligibilityCriteria,
  options: EligibilityChecklistOptions = {},
) {
  const rows: Array<{ key: keyof EligibilityCriteria | string; label: string; test?: (profile: CitizenProfile) => boolean | null }> = [];
  const formatStateName = options.formatStateName ?? ((state: string) => state);

  if (hasValue(criteria.minAge) || hasValue(criteria.maxAge)) {
    const label =
      hasValue(criteria.minAge) && hasValue(criteria.maxAge)
        ? `Age ${criteria.minAge} to ${criteria.maxAge}`
        : hasValue(criteria.minAge)
          ? `Age ${criteria.minAge} or above`
          : `Age up to ${criteria.maxAge}`;
    rows.push({
      key: "age",
      label,
      test: (profile) => {
        if (!hasValue(profile.age)) return null;
        if (hasValue(criteria.minAge) && profile.age < criteria.minAge) return false;
        if (hasValue(criteria.maxAge) && profile.age > criteria.maxAge) return false;
        return true;
      },
    });
  }

  if (criteria.gender) {
    rows.push({
      key: "gender",
      label: `Gender: ${criteria.gender}`,
      test: (profile) => (profile.gender ? profile.gender === criteria.gender : null),
    });
  }

  if (hasValue(criteria.incomeCeiling)) {
    rows.push({
      key: "income",
      label: `Annual income up to ${formatCurrency(criteria.incomeCeiling)}`,
      test: (profile) => (hasValue(profile.annualIncome) ? profile.annualIncome <= criteria.incomeCeiling! : null),
    });
  }

  if (criteria.occupations?.length) {
    rows.push({
      key: "occupation",
      label: `Occupation: ${criteria.occupations.join(", ")}`,
      test: (profile) => (profile.occupation ? criteria.occupations!.includes(profile.occupation) : null),
    });
  }

  if (criteria.socialCategories?.length) {
    rows.push({
      key: "socialCategory",
      label: `Social category: ${criteria.socialCategories.join(", ")}`,
      test: (profile) =>
        profile.socialCategory ? criteria.socialCategories!.includes(profile.socialCategory) : null,
    });
  }

  if (criteria.disabilityRequired) {
    rows.push({
      key: "disabilityStatus",
      label: "Disability certificate required",
      test: (profile) => (hasValue(profile.disabilityStatus) ? profile.disabilityStatus : null),
    });
  }

  if (criteria.state) {
    rows.push({
      key: "state",
      label: `State: ${formatStateName(criteria.state)}`,
      test: (profile) => (profile.state ? profile.state === criteria.state : null),
    });
  }

  if (criteria.maritalStatus) {
    rows.push({
      key: "maritalStatus",
      label: `Marital status: ${criteria.maritalStatus}`,
      test: (profile) => (profile.maritalStatus ? profile.maritalStatus === criteria.maritalStatus : null),
    });
  }

  criteria.otherCriteria?.forEach((criterion, index) => {
    rows.push({ key: `other-${index}`, label: criterion });
  });

  return rows;
}

export function matchScheme(scheme: Scheme, profile: CitizenProfile): SchemeMatch {
  const checks = getEligibilityChecklist(scheme.eligibility)
    .map((row) => row.test?.(profile))
    .filter((value): value is boolean => typeof value === "boolean");

  const matched = checks.filter(Boolean).length;
  const known = checks.length;
  const dataCompleteness = Object.values(profile).filter((value) => value !== undefined && value !== "").length;
  const baseScore = known > 0 ? matched / known : dataCompleteness > 0 ? 0.55 : 0.45;
  const tagBoost =
    profile.occupation && scheme.tags.some((tag) => tag.toLowerCase().includes(profile.occupation ?? ""))
      ? 0.08
      : 0;
  const score = Math.min(1, baseScore + tagBoost);
  const strength: MatchStrength = score >= 0.78 ? "strong" : score >= 0.48 ? "partial" : "general";

  const reasons: string[] = [];
  if (scheme.eligibility.state && profile.state === scheme.eligibility.state) reasons.push("State match");
  if (scheme.eligibility.occupations?.includes(profile.occupation ?? "")) reasons.push("Occupation match");
  if (scheme.eligibility.socialCategories?.includes(profile.socialCategory ?? "")) reasons.push("Category match");
  if (scheme.eligibility.incomeCeiling && profile.annualIncome && profile.annualIncome <= scheme.eligibility.incomeCeiling) {
    reasons.push("Income within limit");
  }
  if (!reasons.length) reasons.push(strength === "general" ? "Broad eligibility" : "Some criteria match");

  return { scheme, score, strength, reasons };
}

export function matchAndSortSchemes(schemes: Scheme[], profile: CitizenProfile): SchemeMatch[] {
  return schemes
    .map((scheme) => matchScheme(scheme, profile))
    .filter((match) => match.score >= 0.4)
    .sort((a, b) => b.score - a.score || b.scheme.popularityScore - a.scheme.popularityScore);
}

export function applicationSteps(status: string) {
  const steps = ["Submitted", "Under Review", "Approved", "Disbursed"];
  if (status === "rejected") return ["Submitted", "Under Review", "Rejected"];
  if (status === "draft") return ["Draft", "Submitted", "Under Review", "Approved"];
  return steps;
}

export function grievanceSteps(status: string) {
  if (status === "resolved") return ["Open", "In Progress", "Resolved"];
  if (status === "escalated") return ["Open", "In Progress", "Escalated"];
  return ["Open", "In Progress", "Resolved"];
}
