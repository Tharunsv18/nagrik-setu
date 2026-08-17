import { Construction } from "lucide-react";
import { Link } from "react-router-dom";

export function ServicesPage() {
  return (
    <div className="container-shell py-16 text-center">
      <div
        className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl"
        style={{ background: "var(--accent)", opacity: 0.9 }}
      >
        <Construction size={36} className="text-white" aria-hidden="true" />
      </div>
      <h1 className="mb-3 text-3xl font-bold" style={{ color: "var(--foreground)" }}>
        Services — Coming Soon
      </h1>
      <p className="mb-8 text-base leading-7" style={{ color: "var(--muted-foreground)", maxWidth: 520, margin: "0 auto 2rem" }}>
        We're building a dedicated services hub where you can directly access government portals,
        verify documents, check eligibility, and more — all in one place.
      </p>
      <Link
        to="/discover"
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: "var(--primary)" }}
      >
        Browse Schemes Instead →
      </Link>
    </div>
  );
}
