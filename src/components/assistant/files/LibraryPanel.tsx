import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle, Check, ChevronDown, Download, FileSpreadsheet, FileText, FolderOpen, Image as ImageIcon, Library, Loader2,
  MessageSquareText, NotebookPen, Pin, PinOff, Plus, Presentation, Sparkles, StickyNote, Trash2, Upload as UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SidePanel } from "../panels";
import { formatSize, words } from "./extract";
import { googleReady, pickerReady } from "./google";
import { libraryBudget, totalChars, type LibraryItem, type Upload } from "./library";

export const itemIcon = (item: { kind: string; name: string; mime?: string | null }) => {
  const n = item.name.toLowerCase();
  if (item.kind === "note") return StickyNote;
  if (item.kind === "message") return MessageSquareText;
  if (/\.(xlsx|xlsm|csv|tsv)$/.test(n) || item.mime?.includes("sheet")) return FileSpreadsheet;
  if (/\.pptx$/.test(n)) return Presentation;
  if (/\.(png|jpe?g|webp|gif)$/.test(n) || item.mime?.startsWith("image/")) return ImageIcon;
  return FileText;
};

const KIND_LABEL: Record<string, string> = { file: "Upload", note: "Note", google: "Google Drive", output: "Made in this chat", message: "Saved reply" };

type Props = {
  open: boolean;
  onClose: () => void;
  items: LibraryItem[];
  uploads: Upload[];
  loading: boolean;
  available: boolean;
  modelPrice: number;
  teacher: boolean;
  onUpload: () => void;
  onDrive: () => void;
  onAddNote: (name: string, text: string) => Promise<void>;
  onRemove: (item: LibraryItem) => void;
  onTogglePin: (item: LibraryItem) => void;
  onDownload: (item: LibraryItem) => void;
  onPreview: (item: LibraryItem) => Promise<string>;
  loadOthers: () => Promise<(LibraryItem & { chat: string })[]>;
  onCopy: (item: LibraryItem) => Promise<void>;
};

export const LibraryPanel: React.FC<Props> = (p) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteName, setNoteName] = useState("");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ id: string; text: string | null } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [others, setOthers] = useState<(LibraryItem & { chat: string })[] | null>(null);
  const [copying, setCopying] = useState<string | null>(null);

  const chars = totalChars(p.items);
  const budget = libraryBudget(p.modelPrice);
  const full = chars <= budget;
  const busy = p.uploads.filter((u) => u.status === "uploading" || u.status === "reading");

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await p.onAddNote(noteName || noteText.trim().split("\n")[0].slice(0, 60), noteText);
      setNoteName("");
      setNoteText("");
      setNoteOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const togglePreview = async (item: LibraryItem) => {
    if (preview?.id === item.id) return setPreview(null);
    setPreview({ id: item.id, text: null });
    const text = await p.onPreview(item);
    setPreview((cur) => (cur?.id === item.id ? { id: item.id, text } : cur));
  };

  const addBtn = "flex h-10 items-center justify-center gap-2 rounded-xl border border-lp-line bg-lp-surface px-3 text-[13px] font-medium text-white transition-colors hover:border-lp-blue/50 disabled:opacity-50";

  return (
    <SidePanel
      open={p.open}
      onClose={p.onClose}
      icon={Library}
      title="Files & context"
      intro="Everything here stays with this chat and Refyn reads it on every reply, so nothing drops out as the conversation grows."
    >
      {!p.available ? (
        <p className="rounded-2xl border border-lp-line bg-lp-surface p-4 text-[13.5px] text-lp-soft">Chat files are being switched on. Try again in a minute.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={p.onUpload} className={addBtn}>
              <UploadIcon className="h-4 w-4 text-lp-sky" /> Upload files
            </button>
            <button type="button" onClick={() => setNoteOpen((v) => !v)} className={addBtn} aria-expanded={noteOpen}>
              <NotebookPen className="h-4 w-4 text-lp-sky" /> Add a note
            </button>
            {p.teacher && (
              <button
                type="button"
                onClick={p.onDrive}
                disabled={!pickerReady()}
                title={pickerReady() ? "Add Docs, Sheets, Slides or files from your Drive" : "Your school admin needs to connect Google Drive first"}
                className={addBtn}
              >
                <GoogleDriveMark className="h-4 w-4" /> Google Drive
              </button>
            )}
            <button
              type="button"
              onClick={async () => setOthers(others ? null : await p.loadOthers())}
              className={cn(addBtn, !p.teacher && "col-span-1")}
              aria-expanded={!!others}
            >
              <FolderOpen className="h-4 w-4 text-lp-sky" /> From other chats
            </button>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-lp-mute">PDF, Word, Excel, PowerPoint, CSV, text and images, up to 25 MB each. You can also drop files onto the chat or paste them.</p>
          {p.teacher && !googleReady() && (
            <p className="mt-2 flex gap-2 rounded-xl border border-lp-line bg-lp-surface/60 px-3 py-2 text-[12px] text-lp-mute">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Google Drive needs a one-time setup by your Refyn admin.
            </p>
          )}

          {noteOpen && (
            <div className="lp-fade mt-4 rounded-2xl border border-lp-line bg-lp-surface p-3">
              <input value={noteName} onChange={(e) => setNoteName(e.target.value)} placeholder="Title (optional)" className="h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-1 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60" />
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Paste anything: a syllabus, rubric, class notes, a long article…"
                rows={7}
                className="mt-2 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-2 text-[14px] leading-relaxed text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] text-lp-mute">{noteText ? `${words(noteText.length).toLocaleString()} words` : ""}</span>
                <button type="button" onClick={saveNote} disabled={!noteText.trim() || saving} className="flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-4 text-[13px] font-medium text-white hover:bg-[#2F6FE0] disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save note
                </button>
              </div>
            </div>
          )}

          {others && (
            <div className="lp-fade mt-4 rounded-2xl border border-lp-line bg-lp-surface/60 p-2">
              <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">From your other chats</p>
              {others.length === 0 ? (
                <p className="px-2 py-2 text-[13px] text-lp-mute">Nothing in your other chats yet.</p>
              ) : (
                <div className="max-h-[260px] overflow-y-auto">
                  {others.map((o) => {
                    const Icon = itemIcon(o);
                    const added = p.items.some((i) => i.name === o.name && i.storage_path === o.storage_path && i.char_count === o.char_count);
                    return (
                      <div key={o.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
                        <Icon className="h-4 w-4 shrink-0 text-lp-sky" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-white">{o.name}</span>
                          <span className="block truncate text-[11.5px] text-lp-mute">{o.chat}</span>
                        </span>
                        <button
                          type="button"
                          disabled={added || copying === o.id}
                          onClick={async () => { setCopying(o.id); try { await p.onCopy(o); } finally { setCopying(null); } }}
                          className="flex h-8 items-center gap-1 rounded-lg border border-lp-line px-2.5 text-[12px] text-lp-soft hover:text-white disabled:opacity-50"
                        >
                          {copying === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : added ? <Check className="h-3.5 w-3.5 text-lp-green" /> : <Plus className="h-3.5 w-3.5" />}
                          {added ? "Added" : "Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(p.items.length > 0 || busy.length > 0) && (
            <div className="mt-5 rounded-2xl border border-lp-line bg-lp-surface/60 p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13.5px] font-medium text-white">
                  {p.items.length} item{p.items.length === 1 ? "" : "s"} · {words(chars).toLocaleString()} words
                </p>
                <span className={cn("text-[12px] font-medium", full ? "text-lp-green" : "text-lp-amber")}>{full ? "Read in full" : "Searched per reply"}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lp-line">
                <div className={cn("h-full rounded-full", full ? "bg-lp-green" : "bg-lp-amber")} style={{ width: `${Math.min(100, (chars / budget) * 100)}%` }} />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-lp-mute">
                {full
                  ? "Every reply reads the whole library."
                  : "The library is bigger than one reply can read, so each reply reads the parts most relevant to your question. Pin a file to always read it in full."}
              </p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {p.uploads.filter((u) => u.status !== "ready").map((u) => (
              <div key={u.key} className={cn("flex items-center gap-3 rounded-2xl border px-3 py-2.5", u.status === "error" ? "border-lp-red/40 bg-lp-red/[0.06]" : "border-lp-line bg-lp-surface")}>
                {u.status === "error" ? <AlertCircle className="h-4 w-4 shrink-0 text-lp-red" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-lp-sky" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-white">{u.name}</span>
                  <span className={cn("block text-[12px]", u.status === "error" ? "text-lp-red" : "text-lp-mute")}>
                    {u.status === "error" ? u.detail : u.status === "uploading" ? "Uploading…" : u.detail || "Reading…"}
                  </span>
                </span>
              </div>
            ))}

            {p.loading && p.items.length === 0 ? (
              <div className="lp-skeleton h-24 rounded-2xl" />
            ) : p.items.length === 0 && busy.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-lp-line px-5 py-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-lp-sky" />
                <p className="mt-3 text-[14px] font-medium text-white">Nothing here yet</p>
                <p className="mx-auto mt-1 max-w-[20rem] text-[13px] leading-relaxed text-lp-mute">
                  Add the documents you're working from: a syllabus, readings, a class list, past papers. Refyn will use them in every answer.
                </p>
              </div>
            ) : (
              [...p.items].reverse().map((item) => {
                const Icon = itemIcon(item);
                const open = preview?.id === item.id;
                return (
                  <div key={item.id} className="rounded-2xl border border-lp-line bg-lp-surface">
                    <div className="flex items-start gap-3 px-3 py-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lp-raised text-lp-sky">
                        <Icon className="h-4 w-4" />
                      </span>
                      <button type="button" onClick={() => togglePreview(item)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-medium text-white">{item.name}</span>
                          {item.pinned && <Pin className="h-3 w-3 shrink-0 text-lp-sky" />}
                        </span>
                        <span className="block truncate text-[12px] text-lp-mute">
                          {KIND_LABEL[item.kind]} · {words(item.char_count).toLocaleString()} words
                          {item.size_bytes ? ` · ${formatSize(item.size_bytes)}` : ""}
                          {item.meta?.pages ? ` · ${item.meta.pages} pages` : ""} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                        {item.meta?.note && <span className="mt-0.5 block text-[11.5px] text-lp-amber">{item.meta.note}</span>}
                      </button>
                      <ChevronDown className={cn("mt-2 h-4 w-4 shrink-0 text-lp-mute transition-transform", open && "rotate-180")} />
                    </div>
                    {open && (
                      <div className="border-t border-lp-line px-3 pb-3 pt-2.5">
                        {preview?.text === null ? (
                          <div className="lp-skeleton h-20 rounded-xl" />
                        ) : (
                          <pre className="max-h-[220px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-lp-deep/60 p-3 font-ui text-[12.5px] leading-relaxed text-lp-soft">
                            {(preview?.text ?? "").slice(0, 3000)}
                            {(preview?.text?.length ?? 0) > 3000 ? "\n…" : ""}
                          </pre>
                        )}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => p.onTogglePin(item)} className="flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12px] text-lp-soft hover:text-white">
                            {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                            {item.pinned ? "Unpin" : "Always read in full"}
                          </button>
                          <button type="button" onClick={() => p.onDownload(item)} className="flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12px] text-lp-soft hover:text-white">
                            <Download className="h-3.5 w-3.5" /> {item.storage_path ? "Download original" : "Download"}
                          </button>
                          {item.source_url && (
                            <a href={item.source_url} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12px] text-lp-soft hover:text-white">
                              <GoogleDriveMark className="h-3.5 w-3.5" /> Open in Drive
                            </a>
                          )}
                          {confirm === item.id ? (
                            <button type="button" onClick={() => { setConfirm(null); p.onRemove(item); }} className="flex h-8 items-center gap-1.5 rounded-lg bg-lp-red/15 px-2.5 text-[12px] font-medium text-lp-red">
                              <Trash2 className="h-3.5 w-3.5" /> Remove from this chat
                            </button>
                          ) : (
                            <button type="button" onClick={() => setConfirm(item.id)} className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-lp-mute hover:text-lp-red">
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </SidePanel>
  );
};

/** Google Drive's triangle, drawn with its brand colours. */
export const GoogleDriveMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 87.3 78" className={className} aria-hidden>
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);
