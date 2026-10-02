import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Award, Check, Copy, ExternalLink, Flag, Lightbulb, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { splitReply } from "@/components/assistant/files/outputs";
import { FileCard } from "@/components/assistant/files/FileCard";
import { BlockView } from "@/components/assistant/powers/BlockView";
import { streamChat } from "@/components/assistant/powers/chatStream";
import { canSpeak, speakable, useDictation, useSpeaker } from "@/components/assistant/powers/voice";
import { GemOrb } from "./ui";
import { PALETTE, type Character, type SpaceColor } from "./spaces";

// One chat with a Gem, a World's guide, or the characters of a role-play scene.
// Replies stream from ai-chat, which loads the Gem / World / scene with the
// person's own permissions. Chats are saved like any other Refyn chat (tagged
// with the Gem, World or scene) unless `ephemeral` (the Gem builder's "Try it").

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Msg = { id: string; role: "user" | "assistant"; content: string; streaming?: boolean; system?: "start" | "debrief" };

const START = "Begin the scene.";
const DEBRIEF = "Debrief: step out of character and tell me how I did.";

/* ---------- role-play lines ---------- */

type Beat = { who: string | null; text: string; kind: "say" | "narrate" | "note" };

/** A scene reply → character lines (**Name:** ...), stage directions and out-of-character notes. */
export function sceneBeats(reply: string): Beat[] {
  const out: Beat[] = [];
  for (const raw of reply.split(/\n+/)) {
    const l = raw.trim();
    if (!l) continue;
    const m = l.match(/^\*\*([^*\n]{1,60}?)\s*:\s*\*\*\s*(.*)$/) || l.match(/^\*\*([^*\n]{1,60}?)\*\*\s*:\s*(.*)$/);
    if (m) { out.push({ who: m[1].trim(), text: m[2], kind: "say" }); continue; }
    const it = l.match(/^[_*]([^_*][\s\S]*?)[_*]$/);
    if (it) {
      const t = it[1].trim();
      out.push({ who: null, text: t.replace(/^\(?(out of character|ooc|note)\)?\s*[:-]?\s*/i, ""), kind: /^\(?(out of character|ooc|note)\b/i.test(t) ? "note" : "narrate" });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.kind === "say") last.text += `\n\n${l}`;
    else out.push({ who: null, text: l, kind: "narrate" });
  }
  return out;
}

const CHAR_COLORS: SpaceColor[] = ["violet", "amber", "aqua", "rose"];

const castOf = (characters: Character[]) => {
  const list = characters.map((c, i) => ({ ...c, color: CHAR_COLORS[i % CHAR_COLORS.length] }));
  return (name: string | null) => {
    if (!name) return null;
    const n = name.toLowerCase();
    return list.find((c) => c.name.toLowerCase() === n) ?? list.find((c) => n.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(n)) ?? { name, emoji: "🎭", persona: "", color: "slate" as SpaceColor };
  };
};

const SceneReply: React.FC<{ content: string; cast: ReturnType<typeof castOf>; streaming?: boolean }> = ({ content, cast, streaming }) => {
  const beats = useMemo(() => sceneBeats(content), [content]);
  return (
    <div className="space-y-3">
      {beats.map((b, i) => {
        if (b.kind === "narrate") return <p key={i} className="mx-auto max-w-[620px] text-center text-[14px] italic leading-relaxed text-lp-soft">{b.text.replace(/\*\*/g, "")}</p>;
        if (b.kind === "note") return (
          <p key={i} className="mx-auto flex max-w-[620px] items-start gap-2 rounded-xl border border-lp-amber/30 bg-lp-amber/10 px-3 py-2 text-[13px] text-lp-soft">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-lp-amber" /><span><span className="font-medium text-white">Out of character: </span>{b.text}</span>
          </p>
        );
        const c = cast(b.who)!;
        const p = PALETTE[c.color];
        return (
          <div key={i} className="lp-fade flex gap-3">
            <GemOrb color={c.color} emoji={c.emoji} size="sm" className="mt-5" />
            <div className="min-w-0 max-w-[680px]">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-white"><span className="h-1.5 w-1.5 rounded-full" style={{ background: p.b }} />{c.name}</p>
              <div className="sp-say border border-lp-line bg-lp-surface px-4 py-3" style={{ boxShadow: `inset 3px 0 0 ${p.b}` }}>
                <div className="lp-md !text-[15px]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{b.text}</ReactMarkdown></div>
              </div>
            </div>
          </div>
        );
      })}
      {streaming && <span className="sp-typing ml-[52px] inline-flex text-lp-sky" aria-label="Writing"><span /><span /><span /></span>}
    </div>
  );
};

/* ---------- the chat ---------- */

export const SpaceChat: React.FC<{
  mode: "gem" | "world" | "scene";
  gemId?: string | null;
  worldId?: string | null;
  sceneId?: string | null;
  /** Who answers (Gem or guide); scenes use the cast instead */
  who: { name: string; emoji: string; color: SpaceColor };
  characters?: Character[];
  starters?: string[];
  empty?: React.ReactNode;
  ephemeral?: boolean;
  /** Runs before each message (the builder saves the draft first): false cancels, or it can supply the Gem's id */
  beforeSend?: () => Promise<boolean | { gemId: string }>;
  sessionId?: string | null;
  onSession?: (id: string) => void;
  subject?: string;
  title?: string;
  placeholder?: string;
  className?: string;
  /** Leave room for the phone menu button (bottom right) on full-page chats */
  fabSafe?: boolean;
}> = ({ mode, gemId, worldId, sceneId, who, characters = [], starters = [], empty, ephemeral, beforeSend, sessionId: resume = null, onSession, subject, title, placeholder, className, fabSafe }) => {
  const { user } = useAuth();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const [messages, setMessages] = useState<Msg[]>([]);
  // The chat to resume is read once: remount (key) to open another
  const [initialSession] = useState(resume);
  const [sessionId, setSessionId] = useState<string | null>(initialSession);
  const [loading, setLoading] = useState(!!initialSession);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [voices, setVoices] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);
  const speaker = useSpeaker();
  const cast = useMemo(() => castOf(characters), [characters]);
  const dictation = useDictation((t) => setText((v) => (v ? `${v} ${t}` : t)));

  // Load a saved chat
  useEffect(() => {
    if (!initialSession) return;
    let live = true;
    db.from("ai_chat_messages").select("id, role, content, metadata").eq("session_id", initialSession).order("created_at", { ascending: true }).then(({ data }: { data: { id: string; role: string; content: string; metadata: { system?: Msg["system"] } | null }[] | null }) => {
      if (!live) return;
      setMessages((data ?? []).map((m) => ({ id: m.id, role: m.role === "user" ? "user" : "assistant", content: m.content, system: m.metadata?.system })));
      setLoading(false);
      started.current = true;
    });
    return () => { live = false; };
  }, [initialSession]);

  // Keep the newest line in view while the reader is near the bottom
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    const last = messages[messages.length - 1];
    if (near || last?.role === "user") el.scrollTo({ top: el.scrollHeight, behavior: last?.streaming ? "auto" : "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  /** Scene voices: each character gets their own voice and pitch. */
  const speakScene = useCallback((reply: string) => {
    if (!canSpeak()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const lang = (navigator.language || "en").slice(0, 2);
    const pool = synth.getVoices().filter((v) => v.lang.startsWith(lang));
    sceneBeats(reply).forEach((b) => {
      const t = speakable(b.text);
      if (!t || b.kind === "note") return;
      const u = new SpeechSynthesisUtterance(t);
      const i = b.who ? Math.max(0, characters.findIndex((c) => c.name.toLowerCase() === b.who!.toLowerCase())) : -1;
      if (pool.length) u.voice = pool[(i + 1) % pool.length];
      u.pitch = i < 0 ? 1 : [0.85, 1.15, 0.95, 1.25][i % 4];
      u.rate = b.kind === "narrate" ? 0.98 : 1.03;
      synth.speak(u);
    });
  }, [characters]);

  const ensureSession = async (first: string): Promise<string | null> => {
    if (ephemeral || !user) return null;
    if (sessionId) return sessionId;
    const label = mode === "scene" ? `🎭 ${title ?? "Scene"}` : `${who.emoji} ${who.name}: ${first}`;
    const { data, error: e } = await db.from("ai_chat_sessions")
      .insert({ user_id: user.id, subject: subject || "general", title: label.slice(0, 80), gem_id: gemId ?? null, world_id: worldId ?? null, scene_id: sceneId ?? null })
      .select("id").single();
    if (e || !data) return null;
    setSessionId(data.id);
    onSession?.(data.id);
    return data.id;
  };

  const save = (sid: string | null, role: "user" | "assistant", content: string, metadata: Record<string, unknown> = {}) =>
    sid && user ? db.from("ai_chat_messages").insert({ session_id: sid, user_id: user.id, role, content, moderation_status: (metadata.moderationStatus as string) || "approved", severity: (metadata.severity as string) || "low", metadata }) : Promise.resolve();

  const send = async (raw: string, system?: Msg["system"]) => {
    const prompt = raw.trim();
    if (!prompt || sending || !user) return;
    setError("");
    let gem = gemId;
    if (beforeSend) {
      const ok = await beforeSend();
      if (!ok) return;
      if (typeof ok === "object") gem = ok.gemId;
    }
    const base = messages;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: prompt, system };
    setMessages((m) => [...m, userMsg]);
    if (!system) setText("");
    setSending(true);
    speaker.stop();
    const id = crypto.randomUUID();
    try {
      const sid = await ensureSession(system ? title ?? who.name : prompt);
      await save(sid, "user", prompt, system ? { system } : {});
      setMessages((m) => [...m, { id, role: "assistant", content: "", streaming: true }]);
      const controller = new AbortController();
      abort.current = controller;
      let frame = 0;
      let latest = "";
      const result = await streamChat(
        {
          prompt, subject: subject || "general", gradeLevel: "high-school", processTeaching: false, sessionId: sid ?? undefined,
          history: base.slice(-30).map((m) => ({ role: m.role, content: m.content })),
          gemId: gem ?? undefined, worldId: worldId ?? undefined, sceneId: sceneId ?? undefined,
          powers: mode !== "scene", live: mode === "gem", library: false, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        { delta: (_, full) => { latest = full; if (!frame) frame = requestAnimationFrame(() => { frame = 0; setMessages((m) => m.map((x) => (x.id === id ? { ...x, content: latest } : x))); }); } },
        controller.signal,
      ).catch((e) => { if ((e as Error).name === "AbortError") return { kind: "stream" as const, text: latest, meta: {}, interrupted: false, aborted: true }; throw e; });
      if (frame) cancelAnimationFrame(frame);
      let reply: string;
      let meta: Record<string, unknown> = {};
      if (result.kind === "json") {
        const d = result.data ?? {};
        reply = (typeof d.reply === "string" && d.reply) || (typeof d.response === "string" && d.response) || "";
        meta = (d.meta as Record<string, unknown>) ?? {};
        if (!reply) throw new Error(typeof d.error === "string" ? d.error : "Refyn couldn't reply just now. Try again.");
      } else {
        meta = result.meta;
        reply = result.text;
        if (result.aborted) reply = reply ? `${reply}\n\n_Stopped._` : "_Stopped._";
        else if (result.interrupted) reply = reply ? `${reply}\n\n_The reply was cut off. Try again for the rest._` : "";
        if (!reply) throw new Error("Refyn couldn't reply just now. Try again.");
      }
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, content: reply, streaming: false } : x)));
      await save(sid, "assistant", reply, meta);
      if (voices && mode === "scene") speakScene(reply);
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== id));
      setError((e as Error).message || "Something went wrong. Try again.");
    } finally {
      abort.current = null;
      setSending(false);
    }
  };

  // Scenes open themselves: the characters set the scene
  useEffect(() => {
    if (mode !== "scene" || initialSession || started.current || !user) return;
    started.current = true;
    send(START, "start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialSession, user]);

  const submit = (e?: React.FormEvent) => { e?.preventDefault(); if (dictation.listening) dictation.stop(); send(text); };
  const debriefed = messages.some((m) => m.system === "debrief");
  const visible = messages.filter((m) => m.system !== "start");
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" aria-live="polite">
        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="lp-skeleton h-16 rounded-2xl" />)}</div>
        ) : !visible.length && !sending ? (
          <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
            {empty}
            {starters.length > 0 && (
              <div className="mt-5 flex max-w-[640px] flex-wrap justify-center gap-2">
                {starters.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-lp-line bg-lp-surface/70 px-3.5 py-2 text-[13px] text-lp-soft transition-colors hover:border-lp-sky/50 hover:text-white">{s}</button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-[820px] space-y-6">
            {mode === "scene" && messages[0]?.system === "start" && (
              <p className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-lp-mute"><span className="h-px w-10 bg-lp-line" /> Scene begins <span className="h-px w-10 bg-lp-line" /></p>
            )}
            {visible.map((m, i) => {
              if (m.role === "user") {
                if (m.system === "debrief") return <p key={m.id} className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-lp-mute"><span className="h-px w-10 bg-lp-line" /> Debrief <span className="h-px w-10 bg-lp-line" /></p>;
                return (
                  <div key={m.id} className="lp-fade flex justify-end">
                    <div className="max-w-[85%] rounded-[18px_18px_4px_18px] bg-lp-blue px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.9)]">
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                );
              }
              const afterDebrief = visible[i - 1]?.system === "debrief";
              if (mode === "scene" && !afterDebrief) {
                return m.content || !m.streaming ? <SceneReply key={m.id} content={m.content} cast={cast} streaming={m.streaming} /> : (
                  <div key={m.id} className="flex items-center gap-3">
                    <GemOrb color={cast(characters[0]?.name ?? null)?.color ?? "slate"} emoji={characters[0]?.emoji ?? "🎭"} size="sm" live />
                    <span className="sp-typing inline-flex text-lp-sky" aria-label="Writing"><span /><span /><span /></span>
                  </div>
                );
              }
              const segs = splitReply(m.content);
              const body = (
                <>
                  {segs.map((seg, k) =>
                    seg.type === "text" ? <div key={k} className="lp-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.text}</ReactMarkdown></div>
                    : seg.type === "block" ? <BlockView key={k} kind={seg.kind} attrs={seg.attrs} body={seg.body} complete={seg.complete} teacher={teacher} onAsk={(p) => send(p)} files={segs.flatMap((s) => (s.type === "file" && s.complete ? [s.file] : []))} />
                    : seg.type === "file" ? <FileCard key={k} file={seg.file} complete={seg.complete} teacher={teacher} />
                    : null,
                  )}
                  {m.streaming && <span className="lp-dots mt-1 inline-flex items-center gap-1" aria-label="Still writing"><span /><span /><span /></span>}
                </>
              );
              if (afterDebrief) {
                return (
                  <div key={m.id} className="lp-fade rounded-3xl border border-lp-amber/40 bg-gradient-to-br from-lp-amber/10 to-transparent p-5">
                    <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-lp-amber"><Award className="h-4 w-4" /> Your debrief</p>
                    {body}
                  </div>
                );
              }
              return (
                <div key={m.id} className="lp-fade group flex gap-3">
                  <GemOrb color={who.color} emoji={who.emoji} size="sm" className="mt-0.5" live={m.streaming && !m.content} />
                  <div className="min-w-0 flex-1">
                    {body}
                    {!m.streaming && m.content && (
                      <div className={cn("mt-1.5 flex items-center gap-0.5 transition-opacity group-hover:opacity-100", m.id === lastAssistant?.id ? "opacity-100" : "opacity-0")}>
                        <button type="button" aria-label="Copy reply" title="Copy" onClick={async () => { try { await navigator.clipboard.writeText(m.content); setCopied(m.id); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ } }} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white">
                          {copied === m.id ? <Check className="h-4 w-4 text-lp-green" /> : <Copy className="h-4 w-4" />}
                        </button>
                        {speaker.supported && (
                          <button type="button" aria-label={speaker.speaking === m.id ? "Stop reading" : "Read aloud"} title={speaker.speaking === m.id ? "Stop" : "Read aloud"} onClick={() => (speaker.speaking === m.id ? speaker.stop() : speaker.speak(m.id, m.content))} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white">
                            {speaker.speaking === m.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={cn("shrink-0 px-3 pb-3 pt-1 sm:px-5 sm:pb-4", fabSafe && "pr-[78px] sm:pr-[84px] lg:pr-5")}>
        {error && <p role="alert" className="mx-auto mb-2 max-w-[820px] rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}
        <form onSubmit={submit} className="mx-auto max-w-[820px] rounded-2xl border border-lp-line bg-lp-surface/90 p-2 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)] backdrop-blur focus-within:border-lp-sky/50">
          <textarea
            ref={input}
            value={dictation.interim ? `${text}${text ? " " : ""}${dictation.interim}` : text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            rows={1}
            placeholder={placeholder ?? `Message ${who.name}…`}
            aria-label={placeholder ?? `Message ${who.name}`}
            className="block max-h-40 min-h-[44px] w-full resize-none bg-transparent px-2.5 py-2.5 text-[15px] text-white outline-none placeholder:text-lp-mute"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-1">
              {dictation.supported && (
                <button type="button" onClick={() => (dictation.listening ? dictation.stop() : dictation.start())} aria-pressed={dictation.listening} aria-label={dictation.listening ? "Stop dictation" : "Speak"} title={dictation.listening ? "Stop" : "Speak"} className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-white/[0.06] hover:text-white", dictation.listening && "bg-lp-red/15 text-lp-red")}>
                  <Mic className="h-4 w-4" />
                </button>
              )}
              {mode === "scene" && canSpeak() && (
                <button type="button" onClick={() => { setVoices((v) => !v); if (voices) window.speechSynthesis.cancel(); }} aria-pressed={voices} title="Hear the characters speak" className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] text-lp-mute hover:bg-white/[0.06] hover:text-white", voices && "bg-lp-blue/15 text-lp-sky")}>
                  {voices ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Voices
                </button>
              )}
              {mode === "scene" && visible.length > 1 && !debriefed && (
                <button type="button" disabled={sending} onClick={() => send(DEBRIEF, "debrief")} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] text-lp-amber hover:bg-lp-amber/10 disabled:opacity-50">
                  <Flag className="h-4 w-4" /> End and debrief
                </button>
              )}
              {sessionId && !ephemeral && (
                <Link to={`/ai-learning-assistant?session=${sessionId}`} className="hidden h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] text-lp-mute hover:bg-white/[0.06] hover:text-white sm:inline-flex">
                  <ExternalLink className="h-3.5 w-3.5" /> Open in chats
                </Link>
              )}
            </div>
            {sending ? (
              <button type="button" onClick={() => abort.current?.abort()} aria-label="Stop" className="flex h-9 w-9 items-center justify-center rounded-xl bg-lp-raised text-white hover:bg-lp-line"><Square className="h-3.5 w-3.5 fill-current" /></button>
            ) : (
              <button type="submit" disabled={!text.trim()} aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-xl bg-lp-blue text-white disabled:opacity-40"><ArrowUp className="h-[18px] w-[18px]" /></button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
