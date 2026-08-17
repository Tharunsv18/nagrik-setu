import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import { clsx } from "clsx";
import type { TimelineEntry } from "@/types";
import { formatDate } from "@/lib/eligibility";

export function Timeline({
  entries,
  expectedSteps,
  currentLabel,
}: {
  entries: TimelineEntry[];
  expectedSteps?: string[];
  currentLabel?: string;
}) {
  const steps = expectedSteps?.length ? expectedSteps : entries.map((entry) => entry.stage);
  const lastKnownIndex = Math.max(
    0,
    ...entries.map((entry) => steps.findIndex((step) => step.toLowerCase() === entry.stage.toLowerCase())),
  );

  return (
    <ol className="grid gap-3 md:grid-cols-2" aria-label={currentLabel}>
      {steps.map((step, index) => {
        const entry = entries.find((item) => item.stage.toLowerCase() === step.toLowerCase());
        const complete = index <= lastKnownIndex && Boolean(entry);
        const current = index === lastKnownIndex;
        const Icon = complete ? CheckCircle2 : current ? Clock3 : Circle;
        return (
          <li key={step} className="relative rounded-lg border border-border bg-white p-4">
            <div className="flex items-start gap-3">
              <span
                className={clsx(
                  "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg border",
                  complete ? "border-success bg-[#e9f8ed] text-success" : "border-border bg-muted text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" size={18} />
              </span>
              <div>
                <h3 className="font-semibold">{step}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{entry ? formatDate(entry.date) : "Pending"}</p>
                {entry?.note ? <p className="mt-2 text-sm leading-6">{entry.note}</p> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
