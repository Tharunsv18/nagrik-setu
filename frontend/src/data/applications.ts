import type { Application } from "@/types";

export const applications: Application[] = [
  {
    id: "app-001",
    schemeId: "pm-kisan",
    status: "approved",
    referenceNumber: "NS-2026-100245",
    submittedDate: "2026-06-02",
    lastUpdated: "2026-07-12",
    timeline: [
      { stage: "Submitted", date: "2026-06-02", note: "Application submitted with bank and land details." },
      { stage: "Under Review", date: "2026-06-08", note: "Local verification started." },
      { stage: "Approved", date: "2026-07-12", note: "Beneficiary record approved for payment cycle." },
    ],
  },
  {
    id: "app-002",
    schemeId: "ayushman-bharat",
    status: "under-review",
    referenceNumber: "NS-2026-100311",
    submittedDate: "2026-07-20",
    lastUpdated: "2026-07-28",
    timeline: [
      { stage: "Submitted", date: "2026-07-20", note: "Family details received." },
      { stage: "Under Review", date: "2026-07-28", note: "Eligibility list mapping is being checked." },
    ],
  },
  {
    id: "app-003",
    schemeId: "nsp-post-matric",
    status: "submitted",
    referenceNumber: "NS-2026-100384",
    submittedDate: "2026-08-01",
    lastUpdated: "2026-08-01",
    timeline: [
      { stage: "Submitted", date: "2026-08-01", note: "Scholarship form received." },
    ],
  },
  {
    id: "app-004",
    schemeId: "pmay-urban",
    status: "rejected",
    referenceNumber: "NS-2026-098210",
    submittedDate: "2026-04-16",
    lastUpdated: "2026-05-03",
    timeline: [
      { stage: "Submitted", date: "2026-04-16", note: "Housing subsidy request submitted." },
      { stage: "Under Review", date: "2026-04-24", note: "Property declaration reviewed." },
      { stage: "Rejected", date: "2026-05-03", note: "Existing property ownership record found. Appeal can be raised." },
    ],
  },
  {
    id: "app-005",
    schemeId: "pm-svanidhi",
    status: "disbursed",
    referenceNumber: "NS-2026-096418",
    submittedDate: "2026-03-05",
    lastUpdated: "2026-04-02",
    timeline: [
      { stage: "Submitted", date: "2026-03-05", note: "Vendor certificate uploaded." },
      { stage: "Under Review", date: "2026-03-11", note: "Bank linkage completed." },
      { stage: "Approved", date: "2026-03-25", note: "Loan sanctioned." },
      { stage: "Disbursed", date: "2026-04-02", note: "First tranche disbursed to linked account." },
    ],
  },
];
