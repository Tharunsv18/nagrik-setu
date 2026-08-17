import { AlertCircle, CheckCircle2, Clock3, Hourglass, Send, XCircle } from "lucide-react";
import { clsx } from "clsx";
import type { ApplicationStatus, GrievanceStatus } from "@/types";

type Status = ApplicationStatus | GrievanceStatus;

const statusMap: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  draft: { label: "Draft", className: "border-slate-300 bg-slate-100 text-slate-800", icon: Clock3 },
  submitted: { label: "Submitted", className: "border-sky-300 bg-sky-50 text-sky-800", icon: Send },
  "under-review": { label: "Under review", className: "border-amber-300 bg-amber-50 text-amber-900", icon: Hourglass },
  approved: { label: "Approved", className: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "border-red-300 bg-red-50 text-red-800", icon: XCircle },
  disbursed: { label: "Disbursed", className: "border-teal-300 bg-teal-50 text-teal-800", icon: CheckCircle2 },
  open: { label: "Open", className: "border-sky-300 bg-sky-50 text-sky-800", icon: AlertCircle },
  "in-progress": { label: "In progress", className: "border-amber-300 bg-amber-50 text-amber-900", icon: Hourglass },
  resolved: { label: "Resolved", className: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  escalated: { label: "Escalated", className: "border-red-300 bg-red-50 text-red-800", icon: AlertCircle },
};

export function statusLabel(status: Status) {
  return statusMap[status]?.label ?? status;
}

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const config = statusMap[status] ?? statusMap.open;
  const Icon = config.icon;
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
        config.className,
        className,
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon aria-hidden="true" size={14} />
      {config.label}
    </span>
  );
}
