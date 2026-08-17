import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shared/PageHeader";
import { SchemeResults } from "@/components/scheme/SchemeResults";

export function SchemesPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t("discover.browseTitle")} description="Search and filter all available sample schemes." />
      <section className="container-shell py-8">
        <SchemeResults mode="browse" />
      </section>
    </div>
  );
}
