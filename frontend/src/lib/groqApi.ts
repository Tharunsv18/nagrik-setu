import { schemes } from "@/data/schemes";
import type { CitizenProfile } from "@/types";
import type { ChatMessage } from "@/context/AssistantContext";
import type { AssistantReply } from "@/lib/mockApi/assistant";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

function buildSchemeCatalogue(): string {
  return schemes
    .map((s) => {
      const elig = [
        s.eligibility.gender ? "gender=" + s.eligibility.gender : null,
        s.eligibility.minAge != null || s.eligibility.maxAge != null
          ? "age=" + (s.eligibility.minAge ?? 0) + "-" + (s.eligibility.maxAge ?? 100)
          : null,
        s.eligibility.incomeCeiling != null
          ? "income<=" + s.eligibility.incomeCeiling
          : null,
        s.eligibility.occupations?.length
          ? "occupations=" + s.eligibility.occupations.join("/")
          : null,
        s.eligibility.socialCategories?.length
          ? "category=" + s.eligibility.socialCategories.join("/")
          : null,
        s.eligibility.disabilityRequired ? "disability=required" : null,
        s.eligibility.maritalStatus ? "marital=" + s.eligibility.maritalStatus : null,
        ...(s.eligibility.otherCriteria ?? []),
      ]
        .filter(Boolean)
        .join(", ");
      const stateStr = s.state ? " | " + s.state : "";
      return (
        "[" + s.id + "] " + s.name + " | " + s.category + " | " + s.level + stateStr +
        " | Tags: " + s.tags.join(", ") + " | Eligibility: " + elig
      );
    })
    .join("\n");
}

function buildProfileSummary(profile: CitizenProfile | null): string {
  if (!profile || Object.keys(profile).filter((k) => (profile as Record<string, unknown>)[k] !== undefined).length === 0) {
    return "No profile data available yet.";
  }
  const parts: string[] = [];
  if (profile.age != null) parts.push("Age: " + profile.age);
  if (profile.gender) parts.push("Gender: " + profile.gender);
  if (profile.state) parts.push("State: " + profile.state);
  if (profile.district) parts.push("District: " + profile.district);
  if (profile.occupation) parts.push("Occupation: " + profile.occupation);
  if (profile.annualIncome != null) parts.push("Annual income: Rs. " + profile.annualIncome.toLocaleString("en-IN"));
  if (profile.socialCategory) parts.push("Social category: " + profile.socialCategory);
  if (profile.disabilityStatus != null) parts.push("Disability certificate: " + (profile.disabilityStatus ? "Yes" : "No"));
  if (profile.maritalStatus) parts.push("Marital status: " + profile.maritalStatus);
  if (profile.educationLevel) parts.push("Education level: " + profile.educationLevel);
  return parts.join(" | ");
}

function buildSystemPrompt(profile: CitizenProfile | null): string {
  return (
    "You are Sahayak, an AI assistant inside Nagrik Setu, an Indian government scheme discovery portal." +
    "\nHelp citizens find relevant government schemes in India." +
    "\n\n## User Profile\n" + buildProfileSummary(profile) +
    "\n\n## Available Schemes Catalogue" +
    "\nFormat: [scheme-id] Name | category | level | state | Tags | Eligibility" +
    "\n" + buildSchemeCatalogue() +
    "\n\n## Response Rules" +
    "\n1. Recommend ONLY schemes from the catalogue above using their exact IDs." +
    "\n2. Respond warmly and concisely in plain English." +
    '\n3. Always output valid JSON: { "text": "<your reply>", "schemeIds": ["id1", "id2"] }' +
    "\n4. If no scheme is relevant, use an empty schemeIds array." +
    "\n5. Never hallucinate scheme names or IDs outside the catalogue." +
    "\n6. Factor in the profile data above when the user mentions personal details."
  );
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function askGroq(
  userMessage: string,
  history: ChatMessage[],
  profile: CitizenProfile | null
): Promise<AssistantReply> {
  if (!GROQ_API_KEY) {
    console.error("VITE_GROQ_API_KEY is not set");
    return { text: "AI assistant is not configured. Please add VITE_GROQ_API_KEY to your .env file." };
  }

  const historyMessages: GroqMessage[] = history.slice(-6).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const messages: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt(profile) },
    ...historyMessages,
    { role: "user", content: userMessage },
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return { text: "Sorry, I could not reach the AI service right now. Please try again." };
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const rawContent = data.choices[0]?.message?.content ?? "{}";

    let parsed: { text?: string; schemeIds?: string[] } = {};
    try {
      parsed = JSON.parse(rawContent) as { text?: string; schemeIds?: string[] };
    } catch {
      return { text: rawContent };
    }

    const text = parsed.text?.trim() || "I found some relevant schemes for you. Please check the recommendations below.";
    const schemeIds: string[] = Array.isArray(parsed.schemeIds) ? parsed.schemeIds : [];

    const matchedSchemes = schemeIds
      .map((id) => schemes.find((s) => s.id === id))
      .filter((s) => s !== undefined);

    return {
      text,
      schemes: matchedSchemes.length > 0 ? matchedSchemes : undefined,
    };
  } catch (err) {
    console.error("Groq fetch error:", err);
    return { text: "I am having trouble connecting right now. Please check your internet connection and try again." };
  }
}
