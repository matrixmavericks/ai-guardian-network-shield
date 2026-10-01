import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import {
  Archive, ArrowLeft, BookMarked, Check, Copy, Download, MessageSquare, Plus, Puzzle, RotateCcw, Search,
  Terminal, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, commandsFor } from "./commands";
import { MAX_INSTALLED, SKILLS, Skill } from "./skills";
import { downloadMarkdown, plainText, slugify, type NotebookEntry } from "./storage";

/* ---------- Drawer shell ---------- */

export const SidePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  icon: React.ElementType;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, icon: Icon, title, intro, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn("fixed inset-0 z-[60] bg-lp-deep/70 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        className={cn(
          "lp-app fixed bottom-0 right-0 top-0 z-[61] flex w-full max-w-[480px] flex-col border-l border-lp-line bg-lp-deep font-ui shadow-2xl transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "invisible translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-lp-line px-6 pb-5 pt-6">
          <div>
            <h2 className="flex items-center gap-2.5 text-[20px] font-medium tracking-[-0.02em] text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-lp-blue/15 text-lp-sky">
                <Icon className="h-4 w-4" />
              </span>
              {title}
            </h2>
            {intro && <div className="mt-3 text-[13.5px] leading-relaxed text-lp-soft">{intro}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lp-soft hover:bg-white/[0.06] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="mb-3 flex items-center justify-between">
    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-mute">{children}</p>
    {right && <span className="text-[12px] tabular-nums text-lp-mute">{right}</span>}
  </div>
);

/* ---------- Skills ---------- */

const SkillCard: React.FC<{ skill: Skill; installed: boolean; full: boolean; onToggle: () => void }> = ({ skill, installed, full, onToggle }) => (
  <li className={cn("rounded-2xl border p-4 transition-colors", installed ? "border-lp-blue/40 bg-lp-blue/[0.07]" : "border-lp-line bg-lp-surface/60 hover:border-white/15")}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-medium text-white">{skill.name}</span>
          <span className="rounded-full border border-lp-line px-2 py-0.5 text-[11px] text-lp-soft">{skill.category}</span>
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-lp-soft">{skill.description}</p>
        <p className="mt-2 text-[12px] text-lp-mute">
          Call it with <code className="rounded-md bg-lp-blue/10 px-1.5 py-0.5 text-lp-sky">@{skill.slug}</code>
          {installed && <> · switches on for “{skill.triggers.slice(0, 3).join("”, “")}”</>}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={!installed && full}
        title={!installed && full ? `You can install up to ${MAX_INSTALLED} skills` : undefined}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
          installed ? "border-lp-line text-lp-soft hover:border-lp-red/50 hover:text-lp-red" : "border-lp-blue/50 bg-lp-blue/15 text-white hover:bg-lp-blue",
        )}
      >
        {installed ? <>Remove</> : <><Plus className="h-3.5 w-3.5" /> Install</>}
      </button>
    </div>
  </li>
);

export const SkillsPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  installed: string[];
  onToggle: (slug: string) => void;
}> = ({ open, onClose, installed, onToggle }) => {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const match = (s: Skill) => !q || `${s.name} ${s.category} ${s.description}`.toLowerCase().includes(q);
  const mine = SKILLS.filter((s) => installed.includes(s.slug) && match(s));
  const rest = SKILLS.filter((s) => !installed.includes(s.slug) && match(s));
  const full = installed.length >= MAX_INSTALLED;

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      icon={Puzzle}
      title="Skills"
      intro={
        <>
          A skill is a way of working Refyn follows for one kind of task. Installed skills switch on automatically when your
          message matches them, or call any skill directly with <code className="rounded-md bg-lp-blue/10 px-1.5 py-0.5 text-lp-sky">@name</code>.
          Every skill still keeps you doing the thinking.
        </>
      }
    >
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills"
          aria-label="Search skills"
          className="h-10 w-full rounded-xl border border-lp-line bg-lp-surface/70 pl-10 pr-3 text-[14px] text-white placeholder:text-lp-mute outline-none focus:border-lp-blue/60"
        />
      </div>

      <SectionLabel right={`${installed.length}/${MAX_INSTALLED}`}>Installed</SectionLabel>
      {mine.length > 0 ? (
        <ul className="mb-7 space-y-2.5">
          {mine.map((s) => (
            <SkillCard key={s.slug} skill={s} installed full={full} onToggle={() => onToggle(s.slug)} />
          ))}
        </ul>
      ) : (
        <p className="mb-7 rounded-2xl border border-dashed border-lp-line px-4 py-4 text-[13.5px] leading-relaxed text-lp-mute">
          {query ? "No installed skills match." : "Nothing installed yet. Add one below, or try one first with @essay-coach in your message."}
        </p>
      )}

      <SectionLabel>Available</SectionLabel>
      <ul className="space-y-2.5">
        {rest.map((s) => (
          <SkillCard key={s.slug} skill={s} installed={false} full={full} onToggle={() => onToggle(s.slug)} />
        ))}
        {rest.length === 0 && <p className="text-[13.5px] text-lp-mute">No skills match that search.</p>}
      </ul>
    </SidePanel>
  );
};

/* ---------- Commands ---------- */

export const CommandsPanel: React.FC<{ open: boolean; onClose: () => void; onPick: (c: Command) => void; teacher?: boolean }> = ({ open, onClose, onPick, teacher = false }) => {
  const groups = ["Chat", "Learning", "Teaching", "Mode", "Go to"] as const;
  const list = commandsFor(teacher);
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      icon={Terminal}
      title="Commands"
      intro={<>Type <code className="rounded-md bg-lp-blue/10 px-1.5 py-0.5 text-lp-sky">/</code> in the message box to use these. Pick one here to insert it.</>}
    >
      {groups.filter((g) => list.some((c) => c.group === g)).map((g) => (
        <div key={g} className="mb-6">
          <SectionLabel>{g}</SectionLabel>
          <ul className="space-y-1">
            {list.filter((c) => c.group === g).map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  className="flex w-full items-baseline gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <code className="shrink-0 rounded-md bg-lp-blue/10 px-1.5 py-0.5 text-[12.5px] text-lp-sky">
                    /{c.name}
                    {c.args ? ` ${c.args}` : ""}
                  </code>
                  <span className="text-[13.5px] text-lp-soft">{c.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </SidePanel>
  );
};

/* ---------- Notebook ---------- */


export const NotebookPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  entries: NotebookEntry[];
  onDelete: (id: string) => void;
  focusId?: string | null;
}> = ({ open, onClose, entries, onDelete, focusId }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) setOpenId(focusId ?? null);
  }, [open, focusId]);
  const entry = entries.find((e) => e.id === openId);

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      icon={BookMarked}
      title="Notebook"
      intro={!entry ? "Study notes, plans and answers you save from your chats show up here." : undefined}
    >
      {entry ? (
        <div className="lp-fade">
          <button type="button" onClick={() => setOpenId(null)} className="mb-4 flex items-center gap-1.5 text-[13px] text-lp-sky hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> All notes
          </button>
          <h3 className="text-[20px] font-medium tracking-[-0.02em] text-white">{entry.title}</h3>
          <p className="mt-1 text-[12.5px] text-lp-mute">
            From “{entry.source}” · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try { await navigator.clipboard.writeText(entry.content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
              }}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-lp-green" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => downloadMarkdown(`${slugify(entry.title)}.md`, `# ${entry.title}\n\n${entry.content}\n`)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button
              type="button"
              onClick={() => { onDelete(entry.id); setOpenId(null); }}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:border-lp-red/50 hover:text-lp-red"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
          <div className="lp-md mt-6 rounded-2xl border border-lp-line bg-lp-surface/60 p-5">
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lp-line bg-lp-raised text-lp-sky">
            <BookMarked className="h-5 w-5" />
          </span>
          <p className="mt-4 text-[15px] font-medium text-white">Nothing saved yet</p>
          <p className="mt-1 max-w-[20rem] text-[13.5px] leading-relaxed text-lp-mute">
            Use “Save to notebook” under any reply, or type <code className="text-lp-sky">/notes</code> to turn a chat into study notes.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setOpenId(e.id)}
                className="w-full rounded-2xl border border-lp-line bg-lp-surface/60 p-4 text-left transition-colors hover:border-lp-blue/40"
              >
                <p className="truncate text-[14.5px] font-medium text-white">{e.title}</p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-lp-mute">{plainText(e.content).slice(0, 160)}</p>
                <p className="mt-2 text-[12px] text-lp-mute">{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SidePanel>
  );
};

/* ---------- Archived chats ---------- */

export const ArchivedPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  sessions: { id: string; title: string; updated_at: string }[];
  onRestore: (id: string) => void;
  onOpen: (id: string) => void;
}> = ({ open, onClose, sessions, onRestore, onOpen }) => (
  <SidePanel open={open} onClose={onClose} icon={Archive} title="Archived chats" intro="Archived chats are hidden from your sidebar. Restore one to bring it back.">
    {sessions.length === 0 ? (
      <p className="py-8 text-center text-[13.5px] text-lp-mute">No archived chats. Use /archive to tidy one away.</p>
    ) : (
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-lp-line bg-lp-surface/60 p-3">
            <MessageSquare className="h-4 w-4 shrink-0 text-lp-mute" />
            <button type="button" onClick={() => onOpen(s.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-[14px] text-white">{s.title || "Untitled"}</p>
              <p className="text-[12px] text-lp-mute">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</p>
            </button>
            <button type="button" onClick={() => onRestore(s.id)} className="flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12.5px] text-lp-soft hover:text-white">
              <RotateCcw className="h-3.5 w-3.5" /> Restore
            </button>
          </li>
        ))}
      </ul>
    )}
  </SidePanel>
);
