import { Accessibility, DatabaseZap, Languages, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export function AboutPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t("about.title")} description={t("about.body")} />
      <section className="container-shell grid gap-4 py-8 md:grid-cols-2 xl:grid-cols-4">
        {[
          [ShieldCheck, "Trustworthy public-service presentation"],
          [Accessibility, "Keyboard, contrast, and text-size controls"],
          [Languages, "English and Hindi interface scaffolding"],
          [DatabaseZap, "Mock API layer ready for backend replacement"],
        ].map(([Icon, text]) => (
          <Card key={String(text)}>
            <CardBody>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#e4f5f3] text-primary">
                <Icon aria-hidden="true" size={22} />
              </span>
              <p className="mt-4 text-sm font-semibold leading-6">{String(text)}</p>
            </CardBody>
          </Card>
        ))}
      </section>
      <section className="container-shell pb-10">
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-xl font-bold">{t("about.principles")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            The prototype keeps citizen-facing flows separate from the mock data layer, making schemes,
            applications, grievances, and assistant responses straightforward to replace with production APIs.
          </p>
        </div>
      </section>
    </div>
  );
}
