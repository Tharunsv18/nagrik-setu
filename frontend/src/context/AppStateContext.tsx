import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_SESSION_STORAGE_KEY,
  clearStoredAuthSession,
  createMockAuthSession,
  readStoredAuthSession,
  saveAuthSession,
} from "@/lib/authSession";
import { apiCreateApplication, apiListApplications } from "@/lib/api/applications";
import { apiCreateGrievance, apiListGrievances } from "@/lib/api/grievances";
import { apiGetUnreadCount, apiLogout } from "@/lib/api/notifications";
import { createEmptyUserState, readUserState, saveUserState } from "@/lib/userStore";
import type { Application, CitizenProfile, DocumentRecord, Grievance } from "@/types";
import type { AuthSession, MockSignInInput } from "@/lib/authSession";
import type { UserActivityState } from "@/lib/userStore";
import type { CreateGrievanceInput } from "@/lib/api/grievances";

type TextScale = "normal" | "large" | "larger";

interface AppStateContextValue {
  authSession: AuthSession | null;
  signedIn: boolean;
  setSignedIn: (value: boolean) => void;
  signIn: (input?: MockSignInInput & { accessToken?: string }) => AuthSession;
  signOut: () => void;
  authDialogOpen: boolean;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  textScale: TextScale;
  setTextScale: (value: TextScale) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  profile: CitizenProfile | null;
  setProfile: (profile: CitizenProfile | null) => void;
  savedSchemeIds: string[];
  toggleSavedScheme: (schemeId: string) => void;
  applications: Application[];
  addApplication: (schemeId: string) => Promise<Application>;
  loadApplications: () => Promise<void>;
  grievances: Grievance[];
  addGrievance: (input: CreateGrievanceInput) => Promise<Grievance>;
  loadGrievances: () => Promise<void>;
  documents: DocumentRecord[];
  setDocumentFile: (documentId: string, filename: string) => void;
  addDocumentFile: (documentType: string, fileName: string, documentLabel?: string) => void;
  removeDocumentFile: (documentId: string) => void;
  toast: string | null;
  showToast: (message: string) => void;
  dismissToast: () => void;
  /** Real unread notification count from backend (0 = no badge) */
  unreadNotificationCount: number;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => readStoredAuthSession());
  const [userState, setUserState] = useState<UserActivityState>(() => readUserState(readStoredAuthSession()?.userId));
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [textScale, setTextScale] = useState<TextScale>("normal");
  const [highContrast, setHighContrast] = useState(false);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const signedIn = Boolean(authSession);
  const { applications, documents, grievances, savedSchemeIds } = userState;

  // Accessibility CSS class toggling
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", highContrast);
    root.classList.toggle("text-large", textScale === "large");
    root.classList.toggle("text-larger", textScale === "larger");
  }, [highContrast, textScale]);

  // Cross-tab auth sync
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== AUTH_SESSION_STORAGE_KEY) return;
      setAuthSession(readStoredAuthSession());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Poll unread notification count when signed in (every 60s)
  useEffect(() => {
    const token = authSession?.accessToken;
    if (!token) { setUnreadNotificationCount(0); return; }

    let cancelled = false;
    async function fetchCount() {
      const count = await apiGetUnreadCount(token!);
      if (!cancelled) setUnreadNotificationCount(count);
    }

    void fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [authSession]);

  const signIn = useCallback((input?: MockSignInInput & { accessToken?: string }) => {
    const session = createMockAuthSession(input, authSession);
    saveAuthSession(session);
    setAuthSession(session);
    setUserState(readUserState(session.userId));
    setAuthDialogOpen(false);
    return session;
  }, [authSession]);

  const signOut = useCallback(() => {
    // Revoke refresh token on the backend (best-effort, fire-and-forget)
    const stored = readStoredAuthSession();
    if (stored?.accessToken) {
      // We don't store the refreshToken in authSession currently, so just clear locally.
      // Full revocation is done via apiLogout when refreshToken is available.
      void apiLogout("").catch(() => {});
    }
    clearStoredAuthSession();
    setAuthSession(null);
    setUserState(createEmptyUserState());
    setAuthDialogOpen(false);
    setUnreadNotificationCount(0);
  }, []);

  const setSignedIn = useCallback((value: boolean) => {
    if (value) { signIn(); return; }
    signOut();
  }, [signIn, signOut]);

  const updateUserState = useCallback(
    (updater: (current: UserActivityState) => UserActivityState, sessionOverride?: AuthSession) => {
      const session = sessionOverride ?? authSession ?? signIn();
      const base = session.userId === authSession?.userId ? userState : readUserState(session.userId);
      const next = updater(base);
      saveUserState(session.userId, next);
      setUserState(next);
      return next;
    },
    [authSession, signIn, userState],
  );

  const toggleSavedScheme = useCallback((schemeId: string) => {
    if (!authSession) { setAuthDialogOpen(true); return; }
    updateUserState((current) => ({
      ...current,
      savedSchemeIds: current.savedSchemeIds.includes(schemeId)
        ? current.savedSchemeIds.filter((id) => id !== schemeId)
        : [schemeId, ...current.savedSchemeIds],
    }));
  }, [authSession, updateUserState]);

  // ── Document management (kept local for prototype) ─────────────────────────

  const addDocumentFile = useCallback((documentType: string, fileName: string, documentLabel?: string) => {
    if (!documentType.trim() || !fileName.trim()) return;
    updateUserState((current) => {
      const existing = current.documents.find(
        (d) =>
          d.documentType === documentType &&
          (documentType !== "other" ||
            (d.documentLabel ?? "").toLowerCase() === (documentLabel ?? "").trim().toLowerCase()),
      );
      if (existing) {
        return {
          ...current,
          documents: current.documents.map((d) =>
            d.id === existing.id
              ? { ...d, documentLabel: documentLabel?.trim() || d.documentLabel, fileName: fileName.trim(), uploadedAt: new Date().toISOString(), status: "Uploaded" }
              : d,
          ),
        };
      }
      return {
        ...current,
        documents: [
          { id: `doc-${Date.now()}`, documentType: documentType.trim(), ...(documentLabel?.trim() ? { documentLabel: documentLabel.trim() } : {}), fileName: fileName.trim(), uploadedAt: new Date().toISOString(), status: "Uploaded" },
          ...current.documents,
        ],
      };
    });
  }, [updateUserState]);

  const setDocumentFile = useCallback((documentId: string, filename: string) => {
    if (!filename.trim()) return;
    updateUserState((current) =>
      current.documents.some((d) => d.id === documentId)
        ? { ...current, documents: current.documents.map((d) => d.id === documentId ? { ...d, fileName: filename.trim(), uploadedAt: new Date().toISOString(), status: "Uploaded" } : d) }
        : current,
    );
  }, [updateUserState]);

  const removeDocumentFile = useCallback((documentId: string) => {
    updateUserState((current) => ({ ...current, documents: current.documents.filter((d) => d.id !== documentId) }));
  }, [updateUserState]);

  // ── Applications — real API with local fallback ────────────────────────────

  const loadApplications = useCallback(async () => {
    const token = authSession?.accessToken;
    const apps = await apiListApplications(token ?? "");
    updateUserState((current) => ({ ...current, applications: apps }));
  }, [authSession, updateUserState]);

  const addApplication = useCallback(async (schemeId: string) => {
    if (!authSession) { setAuthDialogOpen(true); throw new Error("Sign in required."); }
    const token = authSession.accessToken;
    let application: Application;
    if (token) {
      application = await apiCreateApplication(schemeId, token);
    } else {
      // Demo mode: create locally
      const { createApplication: mockCreate } = await import("@/lib/mockApi");
      application = await mockCreate(schemeId);
    }
    updateUserState(
      (current) => ({ ...current, applications: [application, ...current.applications.filter((a) => a.id !== application.id)] }),
      authSession,
    );
    return application;
  }, [authSession, updateUserState]);

  // ── Grievances — real API with local fallback ──────────────────────────────

  const loadGrievances = useCallback(async () => {
    const token = authSession?.accessToken;
    const list = await apiListGrievances(token ?? "");
    updateUserState((current) => ({ ...current, grievances: list }));
  }, [authSession, updateUserState]);

  const addGrievance = useCallback(async (input: CreateGrievanceInput) => {
    if (!authSession) { setAuthDialogOpen(true); throw new Error("Sign in required."); }
    const token = authSession.accessToken;
    let grievance: Grievance;
    if (token) {
      grievance = await apiCreateGrievance(input, token);
    } else {
      // Demo mode: create locally
      const { createGrievance: mockCreate } = await import("@/lib/mockApi");
      grievance = await mockCreate({
        subject: input.subject,
        department: input.department,
        relatedSchemeId: input.relatedSchemeId,
        description: input.description,
        attachments: input.attachments ?? [],
      });
    }
    updateUserState(
      (current) => ({ ...current, grievances: [grievance, ...current.grievances.filter((g) => g.id !== grievance.id)] }),
      authSession,
    );
    return grievance;
  }, [authSession, updateUserState]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      authSession,
      signedIn,
      setSignedIn,
      signIn,
      signOut,
      authDialogOpen,
      openAuthDialog: () => setAuthDialogOpen(true),
      closeAuthDialog: () => setAuthDialogOpen(false),
      textScale,
      setTextScale,
      highContrast,
      setHighContrast,
      profile,
      setProfile,
      savedSchemeIds,
      toggleSavedScheme,
      applications,
      addApplication,
      loadApplications,
      grievances,
      addGrievance,
      loadGrievances,
      documents,
      setDocumentFile,
      addDocumentFile,
      removeDocumentFile,
      toast,
      showToast,
      dismissToast: () => setToast(null),
      unreadNotificationCount,
    }),
    [
      addApplication,
      addDocumentFile,
      addGrievance,
      applications,
      authDialogOpen,
      authSession,
      documents,
      grievances,
      highContrast,
      loadApplications,
      loadGrievances,
      profile,
      removeDocumentFile,
      savedSchemeIds,
      setDocumentFile,
      setSignedIn,
      signIn,
      signOut,
      signedIn,
      showToast,
      textScale,
      toggleSavedScheme,
      toast,
      unreadNotificationCount,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
