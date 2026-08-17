export type SchemeCategory =
  | "agriculture"
  | "education"
  | "health"
  | "housing"
  | "employment"
  | "women-child"
  | "senior-citizen"
  | "disability"
  | "minority"
  | "business"
  | "financial-inclusion"
  | "pension";

export type SchemeLevel = "central" | "state";
export type ApplicationMode = "online" | "offline" | "both";
/** Lifecycle status from the DB. Undefined = old static mock data (treat as CURRENT). */
export type SchemeStatus = "CURRENT" | "EXPIRED" | "FUTURE" | "LEGACY_VERIFY";

export interface EligibilityCriteria {
  minAge?: number;
  maxAge?: number;
  gender?: "female" | "male" | "other";
  incomeCeiling?: number;
  occupations?: string[];
  socialCategories?: string[];
  disabilityRequired?: boolean;
  state?: string;
  maritalStatus?: string;
  otherCriteria?: string[];
}

export interface Scheme {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  department: string;
  level: SchemeLevel;
  state?: string;
  category: SchemeCategory;
  benefits: {
    summary: string;
    amount?: string;
  };
  eligibility: EligibilityCriteria;
  documentsRequired: string[];
  applicationMode: ApplicationMode;
  officialLink?: string;
  deadline?: string;
  /**
   * Lifecycle status. "CURRENT" = scheme is running now.
   * Undefined for schemes coming from static mock data (treat as CURRENT).
   * LEGACY_VERIFY is never returned by the public API.
   */
  status?: SchemeStatus;
  /** ISO date — when the application window opens (null = no fixed window) */
  applicationStartDate?: string | null;
  /** ISO date — when the application window closes (null = no fixed window) */
  applicationEndDate?: string | null;
  tags: string[];
  popularityScore: number;
  launchedYear: number;
  /** Average user rating 0–5. Optional — real submissions out of scope for this version. */
  rating?: number;
  /** Official source URL for auditability */
  sourceUrl?: string;
  /** ISO date string of last cross-check against official source */
  lastVerifiedAt?: string;
}

export interface CitizenProfile {
  age?: number;
  gender?: "female" | "male" | "other";
  state?: string;
  district?: string;
  occupation?: string;
  annualIncome?: number;
  socialCategory?: string;
  disabilityStatus?: boolean;
  maritalStatus?: string;
  educationLevel?: string;
}

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "approved"
  | "rejected"
  | "disbursed";

export interface TimelineEntry {
  stage: string;
  date: string;
  note: string;
}

export interface Application {
  id: string;
  schemeId: string;
  status: ApplicationStatus;
  referenceNumber: string;
  submittedDate: string;
  lastUpdated: string;
  timeline: TimelineEntry[];
}

export type GrievanceStatus =
  | "open"
  | "in-progress"
  | "resolved"
  | "escalated";

export interface GrievanceResponse {
  from: "citizen" | "department" | string;
  message: string;
  date: string;
}

export interface Grievance {
  id: string;
  referenceNumber: string;
  subject: string;
  department: string;
  relatedSchemeId?: string;
  description: string;
  status: GrievanceStatus;
  submittedDate: string;
  attachments: string[];
  responses: GrievanceResponse[];
}

export type MatchStrength = "strong" | "partial" | "general";

export interface SchemeMatch {
  scheme: Scheme;
  score: number;
  strength: MatchStrength;
  reasons: string[];
}

export type DocumentStatus = "Uploaded";

export interface DocumentRecord {
  id: string;
  documentType: string;
  documentLabel?: string;
  fileName: string;
  uploadedAt: string;
  status: DocumentStatus;
}
