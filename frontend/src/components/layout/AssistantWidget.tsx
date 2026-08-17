import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { InlineLoader } from "@/components/ui/LoadingSkeleton";
import { useAssistant } from "@/context/AssistantContext";

export function AssistantWidget() {
  const { t } = useTranslation();
  const { messages, typing, sendMessage } = useAssistant();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Listen for the HelpFab's custom event
  useEffect(() => {
    function handler() {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
    window.addEventListener("nagrik:open-assistant", handler);
    return () => window.removeEventListener("nagrik:open-assistant", handler);
  }, []);


  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = input;
    setInput("");
    await sendMessage(value);
  }

  const suggestions = [t("assistant.suggest1"), t("assistant.suggest2"), t("assistant.suggest3")];

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open ? (
        <section
          className="mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col rounded-lg border border-border bg-white shadow-soft"
          aria-label={t("assistant.title")}
        >
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2 font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e4f5f3] text-primary">
                <Bot aria-hidden="true" size={20} />
              </span>
              <div>
                <div>{t("assistant.title")}</div>
                <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Sparkles size={11} className="text-primary" aria-hidden="true" />
                  Powered by Groq AI
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant" title="Close assistant">
              <X aria-hidden="true" size={19} />
            </Button>
          </div>

          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="min-h-11 w-full rounded-lg border border-border bg-muted px-3 py-2 text-left text-sm font-semibold hover:bg-[#e4f5f3]"
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] rounded-lg border px-3 py-2 text-sm leading-6 ${
                    message.role === "user"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-foreground"
                  }`}
                >
                  <p>{message.content}</p>
                  {message.schemes?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.schemes.map((scheme) => (
                        <Link
                          key={scheme.id}
                          className="group flex flex-col rounded-md border border-primary/30 bg-white px-2 py-1.5 text-xs transition hover:border-primary hover:bg-[#e4f5f3]"
                          to={`/schemes/${scheme.id}`}
                          onClick={() => setOpen(false)}
                        >
                          <span className="font-semibold text-primary">{scheme.name}</span>
                          <span className="mt-0.5 capitalize text-muted-foreground">{scheme.category.replace("-", " ")} · {scheme.level}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {typing ? <InlineLoader label={t("assistant.typing")} /> : null}
            <div ref={bottomRef} />
          </div>

          <form className="flex gap-2 border-t border-border p-3" onSubmit={submit}>
            <input
              ref={inputRef}
              className="form-control flex-1"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("assistant.placeholder")}
              aria-label={t("assistant.placeholder")}
            />
            <Button size="icon" type="submit" aria-label={t("assistant.send")} title={t("assistant.send")}>
              <Send aria-hidden="true" size={18} />
            </Button>
          </form>
        </section>
      ) : null}

      <Button
        size="icon"
        onClick={() => {
          setOpen((value) => !value);
          window.setTimeout(() => inputRef.current?.focus(), 50);
        }}
        aria-label={t("assistant.launcher")}
        aria-expanded={open}
        title={t("assistant.launcher")}
        className="shadow-soft"
      >
        <MessageCircle aria-hidden="true" size={21} />
      </Button>
    </div>
  );
}
