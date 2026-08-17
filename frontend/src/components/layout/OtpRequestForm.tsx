/**
 * OtpRequestForm
 *
 * Shared component used by both Sign In and Sign Up flows inside the AuthDialog.
 * Manages the full request-OTP → verify-OTP state machine:
 *   idle → loading → sent → (enter code) → verified → signIn()
 *   idle → loading → error → idle
 */

import { Mail, RefreshCw, Send, ShieldCheck, XCircle } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  OtpApiError,
  loginUser,
  registerUser,
  resendEmailOtp,
  verifyEmailOtp,
  type OtpPurpose,
} from "@/lib/otpApi";
import { Button } from "@/components/ui/Button";
import { useAppState } from "@/context/AppStateContext";

// ── Types ──────────────────────────────────────────────────────────────────

type FormState = "idle" | "loading" | "sent" | "verifying" | "verified" | "error";

interface OtpRequestFormProps {
  purpose: OtpPurpose;
}

interface OtpSession {
  verifyToken: string;
  maskedEmail: string;
  expiresAt: Date;
}

// ── Constants ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

// ── Helpers ────────────────────────────────────────────────────────────────

function friendlyError(error: unknown): string {
  if (error instanceof OtpApiError) {
    switch (error.code) {
      case "TOO_MANY_REQUESTS":
        return "Too many attempts. Please wait a few minutes before requesting another code.";
      case "NETWORK_ERROR":
        return "Unable to reach the server. Check your connection and try again.";
      case "INVALID_OTP":
        return error.message;
      case "OTP_EXPIRED":
        return "The code has expired. Click 'Resend code' to get a new one.";
      case "OTP_LOCKED":
        return "Too many incorrect attempts. Please request a new code.";
      case "EMAIL_TAKEN":
        return "An account with this email already exists. Try signing in instead.";
      default:
        return error.message || "Something went wrong. Please try again in a moment.";
    }
  }
  return "Something went wrong. Please try again.";
}

// ── OTP Digit Boxes ────────────────────────────────────────────────────────

interface OtpBoxesProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

function OtpBoxes({ value, onChange, disabled, hasError }: OtpBoxesProps) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));
  const digits = value.padEnd(6, "").slice(0, 6).split("");

  function handleKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] || digits[index] === " ") {
        if (index > 0) refs[index - 1].current?.focus();
      } else {
        const next = [...digits];
        next[index] = "";
        onChange(next.join("").trimEnd());
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs[index - 1].current?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      refs[index + 1].current?.focus();
    }
  }

  function handleInput(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d) => (d === " " ? "" : d));
    next[index] = digit;
    onChange(next.join("").trimEnd());
    if (digit && index < 5) refs[index + 1].current?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs[Math.min(pasted.length, 5)].current?.focus();
  }

  return (
    <div
      className="flex gap-2 justify-center"
      role="group"
      aria-label="6-digit one-time password"
      onPaste={handlePaste}
    >
      {refs.map((ref, i) => {
        const filled = digits[i] && digits[i] !== " ";
        return (
          <input
            key={i}
            ref={ref}
            id={`dialog-otp-digit-${i}`}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={filled ? digits[i] : ""}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of 6`}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            style={{
              width: 44,
              height: 52,
              textAlign: "center",
              fontSize: 20,
              fontWeight: 700,
              borderRadius: 10,
              border: `2px solid ${hasError ? "#b42318" : filled ? "#1B3A63" : "#D1CFC8"}`,
              background: filled ? "rgba(27,58,99,0.06)" : "#fff",
              color: "#10203A",
              outline: "none",
              transition: "border-color 0.15s",
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? "not-allowed" : "text",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function OtpRequestForm({ purpose }: OtpRequestFormProps) {
  const { signIn, showToast, closeAuthDialog } = useAppState();

  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [otpSession, setOtpSession] = useState<OtpSession | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function validateEmail(value: string): boolean {
    if (!value.trim()) { setFieldError("Please enter your email address."); return false; }
    if (!EMAIL_RE.test(value.trim())) { setFieldError("Please enter a valid email address."); return false; }
    setFieldError(null);
    return true;
  }

  // ── Send OTP ──
  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!validateEmail(email)) return;

    setFormState("loading");
    setErrorMessage(null);

    try {
      // For signup, use /api/auth/register (checks uniqueId — not needed here, email only in AuthDialog)
      // For signin/signup in the dialog we use the login endpoint for existing users,
      // and register for new ones. We use /api/auth/login for the dialog flow since
      // the user's uniqueId is unknown. For signup we still call register but without
      // a uniqueId — the dialog only supports login via the OTP path.
      const cleanEmail = email.trim().toLowerCase();
      let result: { verifyToken: string; maskedEmail: string; expiresAt: string };

      if (purpose === "signup") {
        // Generate a temporary uniqueId from email for dialog signup
        const tempId = `user${Date.now().toString().slice(-8)}`;
        result = await registerUser(tempId, cleanEmail);
        // Store the tempId so verify-otp can pass it
        setOtpSession({
          verifyToken: result.verifyToken,
          maskedEmail: result.maskedEmail,
          expiresAt: new Date(result.expiresAt),
        });
      } else {
        result = await loginUser(cleanEmail);
        setOtpSession({
          verifyToken: result.verifyToken,
          maskedEmail: result.maskedEmail,
          expiresAt: new Date(result.expiresAt),
        });
      }

      setOtpValue("");
      setOtpError(null);
      setResendCount(0);
      startCooldown();
      setFormState("sent");
    } catch (error) {
      setFormState("error");
      setErrorMessage(friendlyError(error));
    }
  }

  // ── Verify OTP — called automatically when 6 digits are entered ──
  async function handleVerify(code: string) {
    if (!otpSession || code.length !== 6) return;
    setFormState("verifying");
    setOtpError(null);

    try {
      const result = await verifyEmailOtp(otpSession.verifyToken, code);
      setFormState("verified");

      signIn({
        contact: result.user.email,
        displayName: result.user.displayName || result.user.uniqueId,
        mode: purpose === "signup" ? "new" : "returning",
        accessToken: result.accessToken,
      });

      showToast(
        purpose === "signup"
          ? `Welcome, ${result.user.uniqueId}! Your account is ready.`
          : `Signed in as ${result.user.uniqueId}. Welcome back!`,
      );

      setTimeout(() => closeAuthDialog(), 900);
    } catch (err) {
      setFormState("sent");
      setOtpError(friendlyError(err));
      setOtpValue("");
      setTimeout(() => document.getElementById("dialog-otp-digit-0")?.focus(), 50);
    }
  }

  // ── OTP digit change — auto-verify when 6 digits filled ──
  function handleOtpChange(val: string) {
    setOtpValue(val);
    setOtpError(null);
    if (val.length === 6) {
      setTimeout(() => handleVerify(val), 120);
    }
  }

  // ── Resend OTP ──
  async function handleResend() {
    if (cooldown > 0 || !otpSession) return;
    setResendError(null);
    setFormState("loading");

    try {
      const result = await resendEmailOtp(otpSession.verifyToken);
      setOtpSession((s) => s ? { ...s, expiresAt: new Date(result.expiresAt) } : s);
      startCooldown();
      setResendCount((n) => n + 1);
      setOtpValue("");
      setOtpError(null);
      setFormState("sent");
    } catch (error) {
      setFormState("sent");
      setResendError(friendlyError(error));
    }
  }

  const isLoading = formState === "loading";
  const isSent = formState === "sent" || formState === "verifying";
  const isVerifying = formState === "verifying";
  const isVerified = formState === "verified";
  const labelText = purpose === "signup" ? "Sign up with email code" : "Sign in with email code";

  return (
    <div>
      {/* ── Divider ── */}
      <div className="relative my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
        {labelText}
      </p>

      {/* ── Success state ── */}
      {isVerified && (
        <div className="flex flex-col items-center gap-2 py-4">
          <ShieldCheck size={36} style={{ color: "#15803d" }} />
          <p className="text-sm font-semibold text-green-800">Verified! Signing you in…</p>
        </div>
      )}

      {/* ── Request form (idle / loading / error) ── */}
      {!isSent && !isVerified && (
        <form onSubmit={handleSend} noValidate className="grid gap-3">
          <div>
            <label htmlFor="otp-email" className="mb-1.5 block text-sm font-semibold">
              Email address
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <Mail aria-hidden="true" size={15} className="text-muted-foreground" />
              </span>
              <input
                id="otp-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="form-control pl-9"
                placeholder="you@example.com"
                value={email}
                disabled={isLoading}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) validateEmail(e.target.value);
                }}
                onBlur={() => email && validateEmail(email)}
                aria-invalid={fieldError ? "true" : undefined}
                aria-describedby={fieldError ? "otp-email-error" : undefined}
              />
            </div>
            {fieldError && (
              <p id="otp-email-error" role="alert" className="mt-1 text-xs font-medium text-red-600">
                {fieldError}
              </p>
            )}
          </div>

          {formState === "error" && errorMessage && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <RefreshCw aria-hidden="true" size={15} className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send aria-hidden="true" size={15} />
                Send code
              </>
            )}
          </Button>
        </form>
      )}

      {/* ── Sent / verifying state ── */}
      {isSent && !isVerified && (
        <div className="grid gap-4">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Code sent to{" "}
              <span className="font-bold">{otpSession?.maskedEmail ?? email.trim()}</span>
            </p>
            <p className="mt-0.5 text-xs text-green-700">
              Check your inbox (and spam folder). The code expires in 10 minutes.
            </p>
          </div>

          {/* 6-digit boxes */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Enter the 6-digit code
            </label>
            <OtpBoxes
              value={otpValue}
              onChange={handleOtpChange}
              disabled={isVerifying}
              hasError={Boolean(otpError)}
            />
            {isVerifying && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" />
                Verifying…
              </p>
            )}
            {otpError && (
              <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-red-700">
                <XCircle size={14} />
                {otpError}
              </p>
            )}
          </div>

          {/* Resend */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isLoading || isVerifying || resendCount >= 3}
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: "var(--primary)" }}
            >
              <RefreshCw aria-hidden="true" size={13} className={isLoading ? "animate-spin" : ""} />
              Resend code
            </button>
            {cooldown > 0 && (
              <span className="text-xs text-muted-foreground" aria-live="polite">
                (wait {cooldown}s)
              </span>
            )}
          </div>

          {resendError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {resendError}
            </p>
          )}

          {/* Back link */}
          <button
            type="button"
            onClick={() => { setFormState("idle"); setOtpValue(""); setOtpError(null); }}
            className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-2 text-left"
          >
            ← Use a different email
          </button>
        </div>
      )}
    </div>
  );
}
