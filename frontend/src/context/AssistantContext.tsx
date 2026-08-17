import { createContext, useContext, useMemo, useRef, useState } from "react";
import { askGroq } from "@/lib/groqApi";
import { useAppState } from "@/context/AppStateContext";
import type { Scheme } from "@/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  schemes?: Scheme[];
}

interface AssistantContextValue {
  messages: ChatMessage[];
  typing: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const { profile } = useAppState();
  // Keep a ref to always have the latest messages inside the async closure
  const messagesRef = useRef<ChatMessage[]>([]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messagesRef.current, userMessage];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setTyping(true);

    // Pass the history BEFORE the user message so the AI sees prior context
    const reply = await askGroq(trimmed, messagesRef.current.slice(0, -1), profile);
    setTyping(false);

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: reply.text,
      schemes: reply.schemes,
    };

    const finalMessages = [...messagesRef.current, assistantMessage];
    messagesRef.current = finalMessages;
    setMessages(finalMessages);
  }

  const value = useMemo(
    () => ({
      messages,
      typing,
      sendMessage,
      clearMessages: () => {
        messagesRef.current = [];
        setMessages([]);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, typing],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return context;
}

