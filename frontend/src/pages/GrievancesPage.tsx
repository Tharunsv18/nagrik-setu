import { MessageSquarePlus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/eligibility";
import { getSchemes } from "@/lib/mockApi";
import { useAppState } from "@/context/AppStateContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { GrievanceStatus } from "@/types";

const statuses: Array<"all" | GrievanceStatus> = ["all", "open", "in-progress", "resolved", "escalated"];

export function GrievancesPage() {
  const { t } = useTranslation();
  const { signedIn, openAuthDialog, grievances } = useAppState();
  const [status, setStatus] = useState<"all" | GrievanceStatus>("all");
  const schemesState = useAsyncData(getSchemes, []);

  const schemeNames = useMemo(() => {
    const map = new Map<string, string>();
    schemesState.data?.forEach((scheme) => map.set(scheme.id, scheme.name));
    return map;
  }, [schemesState.data]);

  const visible = grievances.filter((item) => status === "all" || item.status === status);

  if (!signedIn) {
    return (
      <div>
        <PageHeader title={t("grievance.title")} />
        <section className="container-shell py-8">
          <Card>
            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{t("dashboard.signinTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("dashboard.signinBody")}</p>
              </div>
              <Button onClick={openAuthDialog}>{t("common.signIn")}</Button>
            </CardBody>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("grievance.title")}
        description="View and follow up on department responses."
        actions={
          <ButtonLink to="/grievances/new">
            <MessageSquarePlus aria-hidden="true" size={18} />
            {t("grievance.new")}
          </ButtonLink>
        }
      />
      <section className="container-shell py-8">
        <div className="mb-5 rounded-lg border border-border bg-white p-4">
          <label className="flex flex-col gap-2 sm:max-w-xs">
            <span className="text-sm font-semibold">{t("grievance.filterStatus")}</span>
            <select className="form-control" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? t("grievance.all") : item.replace("-", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {schemesState.loading ? <LoadingSkeleton rows={2} /> : null}
        {schemesState.error ? <ErrorState message={schemesState.error} onRetry={schemesState.retry} /> : null}
        {!visible.length ? (
          <EmptyState
            title={t("grievance.noItems")}
            description="File a new grievance if an application or service issue needs department attention."
            actionLabel={t("grievance.new")}
            actionTo="/grievances/new"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((grievance) => {
              const lastResponse = grievance.responses[grievance.responses.length - 1];
              return (
                <Link key={grievance.id} to={`/grievances/${grievance.id}`} className="rounded-lg">
                  <Card className="h-full transition hover:border-primary">
                    <CardBody>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-lg font-bold">{grievance.subject}</h2>
                          <p className="mt-1 text-sm text-muted-foreground">{grievance.department}</p>
                        </div>
                        <StatusPill status={grievance.status} />
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {t("grievance.reference")}: {grievance.referenceNumber}
                      </p>
                      {grievance.relatedSchemeId ? (
                        <p className="mt-2 text-sm">
                          {t("grievance.relatedScheme")}: {schemeNames.get(grievance.relatedSchemeId) ?? grievance.relatedSchemeId}
                        </p>
                      ) : null}
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {lastResponse?.message ?? grievance.description}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">Submitted {formatDate(grievance.submittedDate)}</p>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function NewGrievancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addGrievance, showToast, signedIn, openAuthDialog } = useAppState();
  const schemesState = useAsyncData(getSchemes, []);
  const departments = useMemo(
    () => [...new Set(schemesState.data?.map((scheme) => scheme.department) ?? [])].sort(),
    [schemesState.data],
  );
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [relatedSchemeName, setRelatedSchemeName] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      openAuthDialog();
      return;
    }

    if (description.trim().length < 20) return;
    setSubmitting(true);
    const relatedScheme = schemesState.data?.find((scheme) => scheme.name === relatedSchemeName);
    const grievance = await addGrievance({
      subject,
      department,
      relatedSchemeId: relatedScheme?.id,
      description,
      attachments,
    });
    showToast(`Grievance submitted. Reference ${grievance.referenceNumber}`);
    navigate(`/grievances/${grievance.id}`);
  }

  return (
    <div>
      <PageHeader title={t("grievance.new")} description="Share the issue clearly and attach any helpful documents." />
      <section className="container-shell py-8">
        <Card>
          <CardBody>
            {schemesState.loading ? <LoadingSkeleton rows={1} /> : null}
            {schemesState.error ? <ErrorState message={schemesState.error} onRetry={schemesState.retry} /> : null}
            <form className="grid gap-4" onSubmit={onSubmit}>
              <label>
                <span className="mb-2 block text-sm font-semibold">{t("grievance.subject")}</span>
                <input className="form-control" required value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">{t("common.department")}</span>
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" size={17} />
                  <input
                    className="form-control pl-9"
                    list="department-options"
                    required
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                  />
                </div>
                <datalist id="department-options">
                  {departments.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">{t("grievance.relatedScheme")}</span>
                <input
                  className="form-control"
                  list="scheme-options"
                  value={relatedSchemeName}
                  onChange={(event) => setRelatedSchemeName(event.target.value)}
                />
                <datalist id="scheme-options">
                  {schemesState.data?.map((scheme) => (
                    <option key={scheme.id} value={scheme.name} />
                  ))}
                </datalist>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">{t("grievance.description")}</span>
                <textarea
                  className="form-control min-h-36"
                  required
                  minLength={20}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <span className="mt-1 block text-xs text-muted-foreground">Minimum 20 characters</span>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">{t("grievance.attachments")}</span>
                <input
                  className="block w-full text-sm"
                  type="file"
                  multiple
                  onChange={(event) => setAttachments(Array.from(event.target.files ?? []).map((file) => file.name))}
                />
              </label>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <ButtonLink to="/grievances" variant="outline">
                  {t("common.back")}
                </ButtonLink>
                <Button type="submit" disabled={submitting || description.trim().length < 20}>
                  {t("grievance.submitNew")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
