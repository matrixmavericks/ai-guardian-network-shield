import React from "react";
import { ArrowDown, ArrowUp, Minus, Plus, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { DiagramView } from "./diagrams";
import { marksOf, totalMarks, type ExitTicket, type Flashcards, type Printable, type Question, type Worksheet } from "./worksheet";

export type DocTheme = "modern" | "classic" | "exam" | "bright";
export type DocOptions = {
  theme: DocTheme;
  accent: string;
  gradient: string;
  header: string;
  answerKey: boolean;
  grid: boolean;
  accessible: boolean;
  showMarks: boolean;
  nameFields: boolean;
};

export type QAction = "up" | "down" | "delete" | "regen" | "more" | "less";

type Props = {
  doc: Printable;
  opts: DocOptions;
  editable?: boolean;
  busyId?: string | null;
  onEdit?: (next: Printable) => void;
  onAction?: (qid: string, action: QAction) => void;
};

const LINE_H = 27;

/** Inline editable text. Plain text only; saves on blur. */
const Ed: React.FC<{ value: string; on?: (v: string) => void; className?: string; style?: React.CSSProperties; as?: "span" | "div" | "h1" | "h2" | "p" }> = ({ value, on, className, style, as = "span" }) => {
  const Tag = as as "span";
  if (!on) return <Tag className={className} style={style}>{value}</Tag>;
  return (
    <Tag
      className={`${className ?? ""} ws-ed`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onBlur={(e) => {
        const v = (e.currentTarget as HTMLElement).innerText.split(String.fromCharCode(160)).join(" ").trim();
        if (v !== value) on(v);
      }}
    >
      {value}
    </Tag>
  );
};

/** Fill-in prompts: ___ becomes a writing blank. */
const withBlanks = (text: string) =>
  text.split(/(_{3,})/).map((part, i) =>
    /^_{3,}$/.test(part) ? <span key={i} className="inline-block min-w-[96px] translate-y-[3px] border-b-[1.5px] border-[#374151]" /> : <span key={i}>{part}</span>,
  );

const Lines: React.FC<{ n: number; grid?: boolean; box?: boolean }> = ({ n, grid, box }) => {
  if (!n) return null;
  if (box || grid) {
    return (
      <div
        className="mt-2 rounded-md border border-[#D1D5DB]"
        style={{
          height: n * LINE_H,
          backgroundImage: grid ? "linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)" : undefined,
          backgroundSize: grid ? "5mm 5mm" : undefined,
        }}
      />
    );
  }
  return (
    <div className="mt-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="border-b border-dotted border-[#9CA3AF]" style={{ height: LINE_H }} />
      ))}
    </div>
  );
};

/** Deterministic shuffle for matching columns so print and screen agree. */
const shuffled = <T,>(arr: T[], seed: string) => {
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
  const out = arr.map((v, i) => ({ v, i, k: (h = (h * 1103515245 + 12345) >>> 0) }));
  return out.sort((a, b) => a.k - b.k);
};

const QuestionBlock: React.FC<{
  q: Question;
  n: number;
  opts: DocOptions;
  editable?: boolean;
  busy?: boolean;
  update?: (patch: Partial<Question>) => void;
  onAction?: (a: QAction) => void;
  compact?: boolean;
}> = ({ q, n, opts, editable, busy, update, onAction, compact }) => {
  const { theme, accent } = opts;
  const marks = marksOf(q);
  const exam = theme === "exam";
  const classic = theme === "classic";
  const bright = theme === "bright";
  const numEl = exam || classic ? (
    <span className="w-7 shrink-0 font-bold">{n}.</span>
  ) : (
    <span className="lp-keep flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: accent }}>
      {n}
    </span>
  );
  const markEl =
    opts.showMarks && marks > 0 ? (
      exam || classic ? (
        <span className="shrink-0 pl-3 font-semibold">[{marks}]</span>
      ) : (
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${accent}18`, color: accent }}>
          {marks} {marks === 1 ? "mark" : "marks"}
        </span>
      )
    ) : null;
  const optsGrid = q.options && q.options.every((o) => o.length < 38);
  return (
    <div
      className={`ws-q group relative break-inside-avoid ${bright ? "rounded-2xl p-4" : "py-3"} ${compact ? "py-1.5" : ""}`}
      style={bright ? { background: `${accent}0D`, border: `1px solid ${accent}26` } : undefined}
    >
      {editable && onAction && (
        <div className="ws-noprint absolute -right-2 top-2 z-10 hidden items-center gap-0.5 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] p-0.5 shadow-md group-hover:flex">
          {busy ? (
            <span className="flex h-7 items-center px-2 text-[11px] text-[#6B7280]">
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Rewriting…
            </span>
          ) : (
            <>
              {(
                [
                  ["up", ArrowUp, "Move up"],
                  ["down", ArrowDown, "Move down"],
                  ["less", Minus, "Fewer marks"],
                  ["more", Plus, "More marks"],
                  ["regen", RefreshCw, "Rewrite this question"],
                  ["delete", Trash2, "Delete"],
                ] as const
              ).map(([a, Icon, label]) => (
                <button key={a} type="button" title={label} aria-label={label} onClick={() => onAction(a)} className="flex h-7 w-7 items-center justify-center rounded-md text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]">
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </>
          )}
        </div>
      )}
      <div className="flex items-start gap-3">
        {numEl}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 whitespace-pre-wrap">
              {q.type === "fill" && !editable ? withBlanks(q.prompt) : <Ed value={q.prompt} on={update ? (v) => update({ prompt: v }) : undefined} />}
            </div>
            {q.type === "truefalse" ? (
              <span className="flex shrink-0 gap-2 text-[12.5px] font-semibold">
                {["True", "False"].map((t) => (
                  <span key={t} className="rounded-full border border-[#9CA3AF] px-2.5 py-0.5">
                    {t}
                  </span>
                ))}
              </span>
            ) : null}
            {!q.parts?.length && markEl}
          </div>

          {q.diagram && (
            <div className="my-3 flex justify-center">
              <DiagramView spec={q.diagram} accent={exam || classic ? "#111827" : accent} className="w-full max-w-[400px]" />
            </div>
          )}

          {q.options && (
            <ol className={`mt-2 grid gap-x-6 gap-y-1.5 ${optsGrid ? "grid-cols-2" : "grid-cols-1"}`}>
              {q.options.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#6B7280] text-[11px] font-bold">{String.fromCharCode(65 + i)}</span>
                  <Ed value={o} on={update ? (v) => update({ options: q.options!.map((x, j) => (j === i ? v : x)) }) : undefined} />
                </li>
              ))}
            </ol>
          )}

          {q.pairs && (
            <div className="mt-2 grid grid-cols-2 gap-x-10 gap-y-2">
              <ol className="space-y-2">
                {q.pairs.map(([a], i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-[#D1D5DB] px-2.5 py-1.5">
                    <span>
                      <b className="mr-1.5">{i + 1}.</b>
                      {a}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#374151]" />
                  </li>
                ))}
              </ol>
              <ol className="space-y-2">
                {shuffled(q.pairs, q.id).map(({ v: [, b] }, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border border-[#D1D5DB] px-2.5 py-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#374151]" />
                    <span>
                      <b className="mr-1.5">{String.fromCharCode(65 + i)}.</b>
                      {b}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {q.table && (
            <table className="mt-2 w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {q.table.headers.map((h, i) => (
                    <th key={i} className="border border-[#9CA3AF] px-2 py-1.5 text-left font-semibold" style={{ background: exam || classic ? "#F3F4F6" : `${accent}14` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((c, j) => (
                      <td key={j} className="border border-[#9CA3AF] px-2" style={{ height: 30 }}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {q.parts?.length ? (
            <div className="mt-2 space-y-2.5">
              {q.parts.map((p, i) => (
                <div key={i} className="break-inside-avoid">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 whitespace-pre-wrap">
                      <b className="mr-1.5">({p.label})</b>
                      <Ed value={p.prompt} on={update ? (v) => update({ parts: q.parts!.map((x, j) => (j === i ? { ...x, prompt: v } : x)) }) : undefined} />
                    </p>
                    {opts.showMarks && p.marks > 0 && (exam || classic ? <span className="shrink-0 font-semibold">[{p.marks}]</span> : <span className="shrink-0 text-[11px] font-semibold" style={{ color: accent }}>{p.marks}</span>)}
                  </div>
                  <Lines n={compact ? Math.min(2, p.lines) : p.lines} grid={p.working && opts.grid} box={p.working} />
                </div>
              ))}
            </div>
          ) : (
            !["mcq", "truefalse", "match", "table"].includes(q.type) && <Lines n={compact ? Math.min(3, q.lines ?? 2) : q.lines ?? 2} grid={q.type === "working" && opts.grid} box={q.type === "working"} />
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Page chrome ---------- */

const Header: React.FC<{ doc: Printable; opts: DocOptions; edit?: (patch: Partial<Worksheet>) => void }> = ({ doc, opts, edit }) => {
  const { theme, accent, gradient } = opts;
  const total = totalMarks(doc);
  const ws = doc.kind === "worksheet" || doc.kind === "test" ? (doc as Worksheet) : null;
  const fields = opts.nameFields && (
    <div className="mt-4 grid grid-cols-[2fr_1fr_1fr] gap-4 text-[12.5px]">
      {["Name", "Class", "Date"].map((f) => (
        <div key={f} className="flex items-end gap-2">
          <span className="font-semibold">{f}</span>
          <span className="flex-1 border-b border-[#6B7280]" style={{ height: 18 }} />
        </div>
      ))}
    </div>
  );
  if (theme === "exam" || doc.kind === "test") {
    return (
      <header className="border-b-2 border-[#111827] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4B5563]">{opts.header}</p>
            <Ed as="h1" value={doc.title} on={edit ? (v) => edit({ title: v }) : undefined} className="mt-1 block text-[24px] font-bold leading-tight" />
            {ws?.subtitle && <Ed as="p" value={ws.subtitle} on={edit ? (v) => edit({ subtitle: v }) : undefined} className="mt-0.5 block text-[13.5px] text-[#374151]" />}
          </div>
          <div className="shrink-0 text-right text-[12px]">
            {ws?.timeMinutes && <p>Time: {ws.timeMinutes} minutes</p>}
            {total > 0 && <p className="font-semibold">Total: {total} marks</p>}
          </div>
        </div>
        {fields}
        {ws?.instructions && (
          <div className="mt-3 rounded-md border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-2 text-[12.5px]">
            <b>Instructions: </b>
            <Ed value={ws.instructions} on={edit ? (v) => edit({ instructions: v }) : undefined} />
          </div>
        )}
      </header>
    );
  }
  if (theme === "classic") {
    return (
      <header className="pb-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7280]">{opts.header}</p>
        <Ed as="h1" value={doc.title} on={edit ? (v) => edit({ title: v }) : undefined} className="mt-2 block font-serif text-[30px] font-bold leading-tight" />
        {ws?.subtitle && <Ed as="p" value={ws.subtitle} on={edit ? (v) => edit({ subtitle: v }) : undefined} className="mt-1 block font-serif text-[15px] italic text-[#4B5563]" />}
        <div className="mx-auto mt-3 h-px w-24 bg-[#111827]" />
        <div className="text-left">{fields}</div>
        {ws?.instructions && <Ed as="p" value={ws.instructions} on={edit ? (v) => edit({ instructions: v }) : undefined} className="mt-4 block text-left text-[13px] italic text-[#374151]" />}
      </header>
    );
  }
  return (
    <header>
      <div className="lp-keep relative overflow-hidden rounded-2xl px-6 py-5 text-white" style={{ background: gradient }}>
        <div aria-hidden className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "14px 14px", maskImage: "linear-gradient(110deg, transparent 40%, black)", WebkitMaskImage: "linear-gradient(110deg, transparent 40%, black)" }} />
        <p className="relative text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/80">{opts.header}</p>
        <Ed as="h1" value={doc.title} on={edit ? (v) => edit({ title: v }) : undefined} className="relative mt-1 block text-[26px] font-bold leading-tight tracking-[-0.02em]" />
        {ws?.subtitle && <Ed as="p" value={ws.subtitle} on={edit ? (v) => edit({ subtitle: v }) : undefined} className="relative mt-1 block text-[14px] text-white/85" />}
        <div className="relative mt-3 flex flex-wrap gap-2 text-[11.5px] font-semibold">
          {ws?.timeMinutes && <span className="rounded-full bg-white/20 px-2.5 py-0.5">⏱ {ws.timeMinutes} min</span>}
          {total > 0 && opts.showMarks && <span className="rounded-full bg-white/20 px-2.5 py-0.5">{total} marks</span>}
        </div>
      </div>
      {fields}
      {ws?.instructions && (
        <div className="mt-4 rounded-xl px-4 py-3 text-[13px]" style={{ background: `${accent}10`, borderLeft: `4px solid ${accent}` }}>
          <Ed value={ws.instructions} on={edit ? (v) => edit({ instructions: v }) : undefined} />
        </div>
      )}
    </header>
  );
};

const AnswerKey: React.FC<{ doc: Worksheet | ExitTicket; opts: DocOptions }> = ({ doc, opts }) => {
  const qs = doc.kind === "exit" ? doc.questions : doc.sections.flatMap((s) => s.questions);
  return (
    <section className="ws-page-break mt-10 border-t-2 border-dashed border-[#9CA3AF] pt-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: opts.theme === "exam" || opts.theme === "classic" ? "#374151" : opts.accent }}>
        Answer key · teacher copy
      </p>
      <h2 className="mt-1 text-[20px] font-bold">{doc.title}</h2>
      <ol className="mt-4 space-y-3 text-[13px]">
        {qs.map((q, i) => (
          <li key={q.id} className="break-inside-avoid">
            <div className="flex gap-2">
              <b className="w-6 shrink-0">{i + 1}.</b>
              <div className="min-w-0 flex-1">
                {q.options && q.answer && (() => {
                  const idx = q.options.findIndex((o) => o.toLowerCase() === q.answer!.toLowerCase().replace(/^[a-f][).:]\s*/, ""));
                  const letter = /^[A-F]$/i.test(q.answer.trim()) ? q.answer.trim().toUpperCase() : idx >= 0 ? String.fromCharCode(65 + idx) : null;
                  return letter ? <b className="mr-2">{letter}</b> : null;
                })()}
                {q.pairs && (
                  <span className="mr-2">
                    {q.pairs.map((_, k) => `${k + 1}–${String.fromCharCode(65 + shuffled(q.pairs!, q.id).findIndex((x) => x.i === k))}`).join(", ")}
                  </span>
                )}
                {q.answer && <span className="whitespace-pre-wrap">{q.answer}</span>}
                {q.parts?.map((p) => (
                  <p key={p.label} className="mt-1">
                    <b>({p.label})</b> {p.answer || "—"}
                  </p>
                ))}
                {!q.answer && !q.parts?.some((p) => p.answer) && !q.pairs && <span className="text-[#9CA3AF]">No answer given</span>}
              </div>
              {marksOf(q) > 0 && <span className="shrink-0 text-[#6B7280]">[{marksOf(q)}]</span>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

/* ---------- Document kinds ---------- */

const WorksheetBody: React.FC<Props & { doc: Worksheet }> = ({ doc, opts, editable, busyId, onEdit, onAction }) => {
  const edit = onEdit ? (patch: Partial<Worksheet>) => onEdit({ ...doc, ...patch }) : undefined;
  const updateQ = (qid: string) =>
    onEdit
      ? (patch: Partial<Question>) =>
          onEdit({ ...doc, sections: doc.sections.map((s) => ({ ...s, questions: s.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) })) })
      : undefined;
  let n = 0;
  const exam = opts.theme === "exam";
  const classic = opts.theme === "classic";
  return (
    <>
      <Header doc={doc} opts={opts} edit={edit} />
      {doc.sections.map((s, si) => (
        <section key={s.id} className="mt-6">
          <div className={`break-after-avoid ${exam ? "border-b border-[#111827] pb-1" : classic ? "text-center" : "flex items-center gap-3"}`}>
            {!exam && !classic && <span className="h-5 w-1.5 rounded-full" style={{ background: opts.accent }} />}
            <Ed
              as="h2"
              value={s.title}
              on={onEdit ? (v) => onEdit({ ...doc, sections: doc.sections.map((x, j) => (j === si ? { ...x, title: v } : x)) }) : undefined}
              className={`block ${classic ? "font-serif text-[19px] font-bold" : "text-[16px] font-bold"} ${exam ? "uppercase tracking-[0.08em]" : ""}`}
            />
          </div>
          {s.intro && <p className="mt-1.5 text-[13px] text-[#4B5563]">{s.intro}</p>}
          {s.wordBank?.length ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#9CA3AF] px-3 py-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Word bank</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium">
                {s.wordBank.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </p>
            </div>
          ) : null}
          <div className={opts.theme === "bright" ? "mt-3 space-y-3" : "mt-1 divide-y divide-[#F3F4F6]"}>
            {s.questions.map((q) => {
              n += 1;
              return <QuestionBlock key={q.id} q={q} n={n} opts={opts} editable={editable} busy={busyId === q.id} update={updateQ(q.id)} onAction={onAction ? (a) => onAction(q.id, a) : undefined} />;
            })}
          </div>
        </section>
      ))}
      {doc.extension && (
        <div className="mt-6 break-inside-avoid rounded-2xl border-2 px-4 py-3" style={{ borderColor: exam || classic ? "#111827" : opts.accent }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: exam || classic ? "#111827" : opts.accent }}>
            ★ Challenge
          </p>
          <Ed as="p" value={doc.extension} on={edit ? (v) => edit({ extension: v }) : undefined} className="mt-1 block whitespace-pre-wrap" />
          <Lines n={4} />
        </div>
      )}
      {opts.answerKey && <AnswerKey doc={doc} opts={opts} />}
    </>
  );
};

const ExitBody: React.FC<Props & { doc: ExitTicket }> = ({ doc, opts }) => (
  <>
    <div className="grid grid-cols-2 gap-0">
      {Array.from({ length: 4 }).map((_, t) => (
        <div key={t} className="break-inside-avoid border border-dashed border-[#9CA3AF] p-4" style={{ minHeight: 470 }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: opts.theme === "exam" || opts.theme === "classic" ? "#374151" : opts.accent }}>
              Exit ticket
            </p>
            <span className="text-[10.5px] text-[#9CA3AF]">✂</span>
          </div>
          <p className="mt-1 text-[14.5px] font-bold leading-snug">{doc.title}</p>
          <div className="mt-2 flex items-end gap-2 text-[11px]">
            <b>Name</b>
            <span className="flex-1 border-b border-[#6B7280]" style={{ height: 14 }} />
          </div>
          <div className="mt-1 text-[12.5px]">
            {doc.questions.map((q, i) => (
              <QuestionBlock key={q.id} q={{ ...q, diagram: undefined }} n={i + 1} opts={{ ...opts, theme: opts.theme === "bright" ? "modern" : opts.theme }} compact />
            ))}
          </div>
          <div className="mt-2 border-t border-[#E5E7EB] pt-2 text-[11.5px]">
            <p className="font-semibold">{doc.reflection || "How confident do you feel?"}</p>
            <p className="mt-1.5 flex gap-2">
              {[1, 2, 3, 4].map((k) => (
                <span key={k} className="flex h-6 w-6 items-center justify-center rounded-full border border-[#9CA3AF] text-[11px]">
                  {k}
                </span>
              ))}
            </p>
          </div>
        </div>
      ))}
    </div>
    {opts.answerKey && <AnswerKey doc={doc} opts={opts} />}
  </>
);

const FlashBody: React.FC<Props & { doc: Flashcards }> = ({ doc, opts }) => {
  const pages: Flashcards["cards"][] = [];
  for (let i = 0; i < doc.cards.length; i += 8) pages.push(doc.cards.slice(i, i + 8));
  const card = (inner: React.ReactNode, key: string, front: boolean, idx: number) => (
    <div key={key} className="relative flex items-center justify-center border border-dashed border-[#9CA3AF] p-4 text-center" style={{ height: 230 }}>
      <span className="absolute left-2 top-1.5 text-[10px] text-[#9CA3AF]">{idx + 1}</span>
      {front && <span className="absolute right-2 top-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: opts.accent }}>{doc.title.slice(0, 28)}</span>}
      {inner}
    </div>
  );
  return (
    <>
      <p className="ws-noprint mb-3 text-[12px] text-[#6B7280]">Print double-sided (flip on long edge): backs are mirrored so each answer lands behind its card.</p>
      {pages.map((cards, p) => (
        <div key={p}>
          <div className={`grid grid-cols-2 ${p > 0 ? "ws-page-break" : ""}`}>
            {cards.map((c, i) =>
              card(
                <div>
                  <p className="text-[19px] font-bold leading-snug">{c.front}</p>
                  {c.diagram && <DiagramView spec={c.diagram} accent={opts.accent} className="mx-auto mt-2 w-full max-w-[220px]" />}
                </div>,
                `f${p}-${i}`,
                true,
                p * 8 + i,
              ),
            )}
          </div>
          <div className="ws-page-break grid grid-cols-2">
            {cards.map((c, i) => (
              // mirrored for long-edge duplex: a front in the left column has its back in the right column
              <div key={`b${p}-${i}`} style={{ gridColumn: i % 2 === 0 ? 2 : 1, gridRow: Math.floor(i / 2) + 1 }}>
                {card(<p className="text-[14px] leading-relaxed text-[#1F2937]">{c.back}</p>, `bc${p}-${i}`, false, p * 8 + i)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

/** The printable page itself: white paper in every app theme, sized for A4. */
export const PrintableDoc = React.forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { doc, opts } = props;
  const font = opts.theme === "classic" ? "Georgia, 'Times New Roman', serif" : opts.theme === "exam" ? "Arial, Helvetica, sans-serif" : '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
  return (
    <div
      ref={ref}
      className="ws-paper mx-auto w-full max-w-[794px] bg-[#FFFFFF] px-5 pb-10 pt-7 text-[#111827] sm:px-12 sm:pb-14 sm:pt-11"
      style={{
        fontFamily: font,
        fontSize: opts.accessible ? 16.5 : 14.5,
        lineHeight: opts.accessible ? 1.75 : 1.55,
        letterSpacing: opts.accessible ? "0.01em" : undefined,
        background: opts.accessible ? "#FFFDF5" : "#FFFFFF",
      }}
    >
      {doc.kind === "flashcards" ? (
        <>
          <Header doc={doc} opts={{ ...opts, nameFields: false }} />
          <div className="mt-5">
            <FlashBody {...props} doc={doc} />
          </div>
        </>
      ) : doc.kind === "exit" ? (
        <ExitBody {...props} doc={doc} />
      ) : (
        <WorksheetBody {...props} doc={doc} />
      )}
      <p className="mt-10 text-center text-[10px] tracking-[0.12em] text-[#9CA3AF]">MADE WITH REFYN STUDIO</p>
    </div>
  );
});
PrintableDoc.displayName = "PrintableDoc";
