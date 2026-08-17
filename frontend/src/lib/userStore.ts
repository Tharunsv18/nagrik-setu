import { applications as applicationFixtures } from "@/data/applications";
import { getDocumentTypeIdByLabel, OTHER_DOCUMENT_TYPE_ID } from "@/data/documentTypes";
import { grievances as grievanceFixtures } from "@/data/grievances";
import { commonDocuments } from "@/data/options";
import type { Application, DocumentRecord, Grievance } from "@/types";

export const USER_STATE_STORAGE_PREFIX = "nagrik-setu.userState.";
export const DEMO_USER_ID = "mock-demo-nagriksetu-local";

export interface NotificationRecord {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface UserActivityState {
  savedSchemeIds: string[];
  applications: Application[];
  grievances: Grievance[];
  documents: DocumentRecord[];
  notifications: NotificationRecord[];
}

const demoDocuments: DocumentRecord[] = commonDocuments.slice(0, 2).map((name, index) => ({
  id: `demo-doc-${index + 1}`,
  documentType: getDocumentTypeIdByLabel(name) ?? OTHER_DOCUMENT_TYPE_ID,
  documentLabel: name,
  fileName: index === 0 ? "aadhaar-card.pdf" : index === 1 ? "income-certificate.pdf" : `${name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
  uploadedAt: index < 2 ? "2026-07-15T09:00:00.000Z" : "2026-07-16T09:00:00.000Z",
  status: "Uploaded",
}));

const demoUserState: UserActivityState = {
  savedSchemeIds: ["pm-kisan", "ayushman-bharat"],
  applications: applicationFixtures,
  grievances: grievanceFixtures,
  documents: demoDocuments,
  notifications: [],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getStorageKey(userId: string) {
  return `${USER_STATE_STORAGE_PREFIX}${encodeURIComponent(userId)}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isObjectArray(value: unknown): value is object[] {
  return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object");
}

function normalizeDocument(value: unknown, index: number): DocumentRecord | null {
  if (!value || typeof value !== "object") return null;

  const document = value as Partial<DocumentRecord> & {
    name?: string;
    filename?: string;
    uploaded?: boolean;
  };

  if (
    typeof document.id === "string" &&
    typeof document.documentType === "string" &&
    typeof document.fileName === "string" &&
    typeof document.uploadedAt === "string" &&
    document.status === "Uploaded"
  ) {
    return {
      id: document.id,
      documentType: document.documentType,
      ...(typeof document.documentLabel === "string" ? { documentLabel: document.documentLabel } : {}),
      fileName: document.fileName,
      uploadedAt: document.uploadedAt,
      status: document.status,
    };
  }

  if (typeof document.name === "string" && (typeof document.filename === "string" || document.uploaded)) {
    return {
      id: typeof document.id === "string" ? document.id : `migrated-doc-${index + 1}`,
      documentType: getDocumentTypeIdByLabel(document.name) ?? OTHER_DOCUMENT_TYPE_ID,
      documentLabel: document.name,
      fileName: document.filename ?? `${document.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      uploadedAt: new Date(0).toISOString(),
      status: "Uploaded",
    };
  }

  return null;
}

function normalizeUserState(value: unknown): UserActivityState | null {
  if (!value || typeof value !== "object") return null;

  const state = value as Partial<UserActivityState>;
  if (
    !isStringArray(state.savedSchemeIds) ||
    !isObjectArray(state.applications) ||
    !isObjectArray(state.grievances) ||
    !isObjectArray(state.documents)
  ) {
    return null;
  }

  return {
    savedSchemeIds: state.savedSchemeIds,
    applications: state.applications as Application[],
    grievances: state.grievances as Grievance[],
    documents: state.documents
      .map((document, index) => normalizeDocument(document, index))
      .filter((document): document is DocumentRecord => Boolean(document)),
    notifications: isObjectArray(state.notifications) ? (state.notifications as NotificationRecord[]) : [],
  };
}

export function createEmptyUserState(): UserActivityState {
  return {
    savedSchemeIds: [],
    applications: [],
    grievances: [],
    documents: [],
    notifications: [],
  };
}

export function readUserState(userId?: string | null): UserActivityState {
  if (!userId) return createEmptyUserState();

  const storage = getStorage();
  const key = getStorageKey(userId);

  if (!storage) {
    return userId === DEMO_USER_ID ? clone(demoUserState) : createEmptyUserState();
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) return userId === DEMO_USER_ID ? clone(demoUserState) : createEmptyUserState();

    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeUserState(parsed);
    if (normalized) return normalized;

    storage.removeItem(key);
    return userId === DEMO_USER_ID ? clone(demoUserState) : createEmptyUserState();
  } catch {
    storage.removeItem(key);
    return userId === DEMO_USER_ID ? clone(demoUserState) : createEmptyUserState();
  }
}

export function saveUserState(userId: string, state: UserActivityState) {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(getStorageKey(userId), JSON.stringify(state));
}
