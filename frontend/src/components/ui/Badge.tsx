import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  primary: "border-[#99d4cf] bg-[#e4f5f3] text-[#064e48]",
  accent: "border-[#f0c98a] bg-[#fff4dc] text-[#713f12]",
  success: "border-[#95d5a5] bg-[#e9f8ed] text-[#14532d]",
  warning: "border-[#e8cf8d] bg-[#fff7da] text-[#713f12]",
  danger: "border-[#f0a09b] bg-[#fff0ee] text-[#7a1d16]",
};

export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const tone = props.tone ?? "neutral";
  const rest = { ...props };
  delete rest.tone;
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
