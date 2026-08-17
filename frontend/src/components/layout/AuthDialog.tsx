import { LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppState } from "@/context/AppStateContext";
import type { MockSignInMode } from "@/lib/authSession";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OtpRequestForm } from "./OtpRequestForm";

export function AuthDialog() {
  const { t } = useTranslation();
  const { authDialogOpen, closeAuthDialog, signIn, showToast } = useAppState();
  const [mode, setMode] = useState<MockSignInMode>("returning");
  const [displayName, setDisplayName] = useState("");
  const [contact, setContact] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = signIn({
      mode,
      displayName: displayName.trim(),
      contact: contact.trim(),
    });

    showToast(
      t(mode === "new" ? "auth.registered" : "auth.signedIn", {
        name: session.displayName,
      }),
    );
  }

  return (
    <Modal open={authDialogOpen} title={t("auth.title")} onClose={closeAuthDialog}>
      {/* ── Sign In / Sign Up toggle ── */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("auth.title")}>
        <Button
          type="button"
          variant={mode === "returning" ? "primary" : "outline"}
          onClick={() => setMode("returning")}
          aria-pressed={mode === "returning"}
        >
          <LogIn aria-hidden="true" size={17} />
          {t("auth.returning")}
        </Button>
        <Button
          type="button"
          variant={mode === "new" ? "primary" : "outline"}
          onClick={() => setMode("new")}
          aria-pressed={mode === "new"}
        >
          <UserPlus aria-hidden="true" size={17} />
          {t("auth.newUser")}
        </Button>
      </div>

      {/* ── OTP request form (real auth path) ── */}
      <OtpRequestForm purpose={mode === "new" ? "signup" : "signin"} />

      {/* ── Mock / dev sign-in (prototype path — no backend required) ── */}
      <details className="mt-4">
        <summary className="cursor-pointer select-none text-xs font-semibold text-muted-foreground hover:text-foreground">
          Continue without a code (dev / demo mode)
        </summary>
        <form className="mt-3 grid gap-4" onSubmit={onSubmit}>
          <p className="text-sm leading-6 text-muted-foreground">{t("auth.intro")}</p>

          {mode === "new" ? (
            <label>
              <span className="mb-2 block text-sm font-semibold">{t("auth.fullName")}</span>
              <input
                className="form-control"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          ) : null}

          <label>
            <span className="mb-2 block text-sm font-semibold">{t("auth.contact")}</span>
            <input
              className="form-control"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder={t("auth.contactPlaceholder")}
              autoComplete="username"
              inputMode="email"
              minLength={4}
              required
            />
          </label>

          <p className="text-xs leading-5 text-muted-foreground">{t("auth.verificationNote")}</p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeAuthDialog}>
              {t("common.back")}
            </Button>
            <Button type="submit">{t("auth.continue")}</Button>
          </div>
        </form>
      </details>
    </Modal>
  );
}
