export const OTHER_DOCUMENT_TYPE_ID = "other";

export interface DocumentTypeOption {
  id: string;
  labelKey: string;
  fallbackLabel: string;
}

export const documentTypeOptions = [
  { id: "aadhaar-card", labelKey: "documents.types.aadhaarCard", fallbackLabel: "Aadhaar card" },
  { id: "pan-card", labelKey: "documents.types.panCard", fallbackLabel: "PAN card" },
  { id: "voter-id-card", labelKey: "documents.types.voterIdCard", fallbackLabel: "Voter ID card" },
  { id: "passport", labelKey: "documents.types.passport", fallbackLabel: "Passport" },
  { id: "ration-card", labelKey: "documents.types.rationCard", fallbackLabel: "Ration card" },
  { id: "income-certificate", labelKey: "documents.types.incomeCertificate", fallbackLabel: "Income certificate" },
  { id: "caste-certificate", labelKey: "documents.types.casteCertificate", fallbackLabel: "Caste certificate" },
  { id: "domicile-residence-certificate", labelKey: "documents.types.domicileResidenceCertificate", fallbackLabel: "Domicile / residence certificate" },
  { id: "bank-passbook-cancelled-cheque", labelKey: "documents.types.bankPassbookCancelledCheque", fallbackLabel: "Bank passbook / cancelled cheque" },
  { id: "passport-size-photograph", labelKey: "documents.types.passportSizePhotograph", fallbackLabel: "Passport-size photograph" },
  { id: "disability-certificate", labelKey: "documents.types.disabilityCertificate", fallbackLabel: "Disability certificate" },
  { id: "bpl-card", labelKey: "documents.types.bplCard", fallbackLabel: "BPL card" },
  { id: "birth-certificate", labelKey: "documents.types.birthCertificate", fallbackLabel: "Birth certificate" },
  { id: "land-property-documents", labelKey: "documents.types.landPropertyDocuments", fallbackLabel: "Land / property documents" },
  { id: "address-proof", labelKey: "documents.types.addressProof", fallbackLabel: "Address proof" },
  { id: "age-proof", labelKey: "documents.types.ageProof", fallbackLabel: "Age proof" },
  { id: "bank-details", labelKey: "documents.types.bankDetails", fallbackLabel: "Bank details" },
  { id: "bank-passbook", labelKey: "documents.types.bankPassbook", fallbackLabel: "Bank passbook" },
  { id: "caste-certificate-if-applicable", labelKey: "documents.types.casteCertificateIfApplicable", fallbackLabel: "Caste certificate if applicable" },
  { id: "caste-certificate-where-applicable", labelKey: "documents.types.casteCertificateWhereApplicable", fallbackLabel: "Caste certificate where applicable" },
  { id: "caste-or-minority-certificate", labelKey: "documents.types.casteOrMinorityCertificate", fallbackLabel: "Caste or minority certificate" },
  { id: "child-documents", labelKey: "documents.types.childDocuments", fallbackLabel: "Child documents" },
  { id: "college-admission-proof", labelKey: "documents.types.collegeAdmissionProof", fallbackLabel: "College admission proof" },
  { id: "crop-details", labelKey: "documents.types.cropDetails", fallbackLabel: "Crop details" },
  { id: "education-certificate-if-required", labelKey: "documents.types.educationCertificateIfRequired", fallbackLabel: "Education certificate if required" },
  { id: "educational-certificates", labelKey: "documents.types.educationalCertificates", fallbackLabel: "Educational certificates" },
  { id: "family-id-where-applicable", labelKey: "documents.types.familyIdWhereApplicable", fallbackLabel: "Family ID where applicable" },
  { id: "guardian-id-proof", labelKey: "documents.types.guardianIdProof", fallbackLabel: "Guardian ID proof" },
  { id: "health-card", labelKey: "documents.types.healthCard", fallbackLabel: "Health card" },
  { id: "income-proof", labelKey: "documents.types.incomeProof", fallbackLabel: "Income proof" },
  { id: "initial-deposit", labelKey: "documents.types.initialDeposit", fallbackLabel: "Initial deposit" },
  { id: "job-card-if-applicable", labelKey: "documents.types.jobCardIfApplicable", fallbackLabel: "Job card if applicable" },
  { id: "land-or-livelihood-proof", labelKey: "documents.types.landOrLivelihoodProof", fallbackLabel: "Land or livelihood proof" },
  { id: "land-or-residence-proof", labelKey: "documents.types.landOrResidenceProof", fallbackLabel: "Land or residence proof" },
  { id: "land-record", labelKey: "documents.types.landRecord", fallbackLabel: "Land record" },
  { id: "land-record-or-tenancy-document", labelKey: "documents.types.landRecordOrTenancyDocument", fallbackLabel: "Land record or tenancy document" },
  { id: "marksheets", labelKey: "documents.types.marksheets", fallbackLabel: "Marksheets" },
  { id: "minority-certificate", labelKey: "documents.types.minorityCertificate", fallbackLabel: "Minority certificate" },
  { id: "mobile-number", labelKey: "documents.types.mobileNumber", fallbackLabel: "Mobile number" },
  { id: "mother-child-protection-card", labelKey: "documents.types.motherChildProtectionCard", fallbackLabel: "Mother and child protection card" },
  { id: "occupation-proof-if-available", labelKey: "documents.types.occupationProofIfAvailable", fallbackLabel: "Occupation proof if available" },
  { id: "passport-photo", labelKey: "documents.types.passportPhoto", fallbackLabel: "Passport photo" },
  { id: "pregnancy-registration-card", labelKey: "documents.types.pregnancyRegistrationCard", fallbackLabel: "Pregnancy registration card" },
  { id: "project-report", labelKey: "documents.types.projectReport", fallbackLabel: "Project report" },
  { id: "property-documents-if-applicable", labelKey: "documents.types.propertyDocumentsIfApplicable", fallbackLabel: "Property documents if applicable" },
  { id: "residence-proof", labelKey: "documents.types.residenceProof", fallbackLabel: "Residence proof" },
  { id: "shg-membership-details", labelKey: "documents.types.shgMembershipDetails", fallbackLabel: "SHG membership details" },
  { id: "school-certificate", labelKey: "documents.types.schoolCertificate", fallbackLabel: "School certificate" },
  { id: "sowing-certificate", labelKey: "documents.types.sowingCertificate", fallbackLabel: "Sowing certificate" },
  { id: "vending-certificate", labelKey: "documents.types.vendingCertificate", fallbackLabel: "Vending certificate" },
  { id: OTHER_DOCUMENT_TYPE_ID, labelKey: "documents.types.other", fallbackLabel: "Other" },
] as const satisfies DocumentTypeOption[];

export function getDocumentTypeOption(id: string) {
  return documentTypeOptions.find((option) => option.id === id);
}

export function getDocumentTypeIdByLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return documentTypeOptions.find((option) => option.fallbackLabel.toLowerCase() === normalized)?.id;
}
