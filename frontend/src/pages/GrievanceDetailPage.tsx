import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Timeline } from "@/components/shared/Timeline";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate, grievanceSteps } from "@/lib/eligibility";
import { getSchemes } from "@/lib/mockApi";
import { useAppState } from "@/context/AppStateContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { TimelineEntry } from "@/types";

export function GrievanceDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { grievances } = useAppState();
  const schemesState = useAsyncData(getSchemes, []);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const grievance = grievances.find((item) => item.id === id);

  const scheme = schemesState.data?.find((item) => item.id === grievance?.relatedSchemeId);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (!grievance) return [];
    const entries: TimelineEntry[] = [
      { stage: "Open", date: grievance.submittedDate, note: "Grievance submitted by citizen." },
    ];
    const firstDepartment = grievance.responses.find((response) => response.from !== "citizen");
    if (firstDepartment || grievance.status !== "open") {
      entries.push({
        stage: "In Progress",
        date: firstDepartment?.date ?? grievance.submittedDate,
        note: firstDepartment?.message ?? "Department review started.",
      });
    }
    if (grievance.status === "resolved" || grievance.status === "escalated") {
      const final = grievance.responses[grievance.responses.length - 1];
      entries.push({
        stage: grievance.status === "resolved" ? "Resolved" : "Escalated",
        date: final?.date ?? grievance.submittedDate,
        note: final?.message ?? "Status updated.",
      });
    }
    return entries;
  }, [grievance]);

  if (!grievance) {
    return (
      <section className="container-shell py-8">
        <EmptyState
          title="Grievance not found"
          description="The grievance link may be outdated or mistyped."
          actionLabel={t("common.grievances")}
          actionTo="/grievances"
        />
      </section>
    );
  }

  return (
    <div>
      <PageHeader
        title={grievance.subject}
        description={`${t("grievance.reference")}: ${grievance.referenceNumber}`}
        actions={<StatusPill status={grievance.status} />}
      />

      <section className="container-shell grid gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("common.status")}</h2>
            </CardHeader>
            <CardBody>
              <Timeline
                entries={timelineEntries}
                expectedSteps={grievanceSteps(grievance.status)}
                currentLabel="Grievance progress"
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Details</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t("common.department")}</p>
                <p className="mt-1 font-semibold">{grievance.department}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t("grievance.relatedScheme")}</p>
                {schemesState.loading ? <LoadingSkeleton rows={1} /> : null}
                {schemesState.error ? <ErrorState message={schemesState.error} onRetry={schemesState.retry} /> : null}
                {scheme ? (
                  <Link to={`/schemes/${scheme.id}`} className="mt-1 inline-block font-semibold text-primary">
                    {scheme.name}
                  </Link>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Not linked</p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Submitted</p>
                <p className="mt-1">{formatDate(grievance.submittedDate)}</p>
              </div>
              {grievance.attachments.length ? (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{t("grievance.attachments")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {grievance.attachments.map((attachment) => (
                      <Badge key={attachment}>{attachment}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">{t("grievance.thread")}</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {grievance.responses.map((response, index) => {
                  const citizen = response.from === "citizen";
                  return (
                    <div key={`${response.date}-${index}`} className={`flex ${citizen ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[88%] rounded-lg border p-3 ${
                          citizen ? "border-primary bg-[#e4f5f3]" : "border-border bg-muted"
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          {citizen ? "Citizen" : "Department"}
                        </p>
                        <p className="mt-2 text-sm leading-6">{response.message}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDate(response.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {grievance.status === "resolved" ? (
            <Card>
              <CardBody>
                <h2 className="text-lg font-bold">{t("grievance.resolvedPrompt")}</h2>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className={`grid h-11 w-11 place-items-center rounded-lg border ${
                      rating === "up" ? "border-success bg-[#e9f8ed] text-success" : "border-border"
                    }`}
                    onClick={() => setRating("up")}
                    aria-pressed={rating === "up"}
                    aria-label="Helpful"
                  >
                    <ThumbsUp aria-hidden="true" size={20} />
                  </button>
                  <button
                    type="button"
                    className={`grid h-11 w-11 place-items-center rounded-lg border ${
                      rating === "down" ? "border-danger bg-red-50 text-danger" : "border-border"
                    }`}
                    onClick={() => setRating("down")}
                    aria-pressed={rating === "down"}
                    aria-label="Not helpful"
                  >
                    <ThumbsDown aria-hidden="true" size={20} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <ButtonLink to="/grievances" variant="outline">
            {t("common.back")}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
