import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, Check, Drama, FileUp, Loader2, MessageSquare, Plus, RotateCcw, Save, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ACCEPT } from "@/components/assistant/files/extract";
import { ColorPicker, EmojiPicker, GemOrb, ShareControl, SpaceShell, field, ghost, label, primary } from "@/components/spaces/ui";
import { SpaceChat } from "@/components/spaces/SpaceChat";
import { GEM_TEMPLATES, KNOWLEDGE_TOTAL_CHARS, deleteGem, draftGem, getGem, readKnowledge, saveGem, type GemDraft } from "@/components/spaces/spaces";

const BLANK: GemDraft = { kind: "assistant", name: "", tagline: "", emoji: "✨", color: "violet", instructions: "", starters: [], knowledge: [], visibility: "private", class_ids: [] };
const IDEAS = {
  assistant: ["A maths coach who never gives answers, only hints", "A French conversation partner for beginners", "A lab report checker for the MYP science criteria", "A revision buddy that quizzes me on history dates"],
  character: ["Ada Lovelace explaining her notes on the Analytical Engine", "A Roman senator in 44 BC", "A marine biologist on a coral reef research boat", "Isaac Newton in 1687"],
};

const Section: React.FC<{ n: number; title: string; hint?: string; children: React.ReactNode }> = ({ n, title, hint, children }) => (
  <section className="rounded-3xl border border-lp-line bg-lp-surface p-5">
    <div className="mb-4 flex items-baseline gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lp-blue/15 text-[11.5px] font-semibold text-lp-sky">{n}</span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        {hint && <p className="mt-0.5 text-[12.5px] text-lp-mute">{hint}</p>}
      </div>
    </div>
    {children}
  </section>
);

const GemBuilderPage: React.FC = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const [draft, setDraft] = useState<GemDraft | null>(id ? null : BLANK);
  const [savedId, setSavedId] = useState<string | null>(id ?? null);
  const [worldId, setWorldId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [idea, setIdea] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [reading, setReading] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pane, setPane] = useState<"build" | "try">("build");
  const [tryKey, setTryKey] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  // Load the Gem being edited, or a starter template
  useEffect(() => {
    if (id) {
      getGem(id).then((g) => {
        if (!g || g.owner_id !== user?.id) { setError("You can only edit Gems you made."); setDraft(BLANK); return; }
        setDraft({ id: g.id, kind: g.kind, name: g.name, tagline: g.tagline, emoji: g.emoji, color: g.color, instructions: g.instructions, starters: g.starters, knowledge: g.knowledge, visibility: g.visibility, class_ids: g.class_ids, world_id: g.world_id });
        setWorldId(g.world_id);
      }, (e) => setError(e.message));
      return;
    }
    const t = GEM_TEMPLATES.find((x) => x.name === params.get("t"));
    if (t) setDraft({ ...BLANK, kind: t.kind, name: t.name, tagline: t.tagline, emoji: t.emoji, color: t.color, instructions: t.instructions, starters: t.starters });
  }, [id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<GemDraft>) => { setDraft((d) => (d ? { ...d, ...patch } : d)); setDirty(true); setNotice(""); };

  const persist = async (): Promise<string | null> => {
    if (!draft || !user) return null;
    if (!draft.name.trim()) { setError("Give your Gem a name first."); setPane("build"); return null; }
    setSaving(true);
    setError("");
    try {
      const g = await saveGem(user.id, { ...draft, id: savedId ?? undefined });
      setSavedId(g.id);
      setDraft((d) => (d ? { ...d, id: g.id } : d));
      setDirty(false);
      return g.id;
    } catch (e) {
      setError((e as Error).message.includes("row-level security") ? "You can only share with classes you teach." : (e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    const g = await persist();
    if (!g) return;
    setNotice("Saved");
    // A new Gem gets its own address (kept out of Try it, so a chat in progress isn't reset)
    if (!id) navigate(`/gems/${g}/edit`, { replace: true });
  };

  const writeWithAI = async () => {
    if (!draft || !idea.trim()) return;
    setDrafting(true);
    setError("");
    try {
      const g = await draftGem(idea.trim(), draft.kind);
      set({ name: g.name, tagline: g.tagline, emoji: g.emoji, color: g.color, instructions: g.instructions, starters: g.starters });
      setTryKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDrafting(false);
    }
  };

  const addFiles = async (files: FileList | null) => {
    if (!draft || !files?.length) return;
    setError("");
    const added = [];
    let total = draft.knowledge.reduce((a, k) => a + k.chars, 0);
    for (const f of Array.from(files)) {
      try {
        setReading(`Reading ${f.name}`);
        const k = await readKnowledge(f, (s) => setReading(`${s}: ${f.name}`));
        if (total + k.chars > KNOWLEDGE_TOTAL_CHARS) { setError(`${f.name} would take the Gem past its knowledge limit (about ${Math.round(KNOWLEDGE_TOTAL_CHARS / 1000)}k characters). Remove a file first.`); break; }
        total += k.chars;
        added.push(k);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    setReading("");
    if (added.length) set({ knowledge: [...draft.knowledge, ...added] });
    if (fileInput.current) fileInput.current.value = "";
  };

  const remove = async () => {
    if (!savedId) { navigate("/gems"); return; }
    try {
      await deleteGem(savedId);
      navigate(worldId ? `/world/${worldId}` : "/gems", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!draft) return <SpaceShell><div className="m-auto"><Loader2 className="h-6 w-6 animate-spin text-lp-sky" /></div></SpaceShell>;
  const used = draft.knowledge.reduce((a, k) => a + k.chars, 0);
  const back = worldId ? `/world/${worldId}` : savedId ? `/gems/${savedId}` : "/gems";

  const editor = (
    <div className="mx-auto w-full max-w-[640px] space-y-4 px-4 pb-32 pt-5 sm:px-6 lg:pb-10">
      {!worldId && (
        <section className="relative overflow-hidden rounded-3xl border border-lp-sky/30 bg-gradient-to-br from-lp-blue/15 via-lp-surface to-lp-surface p-5">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, rgba(167,139,250,0.6), transparent 70%)" }} />
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-white"><Wand2 className="h-4 w-4 text-lp-sky" /> Describe it, Refyn writes it</p>
          <div className="mt-3 inline-flex rounded-xl border border-lp-line bg-lp-deep/50 p-1" role="radiogroup" aria-label="Kind of Gem">
            {([["assistant", "Assistant", Bot], ["character", "Character", Drama]] as const).map(([k, l, Icon]) => (
              <button key={k} type="button" role="radio" aria-checked={draft.kind === k} onClick={() => set({ kind: k })} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px]", draft.kind === k ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}><Icon className="h-3.5 w-3.5" /> {l}</button>
            ))}
          </div>
          <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} placeholder={draft.kind === "character" ? "Who should it be? e.g. Ada Lovelace explaining her notes" : "What should it do? e.g. a maths coach who only gives hints"} aria-label="Describe your Gem" className={cn(field, "mt-3 resize-none")} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEAS[draft.kind].map((s) => <button key={s} type="button" onClick={() => setIdea(s)} className="rounded-full border border-lp-line px-2.5 py-1 text-[11.5px] text-lp-mute hover:border-lp-sky/40 hover:text-white">{s}</button>)}
          </div>
          <button type="button" onClick={writeWithAI} disabled={drafting || !idea.trim()} className={cn(primary, "mt-3")}>
            {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {drafting ? "Writing your Gem…" : "Write it with AI"}
          </button>
        </section>
      )}

      <Section n={1} title="Look and name">
        <div className={cn("flex flex-wrap items-center gap-5", drafting && "animate-pulse")}>
          <EmojiPicker value={draft.emoji} color={draft.color} onChange={(e) => set({ emoji: e })} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <input value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} placeholder="Name" aria-label="Name" className={cn(field, "text-[16px] font-semibold")} />
            <input value={draft.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={160} placeholder="One line about what it does" aria-label="Tagline" className={field} />
          </div>
        </div>
        <div className="mt-4"><ColorPicker value={draft.color} onChange={(c) => set({ color: c })} /></div>
      </Section>

      <Section n={2} title="Instructions" hint={draft.kind === "character" ? "Who they are, how they speak, what they know, and what they'd push back on." : "Its purpose, personality, how it helps, and what it never does."}>
        <textarea value={draft.instructions} onChange={(e) => set({ instructions: e.target.value })} rows={11} maxLength={8000} placeholder="You are…" aria-label="Instructions" className={cn(field, "resize-y font-[450] leading-relaxed", drafting && "animate-pulse")} />
        <p className="mt-1 text-right text-[11.5px] tabular-nums text-lp-mute">{draft.instructions.length.toLocaleString()} / 8,000</p>
        {!teacher && <p className="mt-1 text-[11.5px] text-lp-mute">Gems help you learn: they won't write work you hand in, whatever the instructions say.</p>}
      </Section>

      <Section n={3} title="Conversation starters" hint="Shown as one-tap buttons when a chat begins.">
        <div className="space-y-2">
          {draft.starters.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input value={s} onChange={(e) => set({ starters: draft.starters.map((x, k) => (k === i ? e.target.value : x)) })} maxLength={200} aria-label={`Starter ${i + 1}`} className={field} />
              <button type="button" onClick={() => set({ starters: draft.starters.filter((_, k) => k !== i) })} aria-label="Remove starter" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-lp-mute hover:bg-lp-raised hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          ))}
          {draft.starters.length < 6 && <button type="button" onClick={() => set({ starters: [...draft.starters, ""] })} className={ghost}><Plus className="h-4 w-4" /> Add a starter</button>}
        </div>
      </Section>

      <Section n={4} title="Knowledge" hint="Files the Gem answers from: notes, a syllabus, a text you're studying. PDF, Word, PowerPoint, Excel, text or images.">
        <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          disabled={!!reading}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-lp-line px-4 py-6 text-center text-lp-mute transition-colors hover:border-lp-sky/50 hover:text-white disabled:opacity-60"
        >
          {reading ? <Loader2 className="h-5 w-5 animate-spin text-lp-sky" /> : <FileUp className="h-5 w-5" />}
          <span className="text-[13.5px]">{reading || "Drop files here or choose them"}</span>
        </button>
        {draft.knowledge.length > 0 && (
          <ul className="mt-3 divide-y divide-lp-line rounded-2xl border border-lp-line">
            {draft.knowledge.map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] text-white">{k.name}</span><span className="block text-[11.5px] text-lp-mute">{k.chars.toLocaleString()} characters</span></span>
                <button type="button" onClick={() => set({ knowledge: draft.knowledge.filter((x) => x.id !== k.id) })} aria-label={`Remove ${k.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-lp-raised hover:text-white"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {used > 0 && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-lp-raised"><div className="h-full rounded-full bg-lp-blue" style={{ width: `${Math.min(100, (used / KNOWLEDGE_TOTAL_CHARS) * 100)}%` }} /></div>
            <p className="mt-1 text-[11px] text-lp-mute">{Math.round((used / KNOWLEDGE_TOTAL_CHARS) * 100)}% of the knowledge space used. The most relevant part is read for each reply.</p>
          </div>
        )}
      </Section>

      {teacher && !worldId && (
        <Section n={5} title="Sharing">
          <ShareControl what="Gem" visibility={draft.visibility} classIds={draft.class_ids} onChange={(v, ids) => set({ visibility: v, class_ids: ids })} />
        </Section>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" onClick={save} disabled={saving || (!dirty && !!savedId)} className={primary}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : notice ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} {notice || (savedId ? "Save changes" : "Create Gem")}
        </button>
        {savedId && <Link to={`/gems/${savedId}`} className={ghost}><MessageSquare className="h-4 w-4" /> Open chat</Link>}
        <span className="flex-1" />
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-[13px] text-lp-soft">Delete for good?
            <button type="button" onClick={remove} className="inline-flex h-9 items-center rounded-xl bg-lp-red px-3 text-[13px] font-medium text-white">Delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 rounded-xl px-2 text-[13px] text-lp-mute hover:text-white">Keep</button>
          </span>
        ) : savedId && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] text-lp-mute hover:bg-lp-red/10 hover:text-lp-red"><Trash2 className="h-4 w-4" /> Delete</button>
        )}
      </div>
    </div>
  );

  const preview = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-lp-line/60 px-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-lp-mute">Try it</p>
        <button type="button" onClick={() => setTryKey((k) => k + 1)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-lp-mute hover:bg-white/[0.06] hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Restart</button>
      </div>
      <SpaceChat
        key={tryKey}
        className="flex-1"
        mode="gem"
        ephemeral
        gemId={savedId}
        worldId={worldId}
        who={{ name: draft.name || "Your Gem", emoji: draft.emoji, color: draft.color }}
        starters={draft.starters.filter((s) => s.trim())}
        beforeSend={async () => {
          if (savedId && !dirty) return { gemId: savedId };
          const g = await persist();
          return g ? { gemId: g } : false;
        }}
        fabSafe
        empty={
          <>
            <GemOrb color={draft.color} emoji={draft.emoji} size="xl" float />
            <p className="mt-5 text-[20px] font-semibold text-white">{draft.name || "Your Gem"}</p>
            <p className="mt-1 max-w-[380px] text-[13.5px] text-lp-mute">{draft.tagline || "Chat here to test it. Changes are saved before each message, so you always try the latest version."}</p>
          </>
        }
      />
    </div>
  );

  return (
    <SpaceShell>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-lp-line/60 px-3 sm:px-5">
        <Link to={back} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-white/[0.06] hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{savedId ? `Edit ${draft.name || "Gem"}` : "New Gem"}</p>
          <p className="truncate text-[12px] text-lp-mute">{worldId ? "This World's guide" : saving ? "Saving…" : dirty ? "Unsaved changes" : savedId ? "All changes saved" : "Not saved yet"}</p>
        </div>
        <div className="flex rounded-xl border border-lp-line p-0.5 lg:hidden" role="tablist">
          {(["build", "try"] as const).map((p) => <button key={p} role="tab" type="button" aria-selected={pane === p} onClick={() => setPane(p)} className={cn("h-8 rounded-lg px-3 text-[13px]", pane === p ? "bg-lp-blue text-white" : "text-lp-soft")}>{p === "build" ? "Build" : "Try it"}</button>)}
        </div>
      </header>
      {error && <p role="alert" className="mx-4 mt-3 rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red sm:mx-6">{error}</p>}
      <div className="flex min-h-0 flex-1">
        <div className={cn("min-h-0 flex-1 overflow-y-auto lg:block lg:max-w-[700px] lg:border-r lg:border-lp-line/60", pane === "build" ? "block" : "hidden")}>{editor}</div>
        <div className={cn("min-h-0 flex-1 bg-lp-deep/30 lg:block", pane === "try" ? "block" : "hidden")}>{preview}</div>
      </div>
    </SpaceShell>
  );
};

export default GemBuilderPage;
