import { FileUp, LogIn, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SchemeCard } from "@/components/scheme/SchemeCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Timeline } from "@/components/shared/Timeline";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { documentTypeOptions, getDocumentTypeOption, OTHER_DOCUMENT_TYPE_ID } from "@/data/documentTypes";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { applicationSteps, formatDate } from "@/lib/eligibility";
import { getSchemes, matchSchemes } from "@/lib/mockApi";
import { useAppState } from "@/context/AppStateContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { DocumentRecord } from "@/types";

const allowedDocumentExtensions = ["pdf", "jpg", "jpeg", "png"];
const allowedDocumentMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxDocumentSizeBytes = 5 * 1024 * 1024;
const documentInputAccept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export function DashboardPage() {
  const { t } = useTranslation();
  const {
    signedIn,
    openAuthDialog,
    applications,
    savedSchemeIds,
    toggleSavedScheme,
    documents,
    setDocumentFile,
    addDocumentFile,
    removeDocumentFile,
    profile,
    addApplication,
    showToast,
  } = useAppState();
  const [selectedApplicationId, setSelectedApplicationId] = useState(applications[0]?.id);
  const [documentType, setDocumentType] = useState("");
  const [otherDocumentLabel, setOtherDocumentLabel] = useState("");
  const [documentError, setDocumentError] = useState<string | null>(null);
  const schemesState = useAsyncData(getSchemes, []);
  const recommendations = useAsyncData(() => (profile ? matchSchemes(profile) : Promise.resolve([])), [JSON.stringify(profile ?? {})]);

  const schemesById = useMemo(() => {
    const map = new Map<string, string>();
    schemesState.data?.forEach((scheme) => map.set(scheme.id, scheme.name));
    return map;
  }, [schemesState.data]);

  const selectedApplication = applications.find((application) => application.id === selectedApplicationId) ?? applications[0];
  const savedSchemes = schemesState.data?.filter((scheme) => savedSchemeIds.includes(scheme.id)) ?? [];

  function documentLabel(document: DocumentRecord) {
    const option = getDocumentTypeOption(document.documentType);
    if (document.documentType === OTHER_DOCUMENT_TYPE_ID || !option) {
      return document.documentLabel ?? option?.fallbackLabel ?? document.documentType;
    }

    return t(option.labelKey, { defaultValue: option.fallbackLabel });
  }

  function validateDocumentFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedDocumentExtensions.includes(extension) || (file.type && !allowedDocumentMimeTypes.includes(file.type))) {
      return t("dashboard.invalidDocumentType");
    }

    if (file.size > maxDocumentSizeBytes) {
      return t("dashboard.documentTooLarge");
    }

    return null;
  }

  function uploadDocument(file: File | undefined, options: { replaceDocumentId?: string } = {}) {
    setDocumentError(null);

    if (!file) return;

    const validationError = validateDocumentFile(file);
    if (validationError) {
      setDocumentError(validationError);
      return;
    }

    if (options.replaceDocumentId) {
      setDocumentFile(options.replaceDocumentId, file.name);
      showToast(t("dashboard.documentUploaded", { name: file.name }));
      return;
    }

    if (!documentType) {
      setDocumentError(t("dashboard.selectDocumentFirst"));
      return;
    }

    if (documentType === OTHER_DOCUMENT_TYPE_ID && !otherDocumentLabel.trim()) {
      setDocumentError(t("dashboard.otherDocumentRequired"));
      return;
    }

    addDocumentFile(
      documentType,
      file.name,
      documentType === OTHER_DOCUMENT_TYPE_ID ? otherDocumentLabel.trim() : undefined,
    );
    setDocumentType("");
    setOtherDocumentLabel("");
    showToast(t("dashboard.documentUploaded", { name: file.name }));
  }

  if (!signedIn) {
    return (
      <div>
        <PageHeader title={t("dashboard.title")} />
        <section className="container-shell py-8">
          <Card>
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{t("dashboard.signinTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("dashboard.signinBody")}</p>
              </div>
              <Button onClick={openAuthDialog}>
                <LogIn aria-hidden="true" size={18} />
                {t("common.signIn")}
              </Button>
            </CardBody>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description="Review applications, saved schemes, documents, and recommendations." />
      <section className="container-shell grid gap-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("dashboard.myApplications")}</h2>
            </CardHeader>
            <CardBody>
              {schemesState.loading ? <LoadingSkeleton rows={2} /> : null}
              {schemesState.error ? <ErrorState message={schemesState.error} onRetry={schemesState.retry} /> : null}
              {!schemesState.loading && !applications.length ? (
                <EmptyState
                  title={t("dashboard.noApplications")}
                  description="Start with scheme discovery to create your first application."
                  actionLabel={t("landing.findCta")}
                  actionTo="/discover"
                />
              ) : null}
              <div className="grid gap-3">
                {applications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedApplication?.id === application.id
                        ? "border-primary bg-[#e4f5f3]"
                        : "border-border bg-white hover:bg-muted"
                    }`}
                    onClick={() => setSelectedApplicationId(application.id)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-bold">{schemesById.get(application.schemeId) ?? application.schemeId}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{application.referenceNumber}</p>
                      </div>
                      <StatusPill status={application.status} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">Last updated {formatDate(application.lastUpdated)}</p>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {selectedApplication ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{schemesById.get(selectedApplication.schemeId) ?? selectedApplication.schemeId}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedApplication.referenceNumber}</p>
                  </div>
                  <StatusPill status={selectedApplication.status} />
                </div>
              </CardHeader>
              <CardBody>
                <Timeline
                  entries={selectedApplication.timeline}
                  expectedSteps={applicationSteps(selectedApplication.status)}
                  currentLabel={t("dashboard.currentStage")}
                />
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("dashboard.savedSchemes")}</h2>
            </CardHeader>
            <CardBody>
              {!savedSchemes.length ? (
                <EmptyState
                  title={t("dashboard.noSaved")}
                  description="Use the bookmark button on scheme cards to keep options here."
                  actionLabel={t("landing.browseCta")}
                  actionTo="/schemes"
                />
              ) : (
                <div className="grid gap-3">
                  {savedSchemes.map((scheme) => (
                    <div key={scheme.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link to={`/schemes/${scheme.id}`} className="font-bold hover:text-primary">
                            {scheme.name}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">{scheme.department}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSavedScheme(scheme.id)}
                          aria-label={`${t("common.remove")} ${scheme.name}`}
                          title={t("common.remove")}
                        >
                          <Trash2 aria-hidden="true" size={18} />
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          onClick={async () => {
                            const application = await addApplication(scheme.id);
                            showToast(t("detail.created", { ref: application.referenceNumber }));
                          }}
                          variant="secondary"
                        >
                          {t("common.apply")}
                        </Button>
                        <ButtonLink to={`/schemes/${scheme.id}`} variant="outline">
                          {t("schemes.viewDetails")}
                        </ButtonLink>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("dashboard.myDocuments")}</h2>
            </CardHeader>
            <CardBody>
              <div className="mb-4 rounded-lg border border-border p-3">
                <label>
                  <span className="mb-2 block text-sm font-semibold">{t("dashboard.documentType")}</span>
                  <select
                    className="form-control"
                    value={documentType}
                    onChange={(event) => {
                      setDocumentType(event.target.value);
                      setDocumentError(null);
                    }}
                  >
                    <option value="">{t("dashboard.selectDocument")}</option>
                    {documentTypeOptions.map((document) => (
                      <option key={document.id} value={document.id}>
                        {t(document.labelKey, { defaultValue: document.fallbackLabel })}
                      </option>
                    ))}
                  </select>
                </label>
                {documentType === OTHER_DOCUMENT_TYPE_ID ? (
                  <label className="mt-3 block">
                    <span className="mb-2 block text-sm font-semibold">{t("dashboard.otherDocumentLabel")}</span>
                    <input
                      className="form-control"
                      value={otherDocumentLabel}
                      onChange={(event) => setOtherDocumentLabel(event.target.value)}
                    />
                  </label>
                ) : null}
                <input
                  className="mt-3 block w-full text-sm"
                  type="file"
                  accept={documentInputAccept}
                  disabled={!documentType || (documentType === OTHER_DOCUMENT_TYPE_ID && !otherDocumentLabel.trim())}
                  aria-label={t("dashboard.upload")}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    uploadDocument(file);
                    event.currentTarget.value = "";
                  }}
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("dashboard.uploadHint")}</p>
                {documentError ? (
                  <p className="mt-2 text-sm font-semibold text-danger" role="alert">
                    {documentError}
                  </p>
                ) : null}
              </div>
              {!documents.length ? (
                <EmptyState
                  title={t("dashboard.noDocuments")}
                  description={t("dashboard.noDocumentsBody")}
                />
              ) : null}
              <div className="grid gap-3">
                {documents.map((document) => (
                  <div key={document.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          <FileUp aria-hidden="true" size={18} className="text-primary" />
                          {documentLabel(document)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{document.fileName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("dashboard.uploadedAt", { date: formatDate(document.uploadedAt) })}
                        </p>
                      </div>
                      <Badge tone="success">{t("dashboard.uploadedStatus")}</Badge>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <input
                        className="block w-full text-sm"
                        type="file"
                        accept={documentInputAccept}
                        aria-label={`${t("dashboard.replaceDocument")} ${documentLabel(document)}`}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          uploadDocument(file, { replaceDocumentId: document.id });
                          event.currentTarget.value = "";
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDocumentFile(document.id)}
                        aria-label={`${t("dashboard.deleteDocument")} ${documentLabel(document)}`}
                        title={t("dashboard.deleteDocument")}
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="container-shell pb-10">
        <h2 className="text-2xl font-bold">{t("dashboard.recommended")}</h2>
        {!profile ? (
          <EmptyState
            title="No profile answers yet"
            description="Complete scheme discovery to get personalized recommendations."
            actionLabel={t("landing.findCta")}
            actionTo="/discover"
          />
        ) : recommendations.loading ? (
          <LoadingSkeleton rows={2} className="mt-4" />
        ) : recommendations.error ? (
          <ErrorState message={recommendations.error} onRetry={recommendations.retry} />
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {recommendations.data?.slice(0, 4).map((match) => (
              <SchemeCard key={match.scheme.id} scheme={match.scheme} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
