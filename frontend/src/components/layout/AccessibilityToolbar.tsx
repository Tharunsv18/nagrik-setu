import { Accessibility, Contrast, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/context/AppStateContext";

export function AccessibilityToolbar() {
  const { t } = useTranslation();
  const { textScale, setTextScale, highContrast, setHighContrast } = useAppState();
  const [open, setOpen] = useState(false);

  const decrease = () => {
    setTextScale(textScale === "larger" ? "large" : "normal");
  };
  const increase = () => {
    setTextScale(textScale === "normal" ? "large" : "larger");
  };

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className="hidden items-center gap-2 rounded-lg border border-border bg-white p-2 shadow-soft md:flex">
        <span className="px-2 text-xs font-semibold text-muted-foreground">{t("layout.accessibility")}</span>
        <Button variant="ghost" size="icon" onClick={decrease} aria-label={t("layout.decreaseText")} title={t("layout.decreaseText")}>
          <Minus aria-hidden="true" size={18} />
        </Button>
        <Button variant="ghost" size="icon" onClick={increase} aria-label={t("layout.increaseText")} title={t("layout.increaseText")}>
          <Plus aria-hidden="true" size={18} />
        </Button>
        <Button
          variant={highContrast ? "primary" : "ghost"}
          size="icon"
          onClick={() => setHighContrast(!highContrast)}
          aria-pressed={highContrast}
          aria-label={t("layout.contrast")}
          title={t("layout.contrast")}
        >
          <Contrast aria-hidden="true" size={18} />
        </Button>
      </div>

      <div className="md:hidden">
        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={t("layout.accessibility")}
          title={t("layout.accessibility")}
        >
          <Accessibility aria-hidden="true" size={19} />
        </Button>
        {open ? (
          <div className="mt-2 flex w-max items-center gap-2 rounded-lg border border-border bg-white p-2 shadow-soft">
            <Button variant="ghost" size="icon" onClick={decrease} aria-label={t("layout.decreaseText")} title={t("layout.decreaseText")}>
              <Minus aria-hidden="true" size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={increase} aria-label={t("layout.increaseText")} title={t("layout.increaseText")}>
              <Plus aria-hidden="true" size={18} />
            </Button>
            <Button
              variant={highContrast ? "primary" : "ghost"}
              size="icon"
              onClick={() => setHighContrast(!highContrast)}
              aria-pressed={highContrast}
              aria-label={t("layout.contrast")}
              title={t("layout.contrast")}
            >
              <Contrast aria-hidden="true" size={18} />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
