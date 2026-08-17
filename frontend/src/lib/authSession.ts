export const AUTH_SESSION_STORAGE_KEY = "nagrik-setu.authSession";

export type MockSignInMode = "new" | "returning";

export interface MockSignInInput {
  mode?: MockSignInMode;
  displayName?: string;
  contact?: string;
}

export interface AuthSession {
  userId: string;
  displayName: string;
  contact: string;
  createdAt: string;
  lastSignedInAt: string;
  /** Real JWT access token from the backend — empty string in demo/mock mode */
  accessToken: string;
}

const DEFAULT_CONTACT = "demo@nagriksetu.local";
const DEFAULT_DISPLAY_NAME = "Nagrik Setu User";

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AuthSession>;

  return (
    typeof session.userId === "string" &&
    typeof session.displayName === "string" &&
    typeof session.contact === "string" &&
    typeof session.createdAt === "string" &&
    typeof session.lastSignedInAt === "string"
    // accessToken intentionally not required — old sessions without it still work
  );
}

function createUserId(contact: string) {
  return `mock-${contact.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "citizen"}`;
}

export function readStoredAuthSession() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (isAuthSession(parsed)) return parsed;

    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  } catch {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function createMockAuthSession(
  input: MockSignInInput & { accessToken?: string } = {},
  existingSession?: AuthSession | null,
) {
  const now = new Date().toISOString();
  const contact = input.contact?.trim() || existingSession?.contact || DEFAULT_CONTACT;
  const existingContactMatches = existingSession?.contact.toLowerCase() === contact.toLowerCase();
  const displayName =
    input.displayName?.trim() ||
    (existingContactMatches ? existingSession!.displayName : "") ||
    (input.mode === "returning" ? "Returning Citizen" : DEFAULT_DISPLAY_NAME);

  return {
    userId: existingContactMatches ? existingSession!.userId : createUserId(contact),
    displayName,
    contact,
    createdAt: existingContactMatches ? existingSession!.createdAt : now,
    lastSignedInAt: now,
    accessToken: input.accessToken ?? existingSession?.accessToken ?? "",
  };
}
