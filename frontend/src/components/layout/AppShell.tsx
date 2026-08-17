import { Bell, HelpCircle, Landmark, Menu, UserCircle, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ToastHost } from "@/components/ui/Toast";
import { useAppState } from "@/context/AppStateContext";
import { AssistantWidget } from "./AssistantWidget";
import { AuthDialog } from "./AuthDialog";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function AppShell() {
  const { t } = useTranslation();
  const { signedIn, signOut, openAuthDialog, toast, dismissToast, unreadNotificationCount } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasNotifications = unreadNotificationCount > 0;

  const mobileNav = (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {[
        { to: "/", label: t("common.home") },
        { to: "/discover", label: t("common.findSchemes") },
        { to: "/dashboard", label: t("common.trackApplication") },
        { to: "/grievances", label: t("common.grievances") },
        { to: "/about", label: t("common.about") },
        ...(signedIn ? [{ to: "/profile", label: "My Profile" }] : []),
      ].map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setMenuOpen(false)}
          className="min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <a className="skip-link" href="#main-content">
        {t("layout.skipMain")}
      </a>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30" style={{ background: "var(--header-bg)" }}>
        <div className="container-shell flex min-h-[68px] items-center justify-between gap-4 py-3">

          {/* Logo lockup */}
          <Link
            to="/"
            className="flex min-h-11 items-center gap-3 rounded-lg"
            aria-label={t("brand")}
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{ background: "var(--accent)" }}
            >
              <Landmark aria-hidden="true" size={21} className="text-white" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-white">{t("brand")}</span>
              <span className="hidden text-[11px] font-medium sm:block" style={{ color: "rgba(255,255,255,0.55)" }}>
                Citizen Services Portal
              </span>
            </span>
          </Link>

          {/* Desktop right controls */}
          <div className="hidden items-center gap-1 md:flex">
            <LanguageSwitcher variant="dropdown" light />

            {/* Notification bell */}
            <button
              type="button"
              className="relative grid min-h-9 min-w-9 place-items-center rounded-lg p-2 text-white/80 transition hover:bg-white/10"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell aria-hidden="true" size={18} />
              {hasNotifications && (
                <span
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                  style={{ background: "var(--accent)" }}
                  aria-label="Unread notifications"
                />
              )}
            </button>

            {/* Auth controls */}
            {signedIn ? (
              <div className="ml-1 flex items-center gap-1.5">
                <ButtonLink
                  to="/profile"
                  variant="outline"
                  className="border-white/25 text-white hover:bg-white/10"
                >
                  <UserCircle aria-hidden="true" size={17} />
                  My Profile
                </ButtonLink>
                <Button
                  variant="ghost"
                  onClick={signOut}
                  className="text-white/80 hover:bg-white/10"
                >
                  {t("common.signOut")}
                </Button>
              </div>
            ) : (
              <ButtonLink
                to="/signin"
                className="ml-1 border-white/30 text-white hover:bg-white/10"
                variant="outline"
              >
                <UserCircle aria-hidden="true" size={16} />
                {t("common.signIn")}
              </ButtonLink>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-white transition hover:bg-white/10 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("layout.menu")}
            aria-expanded={menuOpen}
            title={t("layout.menu")}
          >
            {menuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{ background: "var(--header-bg)", borderTop: "1px solid rgba(255,255,255,0.1)" }} className="md:hidden">
            <div className="container-shell space-y-4 py-4">
              {mobileNav}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <LanguageSwitcher />
                {signedIn ? (
                  <>
                    <ButtonLink
                      to="/dashboard"
                      variant="outline"
                      onClick={() => setMenuOpen(false)}
                      className="border-white/25 text-white"
                    >
                      <UserCircle aria-hidden="true" size={17} />
                      {t("common.profile")}
                    </ButtonLink>
                    <Button
                      variant="ghost"
                      onClick={() => { signOut(); setMenuOpen(false); }}
                      className="text-white/80"
                    >
                      {t("common.signOut")}
                    </Button>
                  </>
                ) : (
                  <ButtonLink
                    to="/signin"
                    onClick={() => setMenuOpen(false)}
                    className="border-white/25 text-white"
                    variant="outline"
                  >
                    {t("common.signIn")}
                  </ButtonLink>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <main id="main-content">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-12 border-t border-border bg-white">
        <div className="container-shell py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: brand lockup */}
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ background: "var(--primary)" }}
                >
                  <Landmark aria-hidden="true" size={16} className="text-white" />
                </span>
                <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                  {t("brand")}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Government of India · Digital India Initiative
              </p>
            </div>

            {/* Right: link row */}
            <nav aria-label="Footer links" className="flex flex-wrap gap-x-5 gap-y-2">
              {[
                { label: "Privacy Policy", to: "/about" },
                { label: "Accessibility", to: "/about" },
                { label: "Terms of Use", to: "/about" },
                { label: "Contact", to: "/about" },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm font-medium transition hover:underline"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom: last-updated line */}
          <p
            className="mt-5 border-t pt-4 text-xs"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
              fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",
            }}
          >
            Last updated: August 2026 · Content accurate as per official government sources
          </p>
        </div>
      </footer>

      {/* ── Floating help "?" button — opens AssistantWidget ── */}
      <HelpFab />

      <AssistantWidget />
      <AuthDialog />
      <ToastHost message={toast} onDismiss={dismissToast} />
    </div>
  );
}

/** Floating "?" help button — positioned left of the AssistantWidget launcher */
function HelpFab() {
  // We trigger the assistant by dispatching a custom event that AssistantWidget listens for.
  // Since AssistantWidget manages its own open state, we use a simple shared atom via a
  // window-level custom event to avoid prop-drilling.
  function openHelp() {
    window.dispatchEvent(new CustomEvent("nagrik:open-assistant"));
  }

  return (
    <button
      type="button"
      onClick={openHelp}
      className="fab-shadow fixed bottom-4 right-20 z-40 grid h-12 w-12 place-items-center rounded-full transition hover:opacity-90 active:scale-95"
      style={{ background: "var(--primary)" }}
      aria-label="Help and support"
      title="Help and support"
    >
      <HelpCircle aria-hidden="true" size={22} className="text-white" />
    </button>
  );
}
