/**
 * SignInPage — Unique ID + Email OTP authentication.
 *
 * Screens:
 *  "signup-form"  – Sign Up tab: unique ID + email fields
 *  "login-form"   – Log In tab: unique ID or email field
 *  "otp"          – Shared OTP verification screen (6 digit boxes, timer, resend)
 */

import React, {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  AtSign,
  CheckCircle,
  ChevronDown,
  Globe,
  Landmark,
  LogIn,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import {
  OtpApiError,
  checkUniqueId,
  loginUser,
  registerUser,
  resendEmailOtp,
  verifyEmailOtp,
} from "@/lib/otpApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const UNIQUE_ID_RE = /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_EXPIRY_SECONDS = 10 * 60;    // 10 minutes — must match backend OTP_EXPIRY_MINUTES
const RESEND_COOLDOWN = 60;            // seconds before resend button unlocks
const RESEND_MAX = 3;

// ── Colour tokens (kept consistent with existing design system) ───────────────
const navy = "#1B3A63";
const navyDark = "#14294D";
const orange = "#EA7317";
const offWhite = "#F5F4F0";
const muted = "#5A6478";
const border = "#D1CFC8";
const ink = "#10203A";
const errorRed = "#b42318";
const successGreen = "#15803d";

// ── Types ────────────────────────────────────────────────────────────────────

type AuthTab = "signup" | "login";
type Screen = "signup-form" | "login-form" | "otp";
type UidStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface OtpSession {
  verifyToken: string;
  maskedEmail: string;
  expiresAt: Date;
  purpose: "signup" | "signin";
  uniqueId?: string; // only for signup
}

// ── Static data ───────────────────────────────────────────────────────────────

const features = [
  { Icon: ShieldCheck, text: "ISO 27001 certified secure platform" },
  { Icon: CheckCircle, text: "900+ schemes across 42 departments" },
  { Icon: Globe, text: "Available in 22 official languages" },
  { Icon: Users, text: "14 crore+ beneficiaries served" },
];

const stats = [
  { value: "₹2.1L Cr", label: "BENEFITS DISBURSED" },
  { value: "900+", label: "ACTIVE SCHEMES" },
  { value: "99.9%", label: "UPTIME SLA" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function friendlyError(err: unknown): string {
  if (err instanceof OtpApiError) {
    switch (err.code) {
      case "NETWORK_ERROR": return "Backend offline — running in demo mode.";
      case "TOO_MANY_REQUESTS": return "Too many attempts. Please wait a few minutes.";
      case "UNIQUE_ID_TAKEN": return "This unique ID is already taken.";
      case "EMAIL_TAKEN": return "An account with this email already exists.";
      case "OTP_EXPIRED": return "The code has expired. Please request a new one.";
      case "INVALID_OTP": return err.message;
      case "OTP_LOCKED": return "Too many incorrect attempts. Please request a new code.";
      case "RESEND_LIMIT_REACHED": return "Maximum resend limit reached. Please restart.";
      default: return err.message || "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

// ── OTP digit box component ───────────────────────────────────────────────────

interface OtpBoxesProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: boolean;
}

function OtpBoxes({ value, onChange, disabled, error }: OtpBoxesProps) {
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];
  const digits = value.padEnd(6, "").slice(0, 6).split("");

  function handleKey(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index] === " " || digits[index] === "") {
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
    const joined = next.join("");
    onChange(joined.trimEnd());
    if (digit && index < 5) {
      // Auto-advance
      refs[index + 1].current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs[focusIdx].current?.focus();
  }

  const boxBorderColor = error ? errorRed : border;

  return (
    <div
      className="flex gap-2 justify-center"
      role="group"
      aria-label="6-digit one-time password"
      onPaste={handlePaste}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          id={`otp-digit-${i}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digits[i] === " " || digits[i] === undefined ? "" : digits[i]}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of 6`}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-0"
          style={{
            borderColor: digits[i] && digits[i] !== " " ? navy : boxBorderColor,
            color: ink,
            background: digits[i] && digits[i] !== " " ? `${navy}0D` : "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        />
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function SignInPage() {
  const navigate = useNavigate();
  const { signedIn, signIn, showToast } = useAppState();

  // Redirect if already signed in
  useEffect(() => {
    if (signedIn) navigate("/dashboard", { replace: true });
  }, [signedIn, navigate]);

  // ── Tab / screen state ──
  const [activeTab, setActiveTab] = useState<AuthTab>("signup");
  const [screen, setScreen] = useState<Screen>("signup-form");

  // ── Sign-up form state ──
  const [uniqueId, setUniqueId] = useState("");
  const [uidStatus, setUidStatus] = useState<UidStatus>("idle");
  const [uidError, setUidError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // ── Login form state ──
  const [identifier, setIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState<string | null>(null);

  // ── Shared OTP state ──
  const [otpSession, setOtpSession] = useState<OtpSession | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);

  // ── Loading state ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // ── Demo mode flag ──
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ── Refs ──
  const uidDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // OTP expiry countdown (shows time left on the code)
  // Resend cooldown (separate — unlocks after RESEND_COOLDOWN seconds)
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uidDebounceRef.current) clearTimeout(uidDebounceRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (resendCooldownRef.current) clearInterval(resendCooldownRef.current);
    };
  }, []);

  // ── Countdown timer (OTP expiry) ──
  function startCountdown(expiresAt: Date) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(countdownRef.current!);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  }

  // ── Resend cooldown timer (1 minute) ──
  function startResendCooldown() {
    if (resendCooldownRef.current) clearInterval(resendCooldownRef.current);
    setResendCooldown(RESEND_COOLDOWN);
    resendCooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendCooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Unique ID availability check (debounced) ──
  const checkAvailability = useCallback((value: string) => {
    if (uidDebounceRef.current) clearTimeout(uidDebounceRef.current);

    if (!value) { setUidStatus("idle"); return; }

    if (!UNIQUE_ID_RE.test(value)) {
      setUidStatus("invalid");
      return;
    }

    setUidStatus("checking");
    uidDebounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkUniqueId(value);
        setUidStatus(available ? "available" : "taken");
      } catch {
        // If backend is offline, don't block the UI
        setUidStatus("idle");
      }
    }, 450);
  }, []);

  // ── Unique ID input handler ──
  function handleUniqueIdChange(value: string) {
    // Strip invalid chars immediately for better UX
    const cleaned = value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    setUniqueId(cleaned);
    setUidError(null);
    checkAvailability(cleaned);
  }

  // ── Unique ID blur validation ──
  function validateUniqueId(): boolean {
    if (!uniqueId.trim()) { setUidError("Please enter a unique ID."); return false; }
    if (!UNIQUE_ID_RE.test(uniqueId)) {
      setUidError("4–20 characters, start with a letter, letters/numbers/underscore only.");
      return false;
    }
    if (uidStatus === "taken") { setUidError("This unique ID is already taken."); return false; }
    setUidError(null);
    return true;
  }

  // ── Email blur validation ──
  function validateEmail(): boolean {
    if (!email.trim()) { setEmailError("Please enter your email address."); return false; }
    if (!EMAIL_RE.test(email)) { setEmailError("Please enter a valid email address."); return false; }
    setEmailError(null);
    return true;
  }

  // ── Identifier blur validation ──
  function validateIdentifier(): boolean {
    if (!identifier.trim()) {
      setIdentifierError("Please enter your unique ID or email.");
      return false;
    }
    setIdentifierError(null);
    return true;
  }

  // ── Tab switch ──
  function switchTab(tab: AuthTab) {
    setActiveTab(tab);
    setScreen(tab === "signup" ? "signup-form" : "login-form");
    setUidError(null);
    setEmailError(null);
    setIdentifierError(null);
  }

  // ── Submit Sign-Up ──
  async function handleSignUpSubmit(e: FormEvent) {
    e.preventDefault();
    const uidOk = validateUniqueId();
    const emailOk = validateEmail();
    if (!uidOk || !emailOk) return;
    if (uidStatus === "checking") { setUidError("Please wait for availability check."); return; }

    setIsSubmitting(true);
    try {
      const result = await registerUser(uniqueId, email);
      const expiresAt = new Date(result.expiresAt);
      setOtpSession({ verifyToken: result.verifyToken, maskedEmail: result.maskedEmail, expiresAt, purpose: "signup", uniqueId });
      setOtpValue("");
      setOtpError(null);
      setResendCount(0);
      startCountdown(expiresAt);
      startResendCooldown();
      setScreen("otp");
    } catch (err) {
      if (err instanceof OtpApiError && err.code === "NETWORK_ERROR") {
        // Demo mode — proceed as if OTP was sent
        setIsDemoMode(true);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
        setOtpSession({
          verifyToken: "demo-token",
          maskedEmail: `${email[0]}***${email.slice(-email.split("@")[1].length - 2)}`,
          expiresAt,
          purpose: "signup",
          uniqueId,
        });
        setOtpValue("");
        setOtpError(null);
        startCountdown(expiresAt);
        startResendCooldown();
        setScreen("otp");
      } else {
        const msg = friendlyError(err);
        if (err instanceof OtpApiError && err.code === "UNIQUE_ID_TAKEN") setUidError(msg);
        else if (err instanceof OtpApiError && err.code === "EMAIL_TAKEN") setEmailError(msg);
        else setEmailError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Submit Login ──
  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateIdentifier()) return;

    setIsSubmitting(true);
    try {
      const result = await loginUser(identifier);
      const expiresAt = new Date(result.expiresAt);
      setOtpSession({ verifyToken: result.verifyToken, maskedEmail: result.maskedEmail, expiresAt, purpose: "signin" });
      setOtpValue("");
      setOtpError(null);
      setResendCount(0);
      startCountdown(expiresAt);
      startResendCooldown();
      setScreen("otp");
    } catch (err) {
      if (err instanceof OtpApiError && err.code === "NETWORK_ERROR") {
        setIsDemoMode(true);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
        const masked = identifier.includes("@")
          ? `${identifier[0]}***${identifier.slice(identifier.lastIndexOf("@"))}`
          : `${identifier[0]}***@demo.local`;
        setOtpSession({ verifyToken: "demo-token", maskedEmail: masked, expiresAt, purpose: "signin" });
        setOtpValue("");
        setOtpError(null);
        startCountdown(expiresAt);
        setScreen("otp");
      } else {
        setIdentifierError(friendlyError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── OTP change — auto-submit when 6 digits filled ──
  function handleOtpChange(val: string) {
    setOtpValue(val);
    setOtpError(null);
    if (val.length === 6) {
      // Small delay so user sees the last digit fill in
      setTimeout(() => submitOtp(val), 120);
    }
  }

  // ── Submit OTP verify ──
  async function submitOtp(code: string) {
    if (!otpSession || code.length !== 6) return;
    setIsVerifying(true);
    setOtpError(null);

    try {
      if (isDemoMode || otpSession.verifyToken === "demo-token") {
        // Demo: accept any 6 digits
        signIn({ contact: email || identifier, mode: otpSession.purpose === "signup" ? "new" : "returning", displayName: uniqueId || identifier });
        setOtpSuccess(true);
        showToast(otpSession.purpose === "signup" ? "Account created! Welcome to NagrikSeva." : "Signed in successfully!");
        setTimeout(() => navigate("/dashboard"), 800);
        return;
      }

      const result = await verifyEmailOtp(
        otpSession.verifyToken,
        code,
        otpSession.purpose === "signup" ? otpSession.uniqueId : undefined,
      );

      // Store the real JWT so authenticated endpoints (e.g. /api/user/profile) work
      signIn({
        contact: result.user.email,
        displayName: result.user.displayName || result.user.uniqueId,
        mode: otpSession.purpose === "signup" ? "new" : "returning",
        accessToken: result.accessToken,
      });
      setOtpSuccess(true);
      showToast(otpSession.purpose === "signup" ? "Account created! Welcome to NagrikaSeva." : "Signed in successfully!");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      setOtpError(friendlyError(err));
      setOtpValue("");
      // Refocus first digit box
      document.getElementById("otp-digit-0")?.focus();
    } finally {
      setIsVerifying(false);
    }
  }

  // ── Resend OTP ──
  async function handleResend() {
    if (!otpSession || resendCooldown > 0 || resendCount >= RESEND_MAX) return;
    setIsResending(true);
    setResendError(null);

    try {
      if (isDemoMode || otpSession.verifyToken === "demo-token") {
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
        setOtpSession((s) => s ? { ...s, expiresAt } : s);
        startCountdown(expiresAt);
        startResendCooldown();
        setResendCount((n) => n + 1);
        return;
      }

      const result = await resendEmailOtp(otpSession.verifyToken);
      const expiresAt = new Date(result.expiresAt);
      setOtpSession((s) => s ? { ...s, expiresAt } : s);
      startCountdown(expiresAt);
      startResendCooldown();
      setResendCount((n) => n + 1);
      setOtpValue("");
      setOtpError(null);
    } catch (err) {
      setResendError(friendlyError(err));
    } finally {
      setIsResending(false);
    }
  }

  // ── Go back from OTP screen ──
  function handleBack() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setScreen(activeTab === "signup" ? "signup-form" : "login-form");
    setOtpSession(null);
    setOtpValue("");
    setOtpError(null);
    setResendError(null);
    setIsDemoMode(false);
  }

  // ── Derived ──
  const canResend = resendCooldown === 0 && resendCount < RESEND_MAX && !isResending;
  const resendLabel = resendCount >= RESEND_MAX
    ? "Resend limit reached"
    : resendCooldown > 0
      ? `Resend in ${resendCooldown}s`
      : "Resend OTP";

  // ── Uid status indicator ──
  function UidStatusIcon() {
    switch (uidStatus) {
      case "checking": return <RefreshCw size={14} className="animate-spin" style={{ color: muted }} aria-label="Checking..." />;
      case "available": return <CheckCircle size={14} style={{ color: successGreen }} aria-label="Available" />;
      case "taken": return <XCircle size={14} style={{ color: errorRed }} aria-label="Taken" />;
      default: return null;
    }
  }

  function uidStatusText() {
    switch (uidStatus) {
      case "checking": return <span style={{ color: muted }}>Checking…</span>;
      case "available": return <span style={{ color: successGreen }}>✓ Available</span>;
      case "taken": return <span style={{ color: errorRed }}>✗ Already taken</span>;
      case "invalid": return uniqueId.length > 0 ? <span style={{ color: muted }}>4–20 chars, start with a letter</span> : null;
      default: return null;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#signin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to sign in form
      </a>

      {/* Two-column body */}
      <div className="flex flex-1 flex-col md:flex-row">

        {/* ── LEFT PANEL ── */}
        <div
          className="relative flex flex-col justify-between overflow-hidden px-8 py-10 md:min-h-screen md:w-2/5"
          style={{ background: navyDark }}
          aria-label="NagrikSeva branding"
        >
          {/* Decorative circles */}
          <span className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full" style={{ background: "rgba(234,115,23,0.12)" }} aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-40 right-8 h-32 w-32 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} aria-hidden="true" />

          <div className="relative z-10">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: orange }}>
                <Landmark aria-hidden="true" size={20} className="text-white" />
              </span>
              <div>
                <div className="text-lg font-bold text-white">NagrikSeva</div>
                <div className="text-[10px] font-semibold tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>GOVERNMENT OF INDIA</div>
              </div>
            </div>

            <p className="mt-8 text-xs font-bold tracking-[0.2em]" style={{ color: orange }}>
              DIGITAL INDIA &middot; CITIZEN FIRST
            </p>

            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white md:text-4xl">
              Your gateway to every government benefit&nbsp;&mdash; in&nbsp;one place.
            </h1>

            <p className="mt-4 text-sm leading-7" style={{ color: "rgba(255,255,255,0.65)" }}>
              Discover schemes you qualify for, check eligibility instantly, and track your
              applications from submission to disbursement &mdash; all without visiting any
              government office.
            </p>

            <ul className="mt-8 space-y-3" aria-label="Platform features">
              {features.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: "rgba(234,115,23,0.2)" }}>
                    <Icon aria-hidden="true" size={15} style={{ color: orange }} />
                  </span>
                  <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div className="relative z-10 mt-10">
            <div className="mb-6 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="grid grid-cols-3 gap-4">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <div className="text-xl font-extrabold text-white md:text-2xl">{value}</div>
                  <div className="mt-0.5 text-[9px] font-semibold tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <main
          id="signin-main"
          className="flex flex-1 flex-col px-6 py-8 md:px-12 md:py-10"
          style={{ background: offWhite }}
        >
          {/* Utility row */}
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
              style={{ borderColor: border, color: muted }}
              onClick={() => console.log("Language picker — stub")}
              aria-label="Select language"
            >
              <Globe aria-hidden="true" size={13} />English<ChevronDown aria-hidden="true" size={12} />
            </button>
            <button
              type="button"
              className="text-xs font-semibold underline-offset-2 hover:underline"
              style={{ color: navy }}
              onClick={() => navigate("/")}
            >
              Continue as Guest
            </button>
          </div>

          <div className="mx-auto w-full max-w-md">

            {/* ── OTP screen ── */}
            {screen === "otp" && otpSession ? (
              <div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mb-6 flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-70"
                  style={{ color: navy }}
                  aria-label="Go back"
                >
                  ← Back
                </button>

                <h2 className="text-2xl font-extrabold md:text-3xl" style={{ color: ink }}>
                  {otpSession.purpose === "signup" ? "Verify your email" : "Check your email"}
                </h2>
                <p className="mt-2 text-sm" style={{ color: muted }}>
                  We&rsquo;ve sent a 6-digit code to{" "}
                  <span className="font-semibold" style={{ color: ink }}>{otpSession.maskedEmail}</span>.
                </p>

                {isDemoMode && (
                  <div
                    className="mt-4 rounded-xl border px-4 py-3"
                    style={{ background: "#fffbeb", borderColor: "#fde68a" }}
                    role="status"
                  >
                    <p className="text-xs font-semibold" style={{ color: "#92400e" }}>
                      🔧 Demo mode — backend offline. Enter any 6 digits to continue.
                    </p>
                  </div>
                )}

                {/* Countdown */}
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: muted }}>
                    Code expires in
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-sm font-bold tabular-nums"
                    style={{ color: countdown < 60 ? errorRed : navy }}
                    aria-live="polite"
                    aria-label={`Time remaining: ${formatCountdown(countdown)}`}
                  >
                    <TimerReset size={14} aria-hidden="true" />
                    {formatCountdown(countdown)}
                  </span>
                </div>

                {/* Success state */}
                {otpSuccess ? (
                  <div
                    className="mt-8 flex flex-col items-center gap-3 rounded-2xl border py-10"
                    style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
                    role="status"
                    aria-live="polite"
                  >
                    <CheckCircle size={40} style={{ color: successGreen }} />
                    <p className="text-base font-bold" style={{ color: successGreen }}>
                      {otpSession.purpose === "signup" ? "Account created!" : "Signed in!"}
                    </p>
                    <p className="text-sm" style={{ color: muted }}>Redirecting you to your dashboard…</p>
                  </div>
                ) : (
                  <>
                    {/* OTP boxes */}
                    <div className="mt-6">
                      <OtpBoxes
                        value={otpValue}
                        onChange={handleOtpChange}
                        disabled={isVerifying || otpSuccess}
                        error={!!otpError}
                      />
                    </div>

                    {/* Error / status */}
                    <div className="mt-3 min-h-[1.5rem] text-center" aria-live="polite" aria-atomic="true">
                      {otpError && (
                        <p role="alert" className="text-sm font-semibold" style={{ color: errorRed }}>
                          {otpError}
                        </p>
                      )}
                      {isVerifying && (
                        <p className="flex items-center justify-center gap-2 text-sm" style={{ color: muted }}>
                          <RefreshCw size={13} className="animate-spin" />Verifying…
                        </p>
                      )}
                    </div>

                    {/* Verify button (fallback for non-auto-submit) */}
                    <button
                      type="button"
                      onClick={() => submitOtp(otpValue)}
                      disabled={otpValue.length !== 6 || isVerifying}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: navy }}
                    >
                      {isVerifying
                        ? <><RefreshCw aria-hidden="true" size={16} className="animate-spin" />Verifying…</>
                        : <><LogIn aria-hidden="true" size={16} />Verify &amp; {otpSession.purpose === "signup" ? "Create Account" : "Sign In"}</>
                      }
                    </button>

                    {/* Resend row */}
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={!canResend}
                        className="flex items-center gap-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ color: navy }}
                        aria-label={resendLabel}
                      >
                        <RefreshCw aria-hidden="true" size={13} className={isResending ? "animate-spin" : ""} />
                        {resendLabel}
                      </button>
                      {resendCount > 0 && resendCount < RESEND_MAX && (
                        <span className="text-xs" style={{ color: muted }}>
                          {RESEND_MAX - resendCount} resend{RESEND_MAX - resendCount !== 1 ? "s" : ""} remaining
                        </span>
                      )}
                      {resendError && (
                        <p role="alert" className="text-xs font-medium" style={{ color: errorRed }}>
                          {resendError}
                        </p>
                      )}
                    </div>

                    {/* Change link */}
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="text-xs font-semibold underline-offset-2 hover:underline"
                        style={{ color: muted }}
                      >
                        ← Change {otpSession.purpose === "signup" ? "email" : "ID / email"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* ── Auth forms ── */
              <>
                <h2 className="text-2xl font-extrabold md:text-3xl" style={{ color: ink }}>
                  {activeTab === "signup" ? "Create your account" : "Sign in to NagrikaSeva"}
                </h2>
                <p className="mt-2 text-sm" style={{ color: muted }}>
                  {activeTab === "signup"
                    ? "Choose a unique ID and verify your email to get started."
                    : "Enter your unique ID or email and we'll send you a sign-in code."}
                </p>

                {/* ── Tab toggle: Sign Up / Log In ── */}
                <div
                  className="mt-6 flex rounded-xl p-1"
                  style={{ background: "#ECEAE4" }}
                  role="tablist"
                  aria-label="Authentication method"
                >
                  {([
                    { id: "signup" as AuthTab, label: "Sign Up", Icon: UserPlus },
                    { id: "login" as AuthTab, label: "Log In", Icon: LogIn },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`tab-${id}`}
                      aria-selected={activeTab === id}
                      aria-controls={`panel-${id}`}
                      onClick={() => switchTab(id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition"
                      style={
                        activeTab === id
                          ? { background: "#ffffff", color: navy, boxShadow: "0 1px 4px rgba(20,41,77,0.12)" }
                          : { background: "transparent", color: muted }
                      }
                    >
                      <Icon aria-hidden="true" size={15} />{label}
                    </button>
                  ))}
                </div>

                {/* ── Sign Up panel ── */}
                <div
                  id="panel-signup"
                  role="tabpanel"
                  aria-labelledby="tab-signup"
                  hidden={activeTab !== "signup"}
                >
                  <form onSubmit={handleSignUpSubmit} noValidate className="mt-6 space-y-4">

                    {/* Unique ID */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="signup-uid" className="block text-sm font-semibold" style={{ color: ink }}>
                          Unique ID
                        </label>
                        <span className="flex items-center gap-1 text-xs font-medium" aria-live="polite">
                          <UidStatusIcon />{uidStatusText()}
                        </span>
                      </div>
                      <div
                        className="flex overflow-hidden rounded-lg border"
                        style={{ borderColor: uidError ? errorRed : uidStatus === "available" ? successGreen : border }}
                      >
                        <span
                          className="flex select-none items-center border-r px-3 text-sm"
                          style={{ background: "#ECEAE4", borderColor: border, color: muted }}
                          aria-hidden="true"
                        >
                          @
                        </span>
                        <input
                          id="signup-uid"
                          type="text"
                          autoComplete="username"
                          placeholder="e.g. ravi_kumar"
                          maxLength={20}
                          value={uniqueId}
                          disabled={isSubmitting}
                          onChange={(e) => handleUniqueIdChange(e.target.value)}
                          onBlur={validateUniqueId}
                          className="flex-1 bg-white px-3 py-3 text-sm outline-none"
                          style={{ color: ink }}
                          aria-invalid={uidError ? "true" : undefined}
                          aria-describedby={uidError ? "uid-error" : "uid-hint"}
                        />
                      </div>
                      {uidError
                        ? <p id="uid-error" role="alert" className="mt-1.5 text-xs font-medium" style={{ color: errorRed }}>{uidError}</p>
                        : <p id="uid-hint" className="mt-1.5 text-xs" style={{ color: muted }}>4–20 chars · letters, numbers, underscore · must start with a letter</p>
                      }
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="signup-email" className="mb-1.5 block text-sm font-semibold" style={{ color: ink }}>
                        Email address
                      </label>
                      <div
                        className="flex overflow-hidden rounded-lg border"
                        style={{ borderColor: emailError ? errorRed : border }}
                      >
                        <span
                          className="flex select-none items-center border-r px-3 text-sm"
                          style={{ background: "#ECEAE4", borderColor: border, color: muted }}
                          aria-hidden="true"
                        >
                          <AtSign size={14} />
                        </span>
                        <input
                          id="signup-email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          disabled={isSubmitting}
                          onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                          onBlur={validateEmail}
                          className="flex-1 bg-white px-3 py-3 text-sm outline-none"
                          style={{ color: ink }}
                          aria-invalid={emailError ? "true" : undefined}
                          aria-describedby={emailError ? "email-error" : undefined}
                        />
                      </div>
                      {emailError && (
                        <p id="email-error" role="alert" className="mt-1.5 text-xs font-medium" style={{ color: errorRed }}>{emailError}</p>
                      )}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting || uidStatus === "checking" || uidStatus === "taken" || uidStatus === "invalid"}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: navy }}
                    >
                      {isSubmitting
                        ? <><RefreshCw aria-hidden="true" size={16} className="animate-spin" />Sending code…</>
                        : <><UserPlus aria-hidden="true" size={16} />Create Account &amp; Send Code</>
                      }
                    </button>

                    {/* Already have account */}
                    <p className="text-center text-xs" style={{ color: muted }}>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchTab("login")}
                        className="font-semibold underline-offset-2 hover:underline"
                        style={{ color: navy }}
                      >
                        Log in instead
                      </button>
                    </p>
                  </form>
                </div>

                {/* ── Log In panel ── */}
                <div
                  id="panel-login"
                  role="tabpanel"
                  aria-labelledby="tab-login"
                  hidden={activeTab !== "login"}
                >
                  <form onSubmit={handleLoginSubmit} noValidate className="mt-6 space-y-4">

                    {/* Identifier */}
                    <div>
                      <label htmlFor="login-identifier" className="mb-1.5 block text-sm font-semibold" style={{ color: ink }}>
                        Unique ID or Email
                      </label>
                      <input
                        id="login-identifier"
                        type="text"
                        autoComplete="username"
                        placeholder="ravi_kumar or ravi@example.com"
                        value={identifier}
                        disabled={isSubmitting}
                        onChange={(e) => { setIdentifier(e.target.value); setIdentifierError(null); }}
                        onBlur={validateIdentifier}
                        className="form-control"
                        style={{ color: ink, borderColor: identifierError ? errorRed : border }}
                        aria-invalid={identifierError ? "true" : undefined}
                        aria-describedby={identifierError ? "identifier-error" : "identifier-hint"}
                      />
                      {identifierError
                        ? <p id="identifier-error" role="alert" className="mt-1.5 text-xs font-medium" style={{ color: errorRed }}>{identifierError}</p>
                        : <p id="identifier-hint" className="mt-1.5 text-xs" style={{ color: muted }}>Enter the unique ID you chose during sign-up, or your email address.</p>
                      }
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !identifier.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: navy }}
                    >
                      {isSubmitting
                        ? <><RefreshCw aria-hidden="true" size={16} className="animate-spin" />Sending code…</>
                        : <><LogIn aria-hidden="true" size={16} />Send Sign-In Code</>
                      }
                    </button>

                    {/* No account */}
                    <p className="text-center text-xs" style={{ color: muted }}>
                      Don&rsquo;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchTab("signup")}
                        className="font-semibold underline-offset-2 hover:underline"
                        style={{ color: navy }}
                      >
                        Sign up for free
                      </button>
                    </p>
                  </form>
                </div>

                {/* Legal */}
                <p className="mt-8 text-center text-xs leading-5" style={{ color: muted }}>
                  By continuing, you agree to the{" "}
                  <a href="/about" className="underline underline-offset-2">Terms of Use</a>{" "}and{" "}
                  <a href="/about" className="underline underline-offset-2">Privacy Policy</a>{" "}
                  of the Government of India Digital Services Platform.
                </p>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Page footer */}
      <footer
        className="flex flex-col items-start justify-between gap-3 border-t px-6 py-3 sm:flex-row sm:items-center"
        style={{ borderColor: border, background: "#ffffff" }}
      >
        <span className="text-xs" style={{ color: muted }}>NagrikaSeva &middot; Ministry of Electronics &amp; IT &middot; GoI</span>
        <nav className="flex gap-4" aria-label="Footer utility links">
          {["Help", "Accessibility", "Screen Reader"].map((label) => (
            <a key={label} href="/about" className="text-xs font-medium underline-offset-2 hover:underline" style={{ color: navy }}>{label}</a>
          ))}
        </nav>
      </footer>
    </div>
  );
}