/**
 * Scheme service — query government scheme records from the DB.
 * Schemes are read-only reference data seeded at startup.
 */

import { prisma } from "../lib/prisma";
import type {
  Scheme,
  Application,
  ApplicationTimeline,
  Grievance,
  GrievanceResponse,
  Document,
  Notification,
} from "@prisma/client";

export type { Scheme, Application, Grievance, Document, Notification };

// ── Scheme helpers ─────────────────────────────────────────────────────────

export interface SchemeRow {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  department: string;
  level: string;
  state: string | null;
  category: string;
  benefitsJson: string;
  eligibilityJson: string;
  documentsJson: string;
  applicationMode: string;
  officialLink: string | null;
  deadline: string | null;
  /** CURRENT | EXPIRED | FUTURE | LEGACY_VERIFY */
  status: string;
  applicationStartDate: string | null;
  applicationEndDate: string | null;
  tagsJson: string;
  popularityScore: number;
  launchedYear: number;
  rating: number | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
}

export interface SchemeFilters {
  q?: string;
  category?: string;
  state?: string;
  level?: string;
  /**
   * Filter by scheme status. Defaults to returning ALL non-LEGACY_VERIFY schemes
   * when omitted. Pass "CURRENT" to get only running schemes.
   * LEGACY_VERIFY is NEVER returned regardless of what is requested.
   */
  status?: string;
  /** When true, only return schemes where today falls inside applicationStartDate–applicationEndDate */
  applicationsOpen?: boolean;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface ListSchemesResult {
  rows: SchemeRow[];
  total: number;
}

/** NEVER_SHOW statuses — never exposed by public API, no matter what the caller passes. */
const HIDDEN_STATUSES = ["LEGACY_VERIFY"];

export async function listSchemes(filters: SchemeFilters = {}): Promise<ListSchemesResult> {
  const { q, category, state, level, limit = 50, applicationsOpen } = filters;

  // Resolve pagination
  const take = Math.min(limit, 200);
  const skip = filters.page != null ? (filters.page - 1) * take : (filters.offset ?? 0);

  // Status: if caller specifies one, use it, but still exclude hidden statuses.
  // If no status is specified, show all except hidden.
  const requestedStatus = filters.status;
  const statusFilter =
    requestedStatus && !HIDDEN_STATUSES.includes(requestedStatus)
      ? { status: requestedStatus }
      : { status: { notIn: HIDDEN_STATUSES } };

  // applications_open: filter by window — only schemes where today falls between
  // applicationStartDate and applicationEndDate (both must be set).
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const appOpenFilter = applicationsOpen
    ? {
        applicationStartDate: { not: null, lte: today },
        applicationEndDate: { not: null, gte: today },
      }
    : {};

  const where = {
    ...statusFilter,
    ...appOpenFilter,
    ...(category ? { category } : {}),
    ...(state ? { state } : {}),
    ...(level ? { level } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { shortDescription: { contains: q } },
            { department: { contains: q } },
            { tagsJson: { contains: q.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.scheme.findMany({ where, orderBy: { popularityScore: "desc" }, take, skip }),
    prisma.scheme.count({ where }),
  ]);

  return { rows, total };
}

export async function getSchemeById(id: string): Promise<SchemeRow | null> {
  return prisma.scheme.findUnique({ where: { id } });
}

export async function getRelatedSchemes(schemeId: string, category: string, department: string): Promise<SchemeRow[]> {
  return prisma.scheme.findMany({
    where: {
      id: { not: schemeId },
      // Only show CURRENT related schemes — no expired, future, or unverified
      status: { notIn: HIDDEN_STATUSES, equals: "CURRENT" },
      OR: [{ category }, { department }],
    },
    orderBy: { popularityScore: "desc" },
    take: 4,
  });
}

// ── Application helpers ────────────────────────────────────────────────────

export interface ApplicationWithTimeline extends Application {
  timeline: ApplicationTimeline[];
}

function makeReferenceNumber(prefix: string): string {
  return `${prefix}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`;
}

export async function listApplications(userId: string): Promise<ApplicationWithTimeline[]> {
  return prisma.application.findMany({
    where: { userId },
    include: { timeline: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApplicationById(id: string, userId: string): Promise<ApplicationWithTimeline | null> {
  return prisma.application.findFirst({
    where: { id, userId },
    include: { timeline: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createApplication(userId: string, schemeId: string): Promise<ApplicationWithTimeline> {
  const now = new Date().toISOString().slice(0, 10);
  const referenceNumber = makeReferenceNumber("NS");

  return prisma.application.create({
    data: {
      referenceNumber,
      status: "submitted",
      submittedDate: now,
      lastUpdated: now,
      userId,
      schemeId,
      timeline: {
        create: [{ stage: "Submitted", date: now, note: "Application submitted through Nagrik Setu." }],
      },
    },
    include: { timeline: { orderBy: { createdAt: "asc" } } },
  });
}

// ── Grievance helpers ──────────────────────────────────────────────────────

export interface GrievanceWithResponses extends Grievance {
  responses: GrievanceResponse[];
}

export interface CreateGrievanceInput {
  subject: string;
  department: string;
  relatedSchemeId?: string;
  description: string;
  attachments?: string[];
}

export async function listGrievances(userId: string): Promise<GrievanceWithResponses[]> {
  return prisma.grievance.findMany({
    where: { userId },
    include: { responses: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGrievanceById(id: string, userId: string): Promise<GrievanceWithResponses | null> {
  return prisma.grievance.findFirst({
    where: { id, userId },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createGrievance(userId: string, input: CreateGrievanceInput): Promise<GrievanceWithResponses> {
  const now = new Date().toISOString().slice(0, 10);
  const referenceNumber = makeReferenceNumber("GR");

  return prisma.grievance.create({
    data: {
      referenceNumber,
      subject: input.subject,
      department: input.department,
      relatedSchemeId: input.relatedSchemeId ?? null,
      description: input.description,
      status: "open",
      submittedDate: now,
      attachmentsJson: JSON.stringify(input.attachments ?? []),
      userId,
      responses: {
        create: [{ from: "citizen", message: input.description, date: now }],
      },
    },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });
}

// ── Notification helpers ───────────────────────────────────────────────────

export async function listNotifications(userId: string): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(id: string, userId: string): Promise<Notification | null> {
  const notif = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notif) return null;
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

// ── Document helpers ───────────────────────────────────────────────────────

export async function listDocuments(userId: string): Promise<Document[]> {
  return prisma.document.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function upsertDocument(
  userId: string,
  documentType: string,
  fileName: string,
  documentLabel?: string,
  applicationId?: string,
): Promise<Document> {
  const existing = await prisma.document.findFirst({
    where: {
      userId,
      documentType,
      ...(documentType === "other" && documentLabel
        ? { documentLabel: { equals: documentLabel } }
        : {}),
    },
  });

  if (existing) {
    return prisma.document.update({
      where: { id: existing.id },
      data: { fileName, uploadedAt: new Date(), status: "Uploaded" },
    });
  }

  return prisma.document.create({
    data: {
      documentType,
      documentLabel: documentLabel ?? null,
      fileName,
      status: "Uploaded",
      userId,
      applicationId: applicationId ?? null,
    },
  });
}

export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  const doc = await prisma.document.findFirst({ where: { id, userId } });
  if (!doc) return false;
  await prisma.document.delete({ where: { id } });
  return true;
}
