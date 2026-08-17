import { applications as applicationFixtures } from "@/data/applications";
import { grievances as grievanceFixtures } from "@/data/grievances";
import { schemes } from "@/data/schemes";
import { matchAndSortSchemes } from "@/lib/eligibility";
import type { Application, CitizenProfile, Grievance, Scheme } from "@/types";

let applicationStore: Application[] = [...applicationFixtures];
let grievanceStore: Grievance[] = [...grievanceFixtures];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function withLatency<T>(value: T, failureRate = 0.03): Promise<T> {
  return new Promise((resolve, reject) => {
    const delay = 250 + Math.random() * 420;
    window.setTimeout(() => {
      if (Math.random() < failureRate) {
        reject(new Error("The service is temporarily unavailable."));
        return;
      }
      resolve(clone(value));
    }, delay);
  });
}

export function getSchemes() {
  return withLatency<Scheme[]>(schemes);
}

export function getSchemeById(id: string) {
  return withLatency<Scheme | undefined>(schemes.find((scheme) => scheme.id === id));
}

export function getRelatedSchemes(scheme: Scheme) {
  const related = schemes
    .filter(
      (candidate) =>
        candidate.id !== scheme.id &&
        (candidate.category === scheme.category || candidate.department === scheme.department),
    )
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 4);
  return withLatency<Scheme[]>(related);
}

export function matchSchemes(profile: CitizenProfile) {
  return withLatency(matchAndSortSchemes(schemes, profile));
}

export function getPopularSchemes(limit = 4) {
  return withLatency(
    [...schemes].sort((a, b) => b.popularityScore - a.popularityScore).slice(0, limit),
    0,
  );
}

export function getApplications() {
  return withLatency<Application[]>(applicationStore);
}

export function createApplication(schemeId: string) {
  const now = new Date().toISOString().slice(0, 10);
  const referenceNumber = `NS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`;
  const application: Application = {
    id: `app-${Date.now()}`,
    schemeId,
    status: "submitted",
    referenceNumber,
    submittedDate: now,
    lastUpdated: now,
    timeline: [{ stage: "Submitted", date: now, note: "Application submitted through Nagrik Setu prototype." }],
  };
  applicationStore = [application, ...applicationStore];
  return withLatency(application, 0);
}

export function getGrievances() {
  return withLatency<Grievance[]>(grievanceStore);
}

export function getGrievanceById(id: string) {
  return withLatency<Grievance | undefined>(grievanceStore.find((grievance) => grievance.id === id));
}

export function createGrievance(input: Omit<Grievance, "id" | "referenceNumber" | "status" | "submittedDate" | "responses">) {
  const now = new Date().toISOString().slice(0, 10);
  const referenceNumber = `GR-${new Date().getFullYear()}-${Math.floor(300000 + Math.random() * 699999)}`;
  const grievance: Grievance = {
    ...input,
    id: `grv-${Date.now()}`,
    referenceNumber,
    status: "open",
    submittedDate: now,
    responses: [{ from: "citizen", message: input.description, date: now }],
  };
  grievanceStore = [grievance, ...grievanceStore];
  return withLatency(grievance, 0);
}
