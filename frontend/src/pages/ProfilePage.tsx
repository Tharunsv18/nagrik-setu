import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Phone, Mail, User, AlertCircle, ShieldCheck } from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import {
  fetchProfile,
  updatePhone,
  ProfileApiError,
  type UserProfile,
} from "@/lib/profileApi";

// ── Validation ────────────────────────────────────────────────────────────────

const PHONE_RE = /^\+?91?([6-9]\d{9})$/;

function normalisePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = PHONE_RE.exec(trimmed);
  return match ? match[1] : null;
}

function validatePhone(value: string): string | null {
  if (!value.trim()) return null; // empty = clear phone (allowed)
  if (normalisePhone(value) === null) {
    return "Enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210).";
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { authSession, signedIn } = useAppState();
  const navigate = useNavigate();

  // ── State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Redirect if not logged in
  useEffect(() => {
    if (!signedIn) {
      navigate("/signin", { replace: true });
    }
  }, [signedIn, navigate]);

  // ── Load profile
  useEffect(() => {
    if (!authSession?.accessToken) {
      setLoadError("You are not logged in with a verified account. Please sign in again.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await fetchProfile(authSession!.accessToken);
        if (!cancelled) {
          setProfile(data);
          setPhoneInput(data.phone ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof ProfileApiError
              ? err.message
              : "Failed to load profile. Please refresh the page.";
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [authSession]);

  // ── Cleanup timer
  useEffect(() => () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); }, []);

  // ── Derived
  const phoneValidationError = phoneInput !== (profile?.phone ?? "") ? validatePhone(phoneInput) : null;
  const phoneDirty = phoneInput.trim() !== (profile?.phone ?? "");
  const canSave = phoneDirty && phoneValidationError === null && !saving;

  // ── Save handler
  async function handleSave() {
    if (!canSave || !authSession?.accessToken) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const normalised = normalisePhone(phoneInput);
      const updated = await updatePhone(authSession.accessToken, normalised);
      setProfile(updated);
      setPhoneInput(updated.phone ?? "");
      setSaveSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg =
        err instanceof ProfileApiError
          ? err.message
          : "Failed to save. Please try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Render: Loading
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.loadingCenter}>
            <Loader2 size={36} style={{ animation: "spin 1s linear infinite", color: "#14294D" }} />
            <p style={{ marginTop: 16, color: "#6B7280", fontSize: 15 }}>Loading your profile…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Error
  if (loadError || !profile) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorCenter}>
            <AlertCircle size={40} color="#DC2626" />
            <p style={{ marginTop: 12, color: "#DC2626", fontWeight: 600, fontSize: 16 }}>
              Unable to load profile
            </p>
            <p style={{ color: "#6B7280", fontSize: 14, marginTop: 6, textAlign: "center" }}>
              {loadError ?? "Something went wrong."}
            </p>
            <button
              style={styles.retryBtn}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Profile
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .profile-field:focus-within label { color: #14294D; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-btn:not(:disabled):hover { background: #0f1f3d; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(20,41,77,0.25); }
        .save-btn { transition: background 0.2s, transform 0.15s, box-shadow 0.15s; }
      `}</style>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatarCircle}>
            <span style={styles.avatarText}>
              {(profile.displayName || profile.uniqueId)[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 style={styles.name}>{profile.displayName || profile.uniqueId}</h1>
            <p style={styles.subline}>
              <ShieldCheck size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
              Verified citizen account
            </p>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Read-only fields */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Account Information</h2>
          <p style={styles.sectionHint}>Name and email are tied to your account and cannot be changed.</p>

          <div style={styles.fieldGroup}>
            <ReadOnlyField icon={<User size={15} />} label="Display Name" value={profile.displayName || profile.uniqueId} />
            <ReadOnlyField icon={<User size={15} />} label="Unique ID" value={`@${profile.uniqueId}`} />
            <ReadOnlyField icon={<Mail size={15} />} label="Email address" value={profile.email} />
          </div>
        </div>

        <div style={styles.divider} />

        {/* Editable phone */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Contact</h2>
          <p style={styles.sectionHint}>Your phone number is optional and only visible to you.</p>

          <div style={styles.fieldWrapper} className="profile-field">
            <label style={styles.fieldLabel} htmlFor="profile-phone">
              <Phone size={14} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Mobile number
            </label>
            <div style={styles.phoneRow}>
              <div style={styles.countryCode}>🇮🇳 +91</div>
              <input
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                maxLength={15}
                placeholder="9876543210"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setSaveError(null);
                  setSaveSuccess(false);
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && canSave) void handleSave(); }}
                style={{
                  ...styles.phoneInput,
                  borderColor: phoneError || (phoneValidationError && phoneDirty)
                    ? "#DC2626"
                    : phoneInput && !phoneValidationError
                    ? "#16A34A"
                    : "#D1D5DB",
                }}
                aria-invalid={Boolean(phoneValidationError && phoneDirty)}
                aria-describedby={phoneValidationError ? "phone-error" : undefined}
              />
            </div>
            {phoneValidationError && phoneDirty && (
              <p id="phone-error" style={styles.fieldError}>
                <AlertCircle size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                {phoneValidationError}
              </p>
            )}
          </div>

          {/* Save button row */}
          <div style={styles.saveRow}>
            <button
              id="profile-save-btn"
              className="save-btn"
              disabled={!canSave}
              onClick={() => void handleSave()}
              style={styles.saveBtn}
            >
              {saving ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
              ) : saveSuccess ? (
                <Check size={16} style={{ marginRight: 8, color: "#16A34A" }} />
              ) : null}
              {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save changes"}
            </button>

            {saveSuccess && (
              <span style={styles.successMsg}>
                <Check size={13} style={{ marginRight: 4 }} />
                Phone number updated successfully.
              </span>
            )}
          </div>

          {saveError && (
            <div style={styles.saveErrorBox}>
              <AlertCircle size={14} style={{ marginRight: 6, flexShrink: 0 }} />
              {saveError}
            </div>
          )}
        </div>

        {/* Footer meta */}
        <div style={styles.metaRow}>
          <span>Account created {new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span style={{ marginLeft: 16 }}>Last updated {new Date(profile.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>
    </div>
  );
}

// ── Read-only field sub-component ─────────────────────────────────────────────

function ReadOnlyField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={styles.roField}>
      <span style={styles.roLabel}>
        {icon}
        <span style={{ marginLeft: 5 }}>{label}</span>
      </span>
      <span style={styles.roValue}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "calc(100vh - 64px)",
    background: "linear-gradient(135deg, #F5F4F0 0%, #EBE9E3 100%)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 16px 80px",
  } as React.CSSProperties,

  card: {
    width: "100%",
    maxWidth: 560,
    background: "#fff",
    borderRadius: 20,
    boxShadow: "0 4px 32px rgba(20,41,77,0.10)",
    overflow: "hidden",
    animation: "fadeIn 0.3s ease",
  } as React.CSSProperties,

  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "28px 32px",
    background: "linear-gradient(135deg, #14294D 0%, #1e3a6e 100%)",
  } as React.CSSProperties,

  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #EA7317 0%, #f59e0b 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 2px 12px rgba(234,115,23,0.4)",
  } as React.CSSProperties,

  avatarText: {
    fontSize: 24,
    fontWeight: 800,
    color: "#fff",
    lineHeight: 1,
  } as React.CSSProperties,

  name: {
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    margin: 0,
    lineHeight: 1.2,
  } as React.CSSProperties,

  subline: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,

  divider: {
    height: 1,
    background: "#F3F4F6",
  } as React.CSSProperties,

  section: {
    padding: "24px 32px",
  } as React.CSSProperties,

  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#14294D",
    margin: "0 0 4px",
    letterSpacing: "-0.2px",
  } as React.CSSProperties,

  sectionHint: {
    fontSize: 13,
    color: "#9CA3AF",
    margin: "0 0 18px",
    lineHeight: 1.5,
  } as React.CSSProperties,

  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  } as React.CSSProperties,

  roField: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "12px 14px",
    background: "#F9FAFB",
    borderRadius: 10,
    border: "1px solid #E5E7EB",
  } as React.CSSProperties,

  roLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9CA3AF",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,

  roValue: {
    fontSize: 14,
    color: "#374151",
    fontWeight: 500,
  } as React.CSSProperties,

  fieldWrapper: {
    marginBottom: 16,
  } as React.CSSProperties,

  fieldLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
  } as React.CSSProperties,

  phoneRow: {
    display: "flex",
    gap: 8,
  } as React.CSSProperties,

  countryCode: {
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    background: "#F3F4F6",
    border: "1.5px solid #D1D5DB",
    borderRadius: 10,
    fontSize: 14,
    color: "#374151",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    userSelect: "none" as const,
  } as React.CSSProperties,

  phoneInput: {
    flex: 1,
    height: 44,
    padding: "0 14px",
    fontSize: 15,
    border: "1.5px solid #D1D5DB",
    borderRadius: 10,
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
    color: "#111827",
    background: "#fff",
  } as React.CSSProperties,

  fieldError: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 6,
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,

  saveRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 22px",
    background: "#14294D",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,

  successMsg: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    color: "#16A34A",
    fontWeight: 600,
    animation: "fadeIn 0.2s ease",
  } as React.CSSProperties,

  saveErrorBox: {
    display: "flex",
    alignItems: "flex-start",
    marginTop: 12,
    padding: "10px 14px",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: 500,
  } as React.CSSProperties,

  metaRow: {
    padding: "12px 32px 20px",
    fontSize: 11,
    color: "#9CA3AF",
    borderTop: "1px solid #F3F4F6",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 4,
  } as React.CSSProperties,

  loadingCenter: {
    padding: "60px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  } as React.CSSProperties,

  errorCenter: {
    padding: "60px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  } as React.CSSProperties,

  retryBtn: {
    marginTop: 20,
    padding: "10px 24px",
    background: "#14294D",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,
};
