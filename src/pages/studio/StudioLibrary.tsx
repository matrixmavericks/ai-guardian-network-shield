import React, { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { FileText, Layers, Library, Search, Shapes, Ticket, ClipboardList, Trash2, Wand2 } from "lucide-react";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { EmptyState, Panel } from "@/components/student/ui";
import { cn } from "@/lib/utils";
import { DiagramView } from "@/components/studio/diagrams";
import { useLibrary, useStudio, type LibraryItem } from "@/components/studio/studio";
import { questionCount, totalMarks } from "@/components/studio/worksheet";

type Filter = "all" | "printable" | "diagram" | "tool";

const KIND_ICON = { worksheet: FileText, test: ClipboardList, exit: Ticket, flashcards: Layers } as const;
const KIND_LABEL = { worksheet: "Worksheet", test: "Test", exit: "Exit tickets", flashcards: "Flashcards" } as const;

const linkOf = (it: LibraryItem) => (it.type === "printable" ? `/studio/create?id=${it.id}` : it.type === "diagram" ? `/studio/diagrams?id=${it.id}` : `/studio/tool/${it.tool}?item=${it.id}`);

const StudioLibrary = () => {
  const { config, look } = useStudio();
  const { items, remove } = useLibrary();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const list = useMemo(
    () => items.filter((it) => (filter === "all" || it.type === filter) && (!q.trim() || it.title.toLowerCase().includes(q.trim().toLowerCase()))),
    [items, filter, q],
  );

  if (!config || !look) return <Navigate to="/dashboard" replace />;
  const toolName = (id: string) => config.tools.find((t) => t.id === id)?.title ?? "Tool";

  return (
    <StudyShell wide>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">
        <Link to="/studio" className="hover:text-white">
          {config.title}
        </Link>{" "}
        · Library
      </p>
      <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.035em] text-white">Library</h1>
      <p className="mt-1 text-[14px] text-lp-soft">Every worksheet, diagram and tool result you make is kept here on this device.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-lp-line bg-lp-surface/60 p-1">
          {(
            [
              ["all", "All"],
              ["printable", "Printables"],
              ["diagram", "Diagrams"],
              ["tool", "Tool results"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={cn("h-8 rounded-lg px-3 text-[13px] font-medium", filter === id ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
              {label} <span className="ml-1 text-[11.5px] opacity-70">{id === "all" ? items.length : items.filter((x) => x.type === id).length}</span>
            </button>
          ))}
        </div>
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library" className="h-10 w-full rounded-xl border border-lp-line bg-lp-deep/40 pl-9 pr-3 text-[13.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none" />
        </label>
      </div>

      {list.length ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((it, i) => {
            const Icon = it.type === "printable" ? KIND_ICON[it.kind] : it.type === "diagram" ? Shapes : Wand2;
            return (
              <Panel key={it.id} className="group flex flex-col overflow-hidden p-0" delay={Math.min(i, 9) * 30}>
                <Link to={linkOf(it)} className="block">
                  <div className="relative h-36 overflow-hidden border-b border-lp-line bg-[#FFFFFF]">
                    {it.type === "diagram" ? (
                      <div className="pointer-events-none h-full p-2">
                        <DiagramView spec={it.spec} accent={look.accent} className="h-full [&_svg]:h-full" />
                      </div>
                    ) : it.type === "printable" ? (
                      <div className="pointer-events-none p-4">
                        <div className="lp-keep rounded-lg px-3 py-2 text-white" style={{ background: look.gradient }}>
                          <p className="truncate text-[12.5px] font-bold">{it.title}</p>
                        </div>
                        {[0.9, 0.7, 0.8, 0.55].map((w, k) => (
                          <div key={k} className="mt-2.5 h-1.5 rounded-full bg-[#E5E7EB]" style={{ width: `${w * 100}%` }} />
                        ))}
                      </div>
                    ) : (
                      <p className="line-clamp-6 p-4 text-[11.5px] leading-relaxed text-[#475569]">{it.output.replace(/```[\s\S]*?```/g, "").replace(/[#*|]/g, "").slice(0, 400)}</p>
                    )}
                  </div>
                </Link>
                <div className="flex flex-1 items-start gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lp-raised text-lp-sky">
                    <Icon className="h-4 w-4" />
                  </span>
                  <Link to={linkOf(it)} className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[14px] font-medium text-white hover:text-lp-sky">{it.title}</p>
                    <p className="mt-0.5 text-[12px] text-lp-mute">
                      {it.type === "printable"
                        ? `${KIND_LABEL[it.kind]} · ${questionCount(it.doc)} ${it.kind === "flashcards" ? "cards" : "questions"}${it.kind !== "flashcards" ? ` · ${totalMarks(it.doc)} marks` : ""}`
                        : it.type === "tool"
                          ? toolName(it.tool)
                          : "Diagram"}
                      {" · "}
                      {format(it.at, "d MMM, HH:mm")}
                    </p>
                  </Link>
                  <button type="button" onClick={() => remove(it.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lp-mute opacity-0 transition-opacity hover:text-lp-red group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${it.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel className="mt-6 p-8">
          <EmptyState
            icon={Library}
            title={items.length ? "Nothing matches" : "Your library is empty"}
            body={items.length ? "Try another search or filter." : "Create a worksheet, diagram or tool result and it appears here automatically."}
            action={
              !items.length ? (
                <Link to="/studio/create" className={primaryBtn}>
                  <FileText className="h-4 w-4" /> Create a printable
                </Link>
              ) : undefined
            }
          />
        </Panel>
      )}
    </StudyShell>
  );
};

export default StudioLibrary;
