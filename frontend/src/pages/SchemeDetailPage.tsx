import { Bookmark, BookmarkCheck, CheckCircle2, ExternalLink, FileCheck2, MapPin, MinusCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Modal } from "@/components/ui/Modal";
import { SchemeCard } from "@/components/scheme/SchemeCard";
import { categoryLabels } from "@/data/options";
import { getStateTranslationKey } from "@/data/locations";
import { daysUntil, formatDate, getEligibilityChecklist } from "@/lib/eligibility";
import { getRelatedSchemes, getSchemeById } from "@/lib/mockApi";
import { useAppState } from "@/context/AppStateContext";
import { useAsyncData } from "@/hooks/useAsyncData";

export function SchemeDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    profile,
    signedIn,
    savedSchemeIds,
    toggleSavedScheme,
    addApplication,
    showToast,
    openAuthDialog,
  } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [documentState, setDocumentState] = useState<Record<string, boolean>>({});

  const { data: scheme, loading, error, retry } = useAsyncData(() => getSchemeById(id ?? ""), [id]);
  const related = useAsyncData(() => (scheme ? getRelatedSchemes(scheme) : Promise.resolve([])), [scheme?.id]);

  useEffect(() => {
    if (!scheme) return;
    setDocumentState(
      Object.fromEntries(scheme.documentsRequired.map((document) => [document, false])),
    );
  }, [scheme]);

  if (loading) {
    return (
      <section className="container-shell py-8">
        <LoadingSkeleton rows={4} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-shell py-8">
        <ErrorState message={error} onRetry={retry} />
      </section>
    );
  }

  if (!scheme) {
    return (
      <section className="container-shell py-8">
        <EmptyState
          title="Scheme not found"
          description="The scheme link may be outdated or mistyped."
          actionLabel={t("landing.browseCta")}
          actionTo="/schemes"
        />
      </section>
    );
  }

  const saved = savedSchemeIds.includes(scheme.id);
  const schemeState = scheme.state
    ? t(getStateTranslationKey(scheme.state), { defaultValue: scheme.state })
    : t("schemes.state");
  const checklist = getEligibilityChecklist(scheme.eligibility, {
    formatStateName: (state) => t(getStateTranslationKey(state), { defaultValue: state }),
  });
  const deadlineDays = daysUntil(scheme.deadline);
  const deadlineSoon = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 60;
  const onlineCapable = scheme.applicationMode === "online" || scheme.applicationMode === "both";

  async function confirmApplication() {
    if (!scheme) return;
    if (!signedIn) {
      setModalOpen(false);
      openAuthDialog();
      return;
    }

    const application = await addApplication(scheme.id);
    setModalOpen(false);
    showToast(t("detail.created", { ref: application.referenceNumber }));
    navigate("/dashboard");
  }

  const applySteps =
    scheme.applicationMode === "offline"
      ? [
          "Confirm eligibility and collect the documents listed on this page.",
          "Visit the nearest department office, panchayat office, bank branch, or common service center.",
          "Submit the form and documents, then keep the acknowledgement number.",
          "Track status through the dashboard when the reference is available.",
        ]
      : scheme.applicationMode === "online"
        ? [
            "Start the application and review the pre-filled scheme summary.",
            "Upload or confirm the required documents.",
            "Submit the application and save the generated reference number.",
            "Track department updates from the dashboard.",
          ]
        : [
            "Choose online submission or assisted offline submission.",
            "Prepare the documents listed on this page.",
            "Submit through the selected channel and collect the reference number.",
            "Track updates from the dashboard and raise a grievance if delayed.",
          ];

  return (
    <div>
      <section className="border-b border-border bg-white">
        <div className="container-shell py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={scheme.level === "central" ? "primary" : "accent"}>
                  {scheme.level === "central" ? t("schemes.central") : schemeState}
                </Badge>
                <Badge>{categoryLabels[scheme.category]}</Badge>
                <Badge>{scheme.department}</Badge>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight sm:text-4xl">{scheme.name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{scheme.longDescription}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={saved ? "primary" : "outline"}
                onClick={() => toggleSavedScheme(scheme.id)}
                aria-pressed={saved}
              >
                {saved ? <BookmarkCheck aria-hidden="true" size={18} /> : <Bookmark aria-hidden="true" size={18} />}
                {saved ? t("common.saved") : t("common.save")}
              </Button>
              {onlineCapable ? (
                <Button onClick={() => setModalOpen(true)}>{t("common.applyNow")}</Button>
              ) : (
                <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 font-semibold text-primary-foreground" href="#offline-process">
                  <MapPin aria-hidden="true" size={18} />
                  Offline process
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("detail.atGlance")}</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t("common.benefits")}</p>
                <p className="mt-1 font-bold text-primary">{scheme.benefits.summary}</p>
                {scheme.benefits.amount ? <p className="mt-1 text-sm">{scheme.benefits.amount}</p> : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t("common.deadline")}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{formatDate(scheme.deadline)}</span>
                  {deadlineSoon ? <Badge tone="warning">{deadlineDays} days left</Badge> : null}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Application mode</p>
                <p className="mt-1 font-semibold">{t(`schemes.${scheme.applicationMode}`)}</p>
              </div>
              {scheme.officialLink ? (
                <a
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  href={scheme.officialLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Official portal
                  <ExternalLink aria-hidden="true" size={16} />
                </a>
              ) : null}
            </CardBody>
          </Card>

          {scheme.applicationMode === "offline" ? (
            <Card id="offline-process">
              <CardBody>
                <div className="flex items-start gap-3">
                  <MapPin aria-hidden="true" className="mt-1 text-primary" size={22} />
                  <p className="text-sm leading-6">{t("detail.offlineInfo")}</p>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold">{t("detail.eligible")}</h2>
                {!profile ? (
                  <ButtonLink to="/discover" variant="outline">
                    {t("detail.runCheck")}
                  </ButtonLink>
                ) : null}
              </div>
            </CardHeader>
            <CardBody>
              <ul className="grid gap-3">
                {checklist.map((row) => {
                  const result = profile && row.test ? row.test(profile) : null;
                  const Icon = result === true ? CheckCircle2 : result === false ? XCircle : MinusCircle;
                  return (
                    <li key={row.key} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <Icon
                        aria-hidden="true"
                        className={result === true ? "text-success" : result === false ? "text-danger" : "text-muted-foreground"}
                        size={20}
                      />
                      <span className="text-sm leading-6">{row.label}</span>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("detail.documentsRequired")}</h2>
            </CardHeader>
            <CardBody>
              <ul className="grid gap-3">
                {scheme.documentsRequired.map((document) => (
                  <li key={document} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2 font-semibold">
                      <FileCheck2 aria-hidden="true" className="text-primary" size={19} />
                      {document}
                    </span>
                    <Button
                      variant={documentState[document] ? "primary" : "outline"}
                      onClick={() => setDocumentState((current) => ({ ...current, [document]: !current[document] }))}
                      aria-pressed={documentState[document]}
                    >
                      {documentState[document] ? t("detail.haveThis") : t("detail.needThis")}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("detail.howApply")}</h2>
            </CardHeader>
            <CardBody>
              <ol className="grid gap-3">
                {applySteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold text-primary">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-6">{step}</p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="container-shell pb-10">
        <h2 className="text-2xl font-bold">{t("detail.related")}</h2>
        {related.loading ? <LoadingSkeleton rows={2} className="mt-4" /> : null}
        {related.data?.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {related.data.map((item) => (
              <SchemeCard key={item.id} scheme={item} />
            ))}
          </div>
        ) : null}
      </section>

      <Modal open={modalOpen} title={t("detail.startTitle")} onClose={() => setModalOpen(false)}>
        <p className="text-sm leading-6 text-muted-foreground">{t("detail.startBody", { name: scheme.name })}</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            {t("common.back")}
          </Button>
          <Button onClick={confirmApplication}>{t("detail.confirm")}</Button>
        </div>
      </Modal>
    </div>
  );
}
