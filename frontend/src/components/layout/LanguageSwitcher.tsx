import { ChevronDown, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", labelKey: "common.english", nativeLabel: "English" },
  { code: "hi", labelKey: "common.hindi", nativeLabel: "हिन्दी" },
] as const;

/** Pill/button mode (mobile drawer) */
function PillSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language;
  return (
    <div
      className="inline-flex min-h-11 max-w-full flex-wrap items-center rounded-lg border border-border bg-white p-1"
      aria-label={t("common.language")}
    >
      {languages.map((language) => (
        <button
          key={language.code}
          type="button"
          className={`min-h-9 rounded-md px-3 text-sm font-semibold transition ${
            current === language.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => i18n.changeLanguage(language.code)}
          aria-pressed={current === language.code}
        >
          {t(language.labelKey)}
        </button>
      ))}
    </div>
  );
}

/** Dropdown mode (header, white text on navy) */
function DropdownSwitcher({ light = false }: { light?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((l) => l.code === i18n.language) ?? languages[0];

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const textColor = light ? "text-white/90 hover:text-white" : "text-foreground";
  const dropdownBg = "bg-white border border-border rounded-lg shadow-soft";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition hover:bg-white/10 ${textColor}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <Globe aria-hidden="true" size={16} className="shrink-0" />
        <span>{current.nativeLabel}</span>
        <ChevronDown
          aria-hidden="true"
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className={`absolute right-0 top-full z-50 mt-1 w-36 py-1 ${dropdownBg}`}
        >
          {languages.map((language) => (
            <button
              key={language.code}
              role="option"
              aria-selected={i18n.language === language.code}
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold transition hover:bg-muted ${
                i18n.language === language.code ? "text-primary" : "text-foreground"
              }`}
              onClick={() => {
                i18n.changeLanguage(language.code);
                setOpen(false);
              }}
            >
              {i18n.language === language.code && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              )}
              {language.nativeLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LanguageSwitcher({
  variant = "pill",
  light = false,
}: {
  compact?: boolean;
  variant?: "pill" | "dropdown";
  light?: boolean;
}) {
  if (variant === "dropdown") return <DropdownSwitcher light={light} />;
  return <PillSwitcher />;
}
