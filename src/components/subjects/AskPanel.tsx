import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowUp, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { aiSubjectFor, type Subject } from "@/content/myp";

type Msg = { role: "user" | "assistant"; content: string };

/** One-off question to Refyn with study material as context. */
export const askRefyn = async (subject: Subject, prompt: string, context: string, history: Msg[] = []) => {
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      prompt,
      subject: aiSubjectFor(subject),
      gradeLevel: "high-school",
      processTeaching: true,
      sessionId: null,
      history,
      resourceContext: context.slice(0, 7000),
    },
  });
  if (error) throw error;
  return (data?.reply || data?.response || "I couldn't answer that just now. Please try again.") as string;
};

/**
 * A small chat about the page the student is reading. It uses the same
 * ai-chat function as the assistant, with the page sent as context.
 */
export const AskPanel: React.FC<{
  subject: Subject;
  title: string;
  context: string;
  kind: string;
  suggestions?: string[];
  className?: string;
}> = ({ subject, title, context, kind, suggestions, className }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs([]);
  }, [title]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const reply = await askRefyn(
        subject,
        q,
        `The student is reading a ${subject.name} (IB MYP) ${kind} in Refyn titled "${title}". Stay grounded in this material and keep replies short and clear.\n\n${context}`,
        history,
      );
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Something went wrong reaching Refyn. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  const chips = suggestions ?? ["Explain this more simply", "Give me an exam-style question", "What do students often get wrong here?"];
  const deepLink = `/ai-learning-assistant?resourceTitle=${encodeURIComponent(`${subject.name}: ${title}`)}&resourceDesc=${encodeURIComponent(context.slice(0, 1500))}`;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {msgs.length === 0 ? (
          <div className="rounded-2xl border border-lp-line bg-lp-deep/50 p-4">
            <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-white">
              <Sparkles className="h-3.5 w-3.5 text-lp-cyan" /> Ask about this {kind}
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-lp-mute">Refyn has read it too. It guides you to the answer rather than just giving it.</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => send(c)}
                  className="rounded-xl border border-lp-line bg-lp-surface px-3 py-2 text-left text-[12.5px] text-lp-soft transition-colors hover:border-lp-sky/40 hover:text-white"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-6 rounded-2xl rounded-br-md bg-lp-blue px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
                {m.content}
              </div>
            ) : (
              <div key={i} className="lp-md mr-2 rounded-2xl rounded-bl-md border border-lp-line bg-lp-surface px-3.5 py-2.5 !text-[13.5px] !leading-relaxed">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ),
          )
        )}
        {busy && (
          <div className="lp-dots mr-2 inline-flex gap-1 rounded-2xl border border-lp-line bg-lp-surface px-3.5 py-3" aria-label="Refyn is thinking">
            <span />
            <span />
            <span />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-end gap-2 rounded-2xl border border-lp-line bg-lp-deep/70 p-1.5 focus-within:border-lp-sky/50"
      >
        <label className="sr-only" htmlFor="ask-input">
          Ask about this {kind}
        </label>
        <textarea
          id="ask-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={`Ask me anything about this ${kind}`}
          className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] text-white placeholder:text-lp-mute focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lp-blue text-white transition-colors hover:bg-[#2F6FE0] disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
      <Link to={deepLink} className="mt-2 inline-flex items-center gap-1 self-start text-[12px] text-lp-mute hover:text-lp-sky">
        Continue in the AI assistant <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
};
