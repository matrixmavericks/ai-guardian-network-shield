import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Drama, ExternalLink, Eye, FileText, FileUp, Layers, Link2, Loader2, Pencil, Plus, RotateCcw, Shuffle, Sparkles, Target, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useTeacherData } from "@/components/teacher/data";
import { Modal, Field } from "@/components/student/Modal";
import { ACCEPT } from "@/components/assistant/files/extract";
import { GemOrb, field, ghost, label, primary } from "./ui";
import { addItem, addWorldFile, deleteItem, deleteScene, draftScene, saveScene, updateItem, worldFileUrl, PALETTE, paletteVars, type Card, type Scene, type SceneDraft, type World, type WorldItem } from "./spaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const Empty: React.FC<{ icon: React.ElementType; title: string; text: string; children?: React.ReactNode }> = ({ icon: Icon, title, text, children }) => (
  <div className="rounded-3xl border border-dashed border-lp-line px-6 py-12 text-center">
    <Icon className="mx-auto h-7 w-7 text-lp-mute" />
    <p className="mt-3 text-[16px] font-semibold text-white">{title}</p>
    <p className="mx-auto mt-1 max-w-[440px] text-[13.5px] text-lp-mute">{text}</p>
    {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
  </div>
);

const plain = (md: string) => md.replace(/[#*_`>|-]+/g, " ").replace(/\s+/g, " ").trim();

/* ---------- Library: notes, files, links ---------- */

export const Library: React.FC<{ world: World; items: WorldItem[]; owner: boolean; onChange: () => void; openId?: string | null }> = ({ world, items, owner, onChange, openId }) => {
  const { user } = useAuth();
  const docs = items.filter((i) => i.kind === "note" || i.kind === "file" || i.kind === "link");
  const [reading, setReading] = useState<WorldItem | null>(null);
  const [editing, setEditing] = useState<{ id?: string; title: string; content: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [linkForm, setLinkForm] = useState<{ title: string; url: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (openId) { const it = items.find((i) => i.id === openId); if (it?.kind === "note") setReading(it); } }, [openId, items]);

  const open = async (it: WorldItem) => {
    if (it.kind === "note") return setReading(it);
    if (it.kind === "link" && it.data?.url) return window.open(it.data.url, "_blank", "noopener,noreferrer");
    if (it.kind === "file" && it.data?.path) {
      try { window.open(await worldFileUrl(it.data.path), "_blank", "noopener,noreferrer"); } catch (e) { setError((e as Error).message); }
    }
  };
  const saveNote = async () => {
    if (!editing || !user || !editing.title.trim()) return;
    setBusy("note");
    try {
      if (editing.id) await updateItem(editing.id, { title: editing.title.trim(), content: editing.content });
      else await addItem(user.id, world.id, { kind: "note", title: editing.title, content: editing.content });
      setEditing(null);
      onChange();
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };
  const saveLink = async () => {
    if (!linkForm || !user) return;
    let url = linkForm.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch { setError("That doesn't look like a web address."); return; }
    setBusy("link");
    try {
      await addItem(user.id, world.id, { kind: "link", title: linkForm.title.trim() || new URL(url).hostname, data: { url } });
      setLinkForm(null);
      onChange();
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setError("");
    for (const f of Array.from(files)) {
      try { await addWorldFile(user.id, world.id, f, (s) => setBusy(`${s}: ${f.name}`)); } catch (e) { setError((e as Error).message); }
    }
    setBusy("");
    if (fileInput.current) fileInput.current.value = "";
    onChange();
  };
  const remove = async (it: WorldItem) => {
    if (!window.confirm(`Delete "${it.title}"?`)) return;
    try { await deleteItem(it); onChange(); } catch (e) { setError((e as Error).message); }
  };

  const Icon = (k: WorldItem["kind"]) => (k === "file" ? FileUp : k === "link" ? Link2 : FileText);
  return (
    <div>
      {owner && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setEditing({ title: "", content: "" }); setPreview(false); }} className={primary}><Plus className="h-4 w-4" /> New note</button>
          <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={!!busy} className={ghost}>{busy && busy !== "note" && busy !== "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {busy && busy !== "note" && busy !== "link" ? busy : "Upload files"}</button>
          <button type="button" onClick={() => setLinkForm({ title: "", url: "" })} className={ghost}><Link2 className="h-4 w-4" /> Add a link</button>
        </div>
      )}
      {error && <p className="mb-3 rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}
      {docs.length ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {docs.map((it) => {
            const I = Icon(it.kind);
            return (
              <div key={it.id} className="group relative">
                <button type="button" onClick={() => open(it)} className="flex h-full w-full flex-col rounded-2xl border border-lp-line bg-lp-surface p-4 text-left transition-[transform,border-color] hover:-translate-y-0.5 hover:border-lp-sky/40">
                  <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-lp-mute"><I className="h-3.5 w-3.5" style={{ color: PALETTE[world.color].b }} /> {it.kind === "note" ? "Note" : it.kind === "file" ? "File" : "Link"}</span>
                  <span className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-white">{it.title}</span>
                  <span className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-lp-mute">{it.kind === "link" ? it.data?.url : it.kind === "file" ? (it.content ? plain(it.content).slice(0, 160) : "Open to view") : plain(it.content).slice(0, 180)}</span>
                  <span className="mt-auto pt-3 text-[11px] text-lp-mute">{format(new Date(it.updated_at), "d MMM")}</span>
                </button>
                {owner && (
                  <span className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    {it.kind === "note" && <button type="button" onClick={() => { setEditing({ id: it.id, title: it.title, content: it.content }); setPreview(false); }} aria-label={`Edit ${it.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-lp-surface/90 text-lp-mute hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>}
                    <button type="button" onClick={() => remove(it)} aria-label={`Delete ${it.title}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-lp-surface/90 text-lp-mute hover:text-lp-red"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon={FileText} title="No notes or files yet" text={owner ? "Add study notes, upload worksheets and readings, or link to good sites. The guide reads all of it." : "Your teacher hasn't added anything here yet."} />
      )}

      <Modal open={!!reading} onClose={() => setReading(null)} title={reading?.title ?? ""} width="max-w-[780px]">
        {reading && <div className="lp-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{reading.content}</ReactMarkdown></div>}
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit note" : "New note"}
        width="max-w-[780px]"
        footer={<>
          <button type="button" onClick={() => setPreview((p) => !p)} className={ghost}>{preview ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {preview ? "Write" : "Preview"}</button>
          <button type="button" onClick={saveNote} disabled={busy === "note" || !editing?.title.trim()} className={primary}>{busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
        </>}
      >
        {editing && (
          <div className="space-y-3">
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={200} placeholder="Title" aria-label="Title" className={cn(field, "text-[16px] font-semibold")} />
            {preview ? <div className="lp-md min-h-[300px] rounded-xl border border-lp-line p-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{editing.content || "_Nothing yet._"}</ReactMarkdown></div>
              : <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={16} placeholder={"Write in Markdown: # headings, **bold**, - lists, | tables |"} aria-label="Note" className={cn(field, "resize-y font-mono text-[13.5px] leading-relaxed")} />}
          </div>
        )}
      </Modal>

      <Modal open={!!linkForm} onClose={() => setLinkForm(null)} title="Add a link" footer={<button type="button" onClick={saveLink} disabled={busy === "link" || !linkForm?.url.trim()} className={primary}>{busy === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Add</button>}>
        {linkForm && (
          <div className="space-y-3">
            <Field label="Web address"><input value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://" inputMode="url" className={field} /></Field>
            <Field label="Title"><input value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} maxLength={200} placeholder="What is it?" className={field} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ---------- Flashcards ---------- */

type Known = Record<number, boolean>;
const knownKey = (id: string) => `refyn:deck:${id}`;
const readKnown = (id: string): Known => { try { return JSON.parse(localStorage.getItem(knownKey(id)) || "{}"); } catch { return {}; } };

const Study: React.FC<{ deck: WorldItem; color: World["color"] }> = ({ deck, color }) => {
  const cards: Card[] = useMemo(() => (Array.isArray(deck.data?.cards) ? deck.data.cards : []), [deck]);
  const [known, setKnown] = useState<Known>(() => readKnown(deck.id));
  const [onlyLearning, setOnlyLearning] = useState(false);
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [at, setAt] = useState(0);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setOrder(cards.map((_, i) => i)); setAt(0); setKnown(readKnown(deck.id)); }, [deck.id, cards]);
  useEffect(() => { try { localStorage.setItem(knownKey(deck.id), JSON.stringify(known)); } catch { /* storage unavailable */ } }, [deck.id, known]);
  const list = onlyLearning ? order.filter((i) => !known[i]) : order;
  const idx = list[Math.min(at, list.length - 1)];
  const card = idx !== undefined ? cards[idx] : null;
  const go = (d: number) => { setFlipped(false); setAt((a) => Math.max(0, Math.min(list.length - 1, a + d))); };
  const mark = (k: boolean) => { if (idx === undefined) return; setKnown((m) => ({ ...m, [idx]: k })); if (at < list.length - 1 && !(onlyLearning && k)) go(1); else setFlipped(false); };
  const knownCount = cards.filter((_, i) => known[i]).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!cards.length) return <p className="text-[13.5px] text-lp-mute">This deck has no cards yet.</p>;
  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-lp-mute">
        <span>{list.length ? `${Math.min(at, list.length - 1) + 1} of ${list.length}` : "All learned"} · {knownCount}/{cards.length} known</span>
        <span className="flex gap-1">
          <button type="button" onClick={() => { setOnlyLearning((o) => !o); setAt(0); setFlipped(false); }} aria-pressed={onlyLearning} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5", onlyLearning ? "bg-lp-blue/15 text-lp-sky" : "hover:text-white")}><Target className="h-3.5 w-3.5" /> Still learning</button>
          <button type="button" onClick={() => { setOrder((o) => [...o].sort(() => Math.random() - 0.5)); setAt(0); setFlipped(false); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 hover:text-white"><Shuffle className="h-3.5 w-3.5" /> Shuffle</button>
          <button type="button" onClick={() => { setKnown({}); setAt(0); setFlipped(false); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
        </span>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-lp-raised"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(knownCount / cards.length) * 100}%`, background: PALETTE[color].b }} /></div>
      {card ? (
        <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Show the question" : "Show the answer"} className={cn("sp-flip block h-[300px] w-full sm:h-[340px]", flipped && "is-flipped")}>
          <div>
            <div className="sp-face sp-cover flex flex-col items-center justify-center rounded-[28px] p-8 text-center" style={paletteVars(color)}>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">Question</p>
              <p className="mt-3 text-[22px] font-semibold leading-snug text-white sm:text-[26px]">{card.front}</p>
              <p className="absolute bottom-5 text-[12px] text-white/50">Tap or press space to flip</p>
            </div>
            <div className="sp-face sp-back flex flex-col items-center justify-center overflow-y-auto rounded-[28px] border border-lp-line bg-lp-surface p-8 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-mute">Answer</p>
              <div className="lp-md mt-3 !text-[17px]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{card.back}</ReactMarkdown></div>
            </div>
          </div>
        </button>
      ) : (
        <div className="flex h-[300px] flex-col items-center justify-center rounded-[28px] border border-lp-line bg-lp-surface text-center">
          <p className="text-[34px]">🎉</p>
          <p className="mt-2 text-[17px] font-semibold text-white">You know every card</p>
          <button type="button" onClick={() => { setOnlyLearning(false); setAt(0); }} className={cn(ghost, "mt-4")}>See all cards</button>
        </div>
      )}
      {card && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => go(-1)} disabled={at === 0} aria-label="Previous card" className={ghost}><ArrowLeft className="h-4 w-4" /></button>
          <div className="flex gap-2">
            <button type="button" onClick={() => mark(false)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-lp-amber/40 px-3.5 text-[13.5px] text-lp-amber hover:bg-lp-amber/10"><RotateCcw className="h-4 w-4" /> Still learning</button>
            <button type="button" onClick={() => mark(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-lp-green/40 px-3.5 text-[13.5px] text-lp-green hover:bg-lp-green/10"><Check className="h-4 w-4" /> Know it</button>
          </div>
          <button type="button" onClick={() => go(1)} disabled={at >= list.length - 1} aria-label="Next card" className={ghost}><ArrowRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
};

export const Flashcards: React.FC<{ world: World; items: WorldItem[]; owner: boolean; onChange: () => void }> = ({ world, items, owner, onChange }) => {
  const { user } = useAuth();
  const decks = items.filter((i) => i.kind === "flashcards");
  const [deckId, setDeckId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id?: string; title: string; cards: Card[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];

  const save = async () => {
    if (!edit || !user) return;
    const cards = edit.cards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })).filter((c) => c.front && c.back);
    setBusy(true);
    try {
      if (edit.id) await updateItem(edit.id, { title: edit.title.trim() || "Flashcards", data: { cards } });
      else { const it = await addItem(user.id, world.id, { kind: "flashcards", title: edit.title.trim() || "Flashcards", data: { cards } }); setDeckId(it.id); }
      setEdit(null);
      onChange();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const paste = (text: string) => {
    const rows = text.split(/\r?\n/).map((l) => l.split(/\t| :: | - | – | — /)).filter((p) => p.length >= 2).map(([f, ...b]) => ({ front: f.trim(), back: b.join(" - ").trim() }));
    if (rows.length && edit) setEdit({ ...edit, cards: [...edit.cards.filter((c) => c.front || c.back), ...rows] });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {decks.map((d) => (
          <button key={d.id} type="button" onClick={() => setDeckId(d.id)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px]", deck?.id === d.id ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
            <Layers className="h-3.5 w-3.5" /> {d.title} <span className="text-lp-mute">{d.data?.cards?.length ?? 0}</span>
          </button>
        ))}
        {owner && (
          <>
            {deck && <button type="button" onClick={() => setEdit({ id: deck.id, title: deck.title, cards: deck.data?.cards ?? [] })} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-lp-mute hover:text-white"><Pencil className="h-3.5 w-3.5" /> Edit deck</button>}
            <button type="button" onClick={() => setEdit({ title: "", cards: [{ front: "", back: "" }] })} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-lp-sky hover:bg-lp-blue/10"><Plus className="h-3.5 w-3.5" /> New deck</button>
          </>
        )}
      </div>
      {deck ? <Study deck={deck} color={world.color} /> : <Empty icon={Layers} title="No flashcards yet" text={owner ? "Make a deck, or paste a list of terms and definitions." : "There are no flashcards in this World yet. You can ask the guide to quiz you instead."} />}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit deck" : "New deck"}
        description="Tip: paste lines like “term - definition” (or tab-separated from a spreadsheet) to add many at once."
        width="max-w-[720px]"
        footer={<>
          {edit?.id && <button type="button" onClick={async () => { const d = decks.find((x) => x.id === edit.id); if (d && window.confirm("Delete this deck?")) { await deleteItem(d); setEdit(null); setDeckId(null); onChange(); } }} className="mr-auto inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] text-lp-mute hover:text-lp-red"><Trash2 className="h-4 w-4" /> Delete deck</button>}
          <button type="button" onClick={save} disabled={busy} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
        </>}
      >
        {edit && (
          <div className="space-y-3">
            {error && <p className="rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}
            <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={200} placeholder="Deck name" aria-label="Deck name" className={cn(field, "font-semibold")} />
            {edit.cards.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input value={c.front} onChange={(e) => setEdit({ ...edit, cards: edit.cards.map((x, k) => (k === i ? { ...x, front: e.target.value } : x)) })} onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t.includes("\n")) { e.preventDefault(); paste(t); } }} placeholder="Front" aria-label={`Card ${i + 1} front`} className={field} />
                <input value={c.back} onChange={(e) => setEdit({ ...edit, cards: edit.cards.map((x, k) => (k === i ? { ...x, back: e.target.value } : x)) })} placeholder="Back" aria-label={`Card ${i + 1} back`} className={field} />
                <button type="button" onClick={() => setEdit({ ...edit, cards: edit.cards.filter((_, k) => k !== i) })} aria-label="Remove card" className="flex h-[42px] w-9 items-center justify-center rounded-xl text-lp-mute hover:text-white"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setEdit({ ...edit, cards: [...edit.cards, { front: "", back: "" }] })} className={ghost}><Plus className="h-4 w-4" /> Add a card</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ---------- Scenes ---------- */

const BLANK_SCENE: SceneDraft = { title: "", setting: "", role: "", characters: [{ name: "", emoji: "🎭", persona: "" }], goals: [""] };
const CHAR_COLORS = ["violet", "amber", "aqua", "rose"] as const;

export const SceneCard: React.FC<{ worldId: string; scene: Scene; color: World["color"]; owner: boolean; onEdit: () => void; onDelete: () => void }> = ({ worldId, scene, color, owner, onEdit, onDelete }) => (
  <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-surface">
    <div className="sp-cover relative h-28 px-5 pt-4" style={paletteVars(color)}>
      <div className="flex -space-x-3">
        {scene.characters.slice(0, 4).map((c, i) => <GemOrb key={i} color={CHAR_COLORS[i % 4]} emoji={c.emoji || "🎭"} size="md" className="ring-2 ring-black/20 rounded-full" />)}
      </div>
      <p className="absolute bottom-3 left-5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">Role-play</p>
    </div>
    <div className="flex flex-1 flex-col p-5">
      <p className="text-[17px] font-semibold leading-snug text-white">{scene.title}</p>
      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-lp-soft">{scene.setting}</p>
      {scene.role && <p className="mt-2 text-[12.5px] text-lp-mute"><span className="font-medium text-lp-soft">You play:</span> {scene.role}</p>}
      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link to={`/world/${worldId}/scene/${scene.id}`} className={primary}><Drama className="h-4 w-4" /> Enter scene</Link>
        {scene.goals.length > 0 && <span className="text-[12px] text-lp-mute">{scene.goals.length} goal{scene.goals.length === 1 ? "" : "s"}</span>}
        {owner && (
          <span className="ml-auto flex gap-1">
            <button type="button" onClick={onEdit} aria-label={`Edit ${scene.title}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-lp-raised hover:text-white"><Pencil className="h-4 w-4" /></button>
            <button type="button" onClick={onDelete} aria-label={`Delete ${scene.title}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-lp-raised hover:text-lp-red"><Trash2 className="h-4 w-4" /></button>
          </span>
        )}
      </div>
    </div>
  </div>
);

export const Scenes: React.FC<{ world: World; scenes: Scene[]; owner: boolean; onChange: () => void }> = ({ world, scenes, owner, onChange }) => {
  const { user } = useAuth();
  const [edit, setEdit] = useState<SceneDraft | null>(null);
  const [idea, setIdea] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (p: Partial<SceneDraft>) => setEdit((e) => (e ? { ...e, ...p } : e));

  const draft = async () => {
    setDrafting(true);
    setError("");
    try { const s = await draftScene(world, idea); setEdit((e) => ({ ...s, id: e?.id })); } catch (e) { setError((e as Error).message); } finally { setDrafting(false); }
  };
  const save = async () => {
    if (!edit || !user || !edit.title.trim()) return;
    setBusy(true);
    try { await saveScene(user.id, world.id, { ...edit, position: edit.position ?? scenes.length }); setEdit(null); onChange(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div>
      {owner && <div className="mb-4"><button type="button" onClick={() => { setEdit(BLANK_SCENE); setIdea(""); }} className={primary}><Plus className="h-4 w-4" /> New scene</button></div>}
      {scenes.length ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {scenes.map((s) => (
            <SceneCard key={s.id} worldId={world.id} scene={s} color={world.color} owner={owner}
              onEdit={() => { setEdit({ id: s.id, title: s.title, setting: s.setting, role: s.role, characters: s.characters, goals: s.goals, position: s.position }); setIdea(""); }}
              onDelete={async () => { if (window.confirm(`Delete "${s.title}"?`)) { await deleteScene(s.id); onChange(); } }} />
          ))}
        </div>
      ) : (
        <Empty icon={Drama} title="No scenes yet" text={owner ? "A scene puts students inside the topic: interviewing a scientist, arguing at a summit, running a field study. Describe one and Refyn sets it up." : "No role-play scenes here yet."}>
          {owner && <button type="button" onClick={() => setEdit(BLANK_SCENE)} className={primary}><Sparkles className="h-4 w-4" /> Create a scene</button>}
        </Empty>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit scene" : "New scene"}
        width="max-w-[760px]"
        footer={<button type="button" onClick={save} disabled={busy || !edit?.title.trim()} className={primary}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save scene</button>}
      >
        {edit && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-lp-sky/30 bg-lp-blue/10 p-3">
              <p className="text-[13px] font-medium text-white">Describe it and Refyn drafts it</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input value={idea} onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && draft()} placeholder="e.g. A press conference with Darwin after publishing" aria-label="Scene idea" className={field} />
                <button type="button" onClick={draft} disabled={drafting} className={cn(primary, "shrink-0")}>{drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Draft</button>
              </div>
              <p className="mt-1.5 text-[11.5px] text-lp-mute">Leave it empty and Refyn picks the most useful scene for this World.</p>
            </div>
            {error && <p className="rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}
            <div className={cn("space-y-4", drafting && "animate-pulse")}>
              <Field label="Title"><input value={edit.title} onChange={(e) => set({ title: e.target.value })} maxLength={160} className={field} /></Field>
              <Field label="Setting" hint="Where and when, what's happening, the problem to solve."><textarea value={edit.setting} onChange={(e) => set({ setting: e.target.value })} rows={4} maxLength={4000} className={cn(field, "resize-y")} /></Field>
              <Field label="The student plays"><input value={edit.role} onChange={(e) => set({ role: e.target.value })} maxLength={600} placeholder="e.g. A journalist from The Times who wants a front-page story" className={field} /></Field>
              <div>
                <p className={label}>Characters</p>
                <div className="mt-2 space-y-2">
                  {edit.characters.map((c, i) => (
                    <div key={i} className="rounded-2xl border border-lp-line p-3">
                      <div className="flex gap-2">
                        <input value={c.emoji} onChange={(e) => set({ characters: edit.characters.map((x, k) => (k === i ? { ...x, emoji: e.target.value } : x)) })} maxLength={8} aria-label="Emoji" className={cn(field, "w-14 text-center text-[18px]")} />
                        <input value={c.name} onChange={(e) => set({ characters: edit.characters.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} maxLength={60} placeholder="Name" aria-label="Character name" className={cn(field, "font-medium")} />
                        <button type="button" onClick={() => set({ characters: edit.characters.filter((_, k) => k !== i) })} aria-label="Remove character" className="flex h-[42px] w-9 shrink-0 items-center justify-center rounded-xl text-lp-mute hover:text-white"><X className="h-4 w-4" /></button>
                      </div>
                      <textarea value={c.persona} onChange={(e) => set({ characters: edit.characters.map((x, k) => (k === i ? { ...x, persona: e.target.value } : x)) })} rows={2} maxLength={1200} placeholder="Who they are, how they speak, what they want and push back on" aria-label="Persona" className={cn(field, "mt-2 resize-y text-[13.5px]")} />
                    </div>
                  ))}
                  {edit.characters.length < 4 && <button type="button" onClick={() => set({ characters: [...edit.characters, { name: "", emoji: "🎭", persona: "" }] })} className={ghost}><Plus className="h-4 w-4" /> Add a character</button>}
                </div>
              </div>
              <div>
                <p className={label}>Learning goals <span className="font-normal text-lp-mute">(the debrief checks these)</span></p>
                <div className="mt-2 space-y-2">
                  {edit.goals.map((g, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={g} onChange={(e) => set({ goals: edit.goals.map((x, k) => (k === i ? e.target.value : x)) })} maxLength={200} placeholder="e.g. Explain why the finches' beaks differ" aria-label={`Goal ${i + 1}`} className={field} />
                      <button type="button" onClick={() => set({ goals: edit.goals.filter((_, k) => k !== i) })} aria-label="Remove goal" className="flex h-[42px] w-9 shrink-0 items-center justify-center rounded-xl text-lp-mute hover:text-white"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {edit.goals.length < 6 && <button type="button" onClick={() => set({ goals: [...edit.goals, ""] })} className={ghost}><Plus className="h-4 w-4" /> Add a goal</button>}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ---------- Linked tasks ---------- */

type TaskRow = { id: string; title: string; class_id: string; due_date: string | null; className?: string };

export const Tasks: React.FC<{ world: World; items: WorldItem[]; owner: boolean; onChange: () => void }> = ({ world, items, owner, onChange }) => {
  const { user } = useAuth();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const { data: tdata } = useTeacherData(teacher && owner);
  const linked = items.filter((i) => i.kind === "task");
  const [picking, setPicking] = useState(false);
  const [mine, setMine] = useState<TaskRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!picking || !user) return;
    if (teacher) {
      const cname = new Map(tdata.classes.map((c) => [c.id, c.name]));
      setMine(tdata.assignments.map((a) => ({ id: a.id, title: a.title, class_id: a.class_id, due_date: a.due_date, className: cname.get(a.class_id) })));
      return;
    }
    (async () => {
      const { data: mem } = await db.from("class_members").select("class_id, classes(name)").eq("student_id", user.id);
      const ids = ((mem ?? []) as { class_id: string; classes: { name: string } | null }[]);
      if (!ids.length) { setMine([]); return; }
      const cname = new Map(ids.map((m) => [m.class_id, m.classes?.name ?? ""]));
      const { data } = await db.from("class_assignments").select("id, title, class_id, due_date").in("class_id", ids.map((m) => m.class_id)).order("due_date", { ascending: false }).limit(200);
      setMine(((data ?? []) as TaskRow[]).map((t) => ({ ...t, className: cname.get(t.class_id) })));
    })().catch(() => setMine([]));
  }, [picking, user, teacher, tdata]);

  const link = async (t: TaskRow) => {
    if (!user) return;
    await addItem(user.id, world.id, { kind: "task", title: t.title, data: { taskId: t.id, classId: t.class_id, due: t.due_date, className: t.className } });
    onChange();
  };
  const already = new Set(linked.map((l) => l.data?.taskId));
  const options = (mine ?? []).filter((t) => !already.has(t.id) && (!q.trim() || t.title.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div>
      {owner && <div className="mb-4"><button type="button" onClick={() => setPicking(true)} className={primary}><Link2 className="h-4 w-4" /> Link a task</button></div>}
      {linked.length ? (
        <ul className="divide-y divide-lp-line overflow-hidden rounded-3xl border border-lp-line bg-lp-surface">
          {linked.map((it) => (
            <li key={it.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-amber/15 text-lp-amber"><ClipboardList className="h-5 w-5" /></span>
              <Link to={`/task/${it.data?.taskId}`} className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-medium text-white hover:underline">{it.title}</span>
                <span className="block text-[12px] text-lp-mute">{[it.data?.className, it.data?.due && `Due ${format(new Date(it.data.due), "d MMM")}`].filter(Boolean).join(" · ")}</span>
              </Link>
              <Link to={`/task/${it.data?.taskId}`} aria-label={`Open ${it.title}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-lp-raised hover:text-white"><ExternalLink className="h-4 w-4" /></Link>
              {owner && <button type="button" onClick={async () => { await deleteItem(it); onChange(); }} aria-label={`Unlink ${it.title}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-lp-raised hover:text-lp-red"><X className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={ClipboardList} title="No tasks linked" text={owner ? "Link the class tasks that belong to this unit so everything for it is in one place." : "No tasks are linked to this World yet."} />
      )}
      <Modal open={picking} onClose={() => setPicking(false)} title="Link a task" description="Tasks from your classes." width="max-w-[600px]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" className={cn(field, "mb-3")} />
        {!mine ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-lp-sky" /> : options.length ? (
          <ul className="space-y-1">
            {options.slice(0, 60).map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => link(t)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-lp-raised">
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] text-white">{t.title}</span><span className="block text-[12px] text-lp-mute">{[t.className, t.due_date && `Due ${format(new Date(t.due_date), "d MMM")}`].filter(Boolean).join(" · ")}</span></span>
                  <Plus className="h-4 w-4 shrink-0 text-lp-sky" />
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="py-6 text-center text-[13.5px] text-lp-mute">{q ? "No tasks match." : "No more tasks to link."}</p>}
      </Modal>
    </div>
  );
};
