import { applications } from "@/data/applications";
import { schemes } from "@/data/schemes";
import type { Scheme } from "@/types";

export interface AssistantReply {
  text: string;
  schemes?: Scheme[];
}

const keywordMap: Array<{ keywords: string[]; schemeIds: string[]; text: string }> = [
  {
    keywords: ["farmer", "agriculture", "crop", "kisan"],
    schemeIds: ["pm-kisan", "pm-fasal-bima", "raitha-siri"],
    text: "For farming or crop support, these schemes are commonly relevant. Check state and land-record criteria before applying.",
  },
  {
    keywords: ["student", "scholarship", "education", "college", "school"],
    schemeIds: ["nsp-post-matric", "nmms", "divyangjan-scholarship"],
    text: "For education support, scholarship schemes usually depend on income, category, marks, and institution details.",
  },
  {
    keywords: ["health", "hospital", "ayushman", "insurance"],
    schemeIds: ["ayushman-bharat", "cm-health-tn"],
    text: "For hospital or health cover, start by checking family eligibility and whether the hospital is empanelled.",
  },
  {
    keywords: ["woman", "women", "pregnant", "mother", "girl"],
    schemeIds: ["matru-vandana", "janani-suraksha", "ujjwala"],
    text: "Women and child-focused schemes often need age, income, household, or health registration details.",
  },
  {
    keywords: ["business", "loan", "vendor", "artisan", "enterprise"],
    schemeIds: ["pm-svanidhi", "pm-vishwakarma", "pmegp"],
    text: "For livelihood or enterprise support, these schemes may help with credit, toolkit support, or project subsidy.",
  },
];

export function askAssistant(message: string): Promise<AssistantReply> {
  const lower = message.toLowerCase();
  const matched = keywordMap.find((entry) => entry.keywords.some((keyword) => lower.includes(keyword)));

  let reply: AssistantReply;
  if (lower.includes("track") || lower.includes("application") || lower.includes("status")) {
    const latest = applications[0];
    reply = {
      text: `Your latest sample application is ${latest.referenceNumber}. It is currently marked ${latest.status.replace("-", " ")}. Open the dashboard for the full timeline.`,
    };
  } else if (lower.includes("grievance") || lower.includes("complaint")) {
    reply = {
      text: "To file a grievance, go to Grievances, choose the department, add a clear subject, describe the issue, and attach supporting files if available.",
    };
  } else if (matched) {
    reply = {
      text: matched.text,
      schemes: matched.schemeIds
        .map((id) => schemes.find((scheme) => scheme.id === id))
        .filter((scheme): scheme is Scheme => Boolean(scheme)),
    };
  } else {
    reply = {
      text: "I can help narrow schemes by age, state, occupation, income, category, disability status, or application status. Try asking about your situation in one sentence.",
      schemes: schemes.slice(0, 2),
    };
  }

  return new Promise((resolve) => window.setTimeout(() => resolve(reply), 650));
}
