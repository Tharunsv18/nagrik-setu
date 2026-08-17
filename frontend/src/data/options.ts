import type { SchemeCategory } from "@/types";
import { documentTypeOptions, OTHER_DOCUMENT_TYPE_ID } from "./documentTypes";
export { states } from "./locations";

export const schemeCategories: SchemeCategory[] = [
  "agriculture",
  "education",
  "health",
  "housing",
  "employment",
  "women-child",
  "senior-citizen",
  "disability",
  "minority",
  "business",
  "financial-inclusion",
  "pension",
];

export const categoryLabels: Record<SchemeCategory, string> = {
  agriculture: "Agriculture",
  education: "Education",
  health: "Health",
  housing: "Housing",
  employment: "Employment",
  "women-child": "Women and Child",
  "senior-citizen": "Senior Citizen",
  disability: "Disability",
  minority: "Minority",
  business: "Business",
  "financial-inclusion": "Financial Inclusion",
  pension: "Pension",
};

export const occupations = [
  { value: "farmer", label: "Farmer" },
  { value: "student", label: "Student" },
  { value: "worker", label: "Wage worker" },
  { value: "street-vendor", label: "Street vendor" },
  { value: "artisan", label: "Artisan" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "self-employed", label: "Self-employed" },
  { value: "homemaker", label: "Homemaker" },
  { value: "senior", label: "Senior citizen" },
  { value: "unemployed", label: "Unemployed" },
];

export const socialCategories = ["General", "EWS", "OBC", "SC", "ST", "Minority"];

export const educationLevels = [
  "Below Class 10",
  "Class 10",
  "Class 12",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
];

export const commonDocuments = documentTypeOptions
  .filter((document) => document.id !== OTHER_DOCUMENT_TYPE_ID)
  .map((document) => document.fallbackLabel);
