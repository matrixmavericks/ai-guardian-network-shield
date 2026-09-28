import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Atom, BookOpen, ChevronRight, FlaskConical, Globe2, Landmark, Leaf, Sigma } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { cn } from "@/lib/utils";
import type { Subject } from "@/content/myp";
import { STATUS_META, type Status } from "./store";

/** Sidebar + navy content area used by every subject page. */
export const StudyShell: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => {
  const { pathname } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [pathname]);
  return (
  <div className="flex h-screen bg-lp-bg">
    <DashboardSidebar />
    <div ref={scroller} className="lp-app relative z-[1] min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-lp-bg font-ui antialiased selection:bg-lp-blue/40 selection:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-[130px]"
        style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.45), transparent)" }}
      />
      <div className={cn("relative mx-auto px-5 pb-28 pt-7 sm:px-8 lg:px-10 lg:pb-14 lg:pt-9", wide ? "max-w-[1480px]" : "max-w-[1180px]")}>
        {children}
      </div>
    </div>
  </div>
  );
};

const ICONS = { leaf: Leaf, flask: FlaskConical, atom: Atom, sigma: Sigma, book: BookOpen, landmark: Landmark, globe: Globe2 };

export const SubjectGlyph: React.FC<{ subject: Subject; className?: string }> = ({ subject, className }) => {
  const Icon = ICONS[subject.icon];
  return <Icon className={className} />;
};

/** Small gradient tile with the subject's icon. */
export const SubjectBadge: React.FC<{ subject: Subject; size?: "sm" | "md" }> = ({ subject, size = "md" }) => (
  <span
    className={cn(
      "flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
      size === "sm" ? "h-8 w-8 rounded-lg" : "h-11 w-11 rounded-xl",
    )}
    style={{ background: subject.theme.gradient }}
  >
    <SubjectGlyph subject={subject} className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
  </span>
);

export const Crumbs: React.FC<{ items: { label: string; to?: string }[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] text-lp-mute">
    {items.map((it, i) => (
      <span key={i} className="contents">
        {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-lp-line" />}
        {it.to ? (
          <Link to={it.to} className="truncate transition-colors hover:text-white">
            {it.label}
          </Link>
        ) : (
          <span className="truncate text-lp-soft">{it.label}</span>
        )}
      </span>
    ))}
  </nav>
);

/** Title block for a subject tool page (questionbank, flashcards, ...). */
export const ToolHeader: React.FC<{
  subject: Subject;
  title: string;
  body?: string;
  icon: React.ElementType;
  accent?: string;
  actions?: React.ReactNode;
}> = ({ subject, title, body, icon: Icon, accent = "#7CB4FF", actions }) => (
  <>
    <Crumbs items={[{ label: "My subjects", to: "/my-courses" }, { label: subject.name, to: `/subjects/${subject.slug}` }, { label: title }]} />
    <div className="lp-fade mt-4 flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/5" style={{ background: `${accent}1F`, color: accent }}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">{subject.name}</p>
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[28px]">{title}</h1>
          {body && <p className="mt-0.5 text-[13.5px] text-lp-mute">{body}</p>}
        </div>
      </div>
      {actions}
    </div>
  </>
);

export const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const selectCls =
  "h-10 rounded-xl border border-lp-line bg-lp-surface px-3 text-[13.5px] text-white [color-scheme:dark] focus:border-lp-sky/60 focus:outline-none";

/** Ring that fills to show how well a topic is known. */
export const StatusIcon: React.FC<{ status: Status; size?: number; className?: string }> = ({ status, size = 18, className }) => {
  const m = STATUS_META[status];
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" className={cn("shrink-0", className)} role="img" aria-label={m.label}>
      <circle cx="9" cy="9" r={r} fill="none" stroke={status === "unseen" ? "#33415C" : `${m.color}40`} strokeWidth="2" strokeDasharray={status === "unseen" ? "2.2 2.2" : undefined} />
      {m.fill > 0 && m.fill < 1 && (
        <circle cx="9" cy="9" r={r} fill="none" stroke={m.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={`${c * m.fill} ${c}`} transform="rotate(-90 9 9)" />
      )}
      {m.fill >= 1 && (
        <>
          <circle cx="9" cy="9" r="8" fill={m.color} />
          <path d="M5.6 9.2l2.2 2.2 4.4-4.6" fill="none" stroke="#03060F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
};

/** Pill-style tabs that match the landing chips. */
export const TabBar = <T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; icon?: React.ElementType; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) => (
  <div role="tablist" className={cn("flex gap-1 overflow-x-auto rounded-2xl border border-lp-line bg-lp-deep/70 p-1 [scrollbar-width:none]", className)}>
    {tabs.map((t) => {
      const Icon = t.icon;
      const active = t.id === value;
      return (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={active}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13.5px] font-medium transition-all",
            active ? "bg-lp-raised text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(124,180,255,0.25)]" : "text-lp-mute hover:text-white",
          )}
        >
          {Icon && <Icon className={cn("h-4 w-4", active ? "text-lp-sky" : "")} />}
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className="rounded-full bg-lp-blue/20 px-1.5 text-[11px] tabular-nums text-lp-sky">{t.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

/* ---------- A small Markdown renderer for the built-in guides ---------- */
// Covers what the guides use: ## headings, paragraphs, lists, tables,
// blockquotes and **bold** / *italic* / `code`. (react-markdown here has no
// GFM plugin, so tables would not render with it.)

const inline = (text: string, keyBase: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{inline(tok.slice(2, -2), k)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else out.push(<em key={k}>{inline(tok.slice(1, -1), k)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

export const Markdown: React.FC<{ source: string; className?: string }> = ({ source, className }) => {
  const lines = source.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const Tag = (level <= 2 ? "h2" : level === 3 ? "h3" : "h4") as "h2" | "h3" | "h4";
      blocks.push(<Tag key={key}>{inline(h[2], key)}</Tag>);
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r));
      const [head, ...rest] = body;
      blocks.push(
        <div key={key} className="lp-md-table">
          <table>
            <thead>
              <tr>{cells(head).map((c, j) => <th key={j}>{inline(c, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rest.map((r, ri) => (
                <tr key={ri}>{cells(r).map((c, j) => <td key={j}>{inline(c, `${key}r${ri}c${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={key}>{inline(quote.join(" "), key)}</blockquote>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      blocks.push(<ul key={key}>{items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ""));
      blocks.push(<ol key={key}>{items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</ol>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\||>|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) {
      // A line the parser doesn't recognise: show it as text rather than loop.
      para.push(lines[i++]);
    }
    // Guides put one statement per line (worked examples), so keep those line breaks.
    blocks.push(
      <p key={key}>
        {para.map((ln, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {inline(ln, `${key}-${j}`)}
          </span>
        ))}
      </p>,
    );
  }
  return <div className={cn("lp-md", className)}>{blocks}</div>;
};

/** Split a guide into its ## sections (used by lessons). */
export const guideSections = (guide: string) => {
  const parts = guide.split(/\n(?=##\s)/);
  return parts
    .map((p) => {
      const m = /^##\s+(.*)\n?([\s\S]*)$/.exec(p.trim());
      return m ? { title: m[1].trim(), body: m[2].trim() } : { title: "", body: p.trim() };
    })
    .filter((s) => s.title || s.body);
};

/** Lesson steps: guide sections, with very short ones merged so every step has substance. */
export const lessonSteps = (guide: string) => {
  const steps: { title: string; body: string }[] = [];
  for (const s of guideSections(guide)) {
    const last = steps[steps.length - 1];
    if (last && last.body.length < 280) last.body += `\n\n### ${s.title}\n${s.body}`;
    else steps.push({ ...s });
  }
  const tail = steps[steps.length - 1];
  if (steps.length > 1 && tail.body.length < 150) {
    steps.pop();
    steps[steps.length - 1].body += `\n\n### ${tail.title}\n${tail.body}`;
  }
  return steps;
};

export const primaryBtn =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-lp-blue px-4 text-[13.5px] font-medium text-white shadow-[0_8px_30px_-8px_rgba(59,130,246,0.8)] transition-all hover:bg-[#2F6FE0] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky";

export const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line bg-lp-surface text-lp-soft transition-colors hover:border-white/20 hover:text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky";
