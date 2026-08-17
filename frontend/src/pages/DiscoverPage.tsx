import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { SchemeResults } from "@/components/scheme/SchemeResults";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { educationLevels, occupations, socialCategories, states } from "@/data/options";
import { getDistrictsForState, getStateTranslationKey } from "@/data/locations";
import { useAppState } from "@/context/AppStateContext";
import type { CitizenProfile } from "@/types";

const incomeRanges = [
  { label: "Below Rs. 50,000", value: 50000 },
  { label: "Rs. 50,000 - 1.5 lakh", value: 150000 },
  { label: "Rs. 1.5 - 3 lakh", value: 300000 },
  { label: "Rs. 3 - 6 lakh", value: 600000 },
  { label: "Above Rs. 6 lakh", value: 1000000 },
];

function OptionButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
        selected ? "border-primary bg-[#e4f5f3] text-[#064e48]" : "border-border bg-white hover:bg-muted"
      }`}
      aria-pressed={selected}
    >
      <span className="inline-flex items-center gap-2">
        {selected ? <Check aria-hidden="true" size={16} /> : null}
        {children}
      </span>
    </button>
  );
}

export function DiscoverPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, setProfile } = useAppState();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CitizenProfile>(profile ?? {});
  const showResults = searchParams.get("results") === "1" && profile;
  const districtOptions = getDistrictsForState(draft.state);

  const steps = useMemo(
    () => [
      {
        title: t("discover.whereLive"),
        body: (
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">{t("discover.stateLabel")}</span>
              <select
                className="form-control"
                value={draft.state ?? ""}
                onChange={(event) => {
                  const state = event.target.value || undefined;
                  setDraft((current) => ({ ...current, state, district: undefined }));
                }}
              >
                <option value="">{t("discover.selectState")}</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {t(getStateTranslationKey(state), { defaultValue: state })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">{t("discover.districtLabel")}</span>
              <select
                className="form-control"
                value={draft.district ?? ""}
                disabled={!draft.state}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    district: event.target.value || undefined,
                  }))
                }
              >
                <option value="">
                  {draft.state ? t("discover.selectDistrict") : t("discover.districtHelp")}
                </option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ),
      },
      {
        title: "Age and gender",
        body: (
          <div className="grid gap-4">
            <label>
              <span className="mb-2 block text-sm font-semibold">Age</span>
              <input
                className="form-control max-w-xs"
                type="number"
                min={0}
                max={120}
                value={draft.age ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    age: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["female", "male", "other"] as const).map((gender) => (
                <OptionButton
                  key={gender}
                  selected={draft.gender === gender}
                  onClick={() => setDraft((current) => ({ ...current, gender }))}
                >
                  {gender}
                </OptionButton>
              ))}
            </div>
          </div>
        ),
      },
      {
        title: "Occupation",
        body: (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {occupations.map((occupation) => (
              <OptionButton
                key={occupation.value}
                selected={draft.occupation === occupation.value}
                onClick={() => setDraft((current) => ({ ...current, occupation: occupation.value }))}
              >
                {occupation.label}
              </OptionButton>
            ))}
          </div>
        ),
      },
      {
        title: "Annual household income",
        body: (
          <div className="grid gap-2 sm:grid-cols-2">
            {incomeRanges.map((range) => (
              <OptionButton
                key={range.value}
                selected={draft.annualIncome === range.value}
                onClick={() => setDraft((current) => ({ ...current, annualIncome: range.value }))}
              >
                {range.label}
              </OptionButton>
            ))}
          </div>
        ),
      },
      {
        title: "Community and disability status",
        body: (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {socialCategories.map((category) => (
                <OptionButton
                  key={category}
                  selected={draft.socialCategory === category}
                  onClick={() => setDraft((current) => ({ ...current, socialCategory: category }))}
                >
                  {category}
                </OptionButton>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionButton
                selected={draft.disabilityStatus === true}
                onClick={() => setDraft((current) => ({ ...current, disabilityStatus: true }))}
              >
                Disability certificate available
              </OptionButton>
              <OptionButton
                selected={draft.disabilityStatus === false}
                onClick={() => setDraft((current) => ({ ...current, disabilityStatus: false }))}
              >
                No disability certificate
              </OptionButton>
            </div>
          </div>
        ),
      },
      {
        title: "Education and marital status",
        body: (
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {educationLevels.map((level) => (
                <OptionButton
                  key={level}
                  selected={draft.educationLevel === level}
                  onClick={() => setDraft((current) => ({ ...current, educationLevel: level }))}
                >
                  {level}
                </OptionButton>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {["single", "married", "widowed"].map((status) => (
                <OptionButton
                  key={status}
                  selected={draft.maritalStatus === status}
                  onClick={() => setDraft((current) => ({ ...current, maritalStatus: status }))}
                >
                  {status}
                </OptionButton>
              ))}
            </div>
          </div>
        ),
      },
    ],
    [districtOptions, draft, t],
  );

  function goNext() {
    if (step === steps.length - 1) {
      setProfile(draft);
      navigate("/discover?results=1");
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  if (showResults) {
    return (
      <div>
        <PageHeader
          title={t("discover.resultsTitle")}
          description="Schemes are ranked by how many known criteria match your answers."
          actions={
            <ButtonLink to="/discover" variant="outline">
              {t("discover.refine")}
            </ButtonLink>
          }
        />
        <section className="container-shell py-8">
          <SchemeResults mode="matched" profile={profile} />
        </section>
      </div>
    );
  }

  const current = steps[step];

  return (
    <div>
      <PageHeader title={t("discover.title")} description={t("discover.intro")} />
      <section className="container-shell py-8">
        <Card>
          <CardBody>
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-primary">
                  {t("discover.progress", { current: step + 1, total: steps.length })}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (step === steps.length - 1) {
                      setProfile(draft);
                      navigate("/discover?results=1");
                    } else {
                      setStep((currentStep) => currentStep + 1);
                    }
                  }}
                >
                  {t("discover.preferNot")}
                </Button>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold">{current.title}</h2>
            <div className="mt-5">{current.body}</div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))} disabled={step === 0}>
                <ArrowLeft aria-hidden="true" size={18} />
                {t("common.back")}
              </Button>
              <Button onClick={goNext}>
                {step === steps.length - 1 ? t("discover.seeMatches") : t("common.next")}
                <ArrowRight aria-hidden="true" size={18} />
              </Button>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
