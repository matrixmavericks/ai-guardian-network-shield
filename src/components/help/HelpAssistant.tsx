import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Bot, Loader2, MousePointerClick, PlayCircle, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { confidentMatch, matchHelp } from "@/help/match";
import { Rich } from "@/help/useHelpData";
import type { HelpData, HelpItem } from "@/help/types";

// "Ask Refyn": answers straight from the help centre when a question clearly
// matches one, and asks the help-assistant function (AI grounded in the same
// FAQ, capped per visitor) for anything else.

type Msg = { role: "user" | "assistant"; text: string; items?: HelpItem[]; kind?: "instant" | "ai" | "fallback" };

const PAGE_NAMES: Record<string, string> = { "/demo": "the live demo", "/tour": "the guided tour", "/register": "Get started", "/help": "the help centre" };

/**
 * Replies can point to /demo, /tour, /register or /help, either as
 * [label](/path) or as a bare path (often in brackets): make those links.
 */
const Reply: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\[[^\]]+\]\(\/(?:demo|tour|register|help)[^)]*\)|\(?\/(?:demo|tour|register|help)(?:#[\w-]+)?\)?)/g).map((part, i) => {
      if (i % 2 === 0) return <Rich key={i} text={part} />;
      const md = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      const to = md ? md[2] : part.replace(/[()]/g, "");
      const label = md ? md[1] : PAGE_NAMES[to.split("#")[0]] ?? to;
      // A bare "(/demo)" after the page's name adds nothing but the link
      const bare = !md && part.startsWith("(");
      return (
        <Link key={i} to={to} className="font-medium text-lp-sky underline-offset-2 hover:underline">
          {bare ? "↗" : label}
        </Link>
      );
    })}
  </>
);

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/help-assistant`;
const SUGGEST = ["How do I join a class?", "Will it just give students the answers?", "How does AI marking work?", "Can I try it without an account?"];

async function askAi(question: string, history: Msg[]) {
  const res = await fetch(FN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ question, history: history.slice(-6).map((m) => ({ role: m.role, content: m.text })) }),
  });
  const data = (await res.json().catch(() => ({}))) as { reply?: string; sources?: string[]; error?: string };
  if (!res.ok || !data.reply) throw new Error(data.error || String(res.status));
  return { reply: data.reply, sources: data.sources ?? [] };
}

const HelpAssistant: React.FC<{ data: HelpData | null; onWatch: (i: HelpItem) => void; onShow: (i: HelpItem) => void; onOpen: (i: HelpItem) => void }> = ({
  data,
  onWatch,
  onShow,
  onOpen,
}) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const all = data?.categories.flatMap((c) => c.items) ?? [];

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy || !data) return;
    setText("");
    const history = msgs;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    const matches = matchHelp(data, question);
    const sure = confidentMatch(matches);
    if (sure) {
      setMsgs((m) => [...m, { role: "assistant", text: sure.a, items: [sure], kind: "instant" }]);
      return;
    }
    setBusy(true);
    try {
      const { reply, sources } = await askAi(question, history);
      const items = sources.map((id) => all.find((i) => i.id === id)).filter((i): i is HelpItem => !!i);
      setMsgs((m) => [...m, { role: "assistant", text: reply, items, kind: "ai" }]);
    } catch (e) {
      const limited = (e as Error).message === "limit";
      const top = matches.slice(0, 3).map((x) => x.item);
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          kind: "fallback",
          items: top,
          text: limited
            ? "You've asked a lot of questions in the last hour, so I'm answering from the help centre for now."
            : top.length
              ? "I couldn't reach the AI just now, but these answers look closest:"
              : "I couldn't reach the AI just now. Try the live demo, or choose Get started to reach the team.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ask-title" className="flex max-h-[min(720px,calc(100vh-7rem))] min-h-[420px] flex-col overflow-hidden rounded-[24px] border border-lp-line bg-lp-surface/70 shadow-[0_30px_80px_-40px_rgba(29,78,216,0.6)] backdrop-blur">
      <div className="flex items-center gap-3 border-b border-lp-line px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#7ff3ff] text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="ask-title" className="text-[15.5px] font-semibold text-white">Ask Refyn Help</h2>
          <p className="text-[12.5px] text-lp-mute">Instant answers from this page, and AI for anything else.</p>
        </div>
      </div>

      <div ref={list} data-lenis-prevent className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {!msgs.length && (
          <div>
            <p className="px-1 text-[13.5px] leading-relaxed text-lp-soft">Ask anything about Refyn: how something works, where to find it, or whether it can do what you need.</p>
            <div className="mt-3 flex flex-col gap-2">
              {SUGGEST.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={!data} className="rounded-xl border border-lp-line bg-lp-deep/40 px-3 py-2 text-left text-[13.5px] text-lp-text transition-colors hover:border-lp-sky/50 hover:text-white">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#3b82f6] px-3.5 py-2 text-[14px] text-white">
              {m.text}
            </p>
          ) : (
            <div key={i} className="max-w-[95%] rounded-2xl rounded-bl-md border border-lp-line bg-lp-deep/50 px-3.5 py-3 text-[14px] leading-relaxed text-lp-soft">
              {m.kind === "instant" && (
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lp-cyan">
                  <Zap className="h-3 w-3" /> From the help centre
                </p>
              )}
              {m.kind === "ai" && (
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lp-sky">
                  <Sparkles className="h-3 w-3" /> AI answer from the help centre
                </p>
              )}
              <p className="whitespace-pre-line">
                <Reply text={m.text} />
              </p>
              {!!m.items?.length && (
                <div className="mt-2.5 space-y-2">
                  {m.items.map((it) => (
                    <div key={it.id} className="rounded-xl border border-lp-line bg-lp-surface/60 p-2.5">
                      {(m.kind !== "instant" || m.items!.length > 1) && (
                        <button type="button" onClick={() => onOpen(it)} className="block text-left text-[13px] font-medium text-white hover:text-lp-sky">
                          {it.q}
                        </button>
                      )}
                      <div className={cn("flex flex-wrap gap-1.5", (m.kind !== "instant" || m.items!.length > 1) && "mt-2")}>
                        {it.video && (
                          <button type="button" onClick={() => onWatch(it)} className="inline-flex h-7 items-center gap-1 rounded-full border border-lp-line px-2.5 text-[12px] text-lp-text hover:border-lp-sky/50 hover:text-white">
                            <PlayCircle className="h-3.5 w-3.5 text-lp-cyan" /> Watch
                          </button>
                        )}
                        {it.demo && (
                          <button type="button" onClick={() => onShow(it)} className="inline-flex h-7 items-center gap-1 rounded-full border border-lp-line px-2.5 text-[12px] text-lp-text hover:border-lp-sky/50 hover:text-white">
                            <MousePointerClick className="h-3.5 w-3.5 text-lp-cyan" /> Show me
                          </button>
                        )}
                        {m.kind === "instant" && m.items!.length === 1 && (
                          <button type="button" onClick={() => onOpen(it)} className="inline-flex h-7 items-center rounded-full px-2 text-[12px] text-lp-mute hover:text-white">
                            Open in the list
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {busy && (
          <p className="flex items-center gap-2 px-1 text-[13px] text-lp-mute">
            <Loader2 className="h-4 w-4 animate-spin text-lp-sky" /> Thinking…
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="flex items-center gap-2 border-t border-lp-line p-3"
      >
        <label htmlFor="help-ask" className="sr-only">
          Ask a question
        </label>
        <input
          id="help-ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Ask a question…"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-xl border border-lp-line bg-lp-deep/60 px-3.5 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-sky/60"
        />
        <button type="submit" disabled={!text.trim() || busy || !data} aria-label="Ask" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3b82f6] text-white transition-colors hover:bg-[#2f6fe0] disabled:opacity-40">
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </section>
  );
};

export default HelpAssistant;
