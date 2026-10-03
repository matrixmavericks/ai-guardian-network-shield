import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyShell } from "@/components/subjects/kit";
import { paletteVars } from "@/components/spaces/spaces";
import { SIMS, SUBJECTS, type Level, type SimMeta, type SimSubject } from "@/components/sims/registry";
import { SimThumb } from "@/components/sims/SimCards";

const LEVELS: Level[] = ["MYP 1-3", "MYP 4-5", "DP"];
const ORDER: SimSubject[] = ["physics", "maths", "economics", "geography", "biology", "chemistry"];

const SimCard: React.FC<{ s: SimMeta }> = ({ s }) => {
  const sub = SUBJECTS[s.subject];
  return (
    <Link to={`/sims/${s.id}`} className="group flex flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-surface transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-lp-sky/40 hover:shadow-[0_24px_60px_-30px_rgba(59,130,246,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-lp-sky">
      <div className="relative h-[170px] overflow-hidden border-b border-lp-line bg-lp-deep">
        <SimThumb meta={s} className="transition-transform duration-700 group-hover:scale-[1.04]" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#050a18]/70 px-2.5 py-1 text-[11px] font-semibold text-[#ffffff] backdrop-blur"><span className="h-1.5 w-1.5 rounded-full" style={{ background: sub.color }} />{sub.name}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[16px] font-semibold tracking-[-0.01em] text-white">{s.title}</p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-lp-soft">{s.tagline}</p>
        <p className="mt-auto flex flex-wrap gap-1 pt-3">{s.levels.map((l) => <span key={l} className="rounded-full bg-lp-raised px-2 py-0.5 text-[11px] text-lp-mute">{l}</span>)}</p>
      </div>
    </Link>
  );
};

const SimsPage: React.FC = () => {
  const [subject, setSubject] = useState<SimSubject | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => SIMS.filter((s) => (subject === "all" || s.subject === subject) && (level === "all" || s.levels.includes(level)) && (!q.trim() || `${s.title} ${s.tagline} ${SUBJECTS[s.subject].name}`.toLowerCase().includes(q.trim().toLowerCase()))), [subject, level, q]);
  const groups = ORDER.map((k) => ({ k, sims: list.filter((s) => s.subject === k) })).filter((g) => g.sims.length);
  const chip = (on: boolean) => cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors", on ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white");

  return (
    <StudyShell wide>
      <section data-tour="sims" className="sp-cover relative mb-7 overflow-hidden rounded-[28px] px-6 py-10 sm:px-10 sm:py-12" style={paletteVars("aqua")}>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] opacity-90 md:block">
          <SimThumb meta={SIMS.find((s) => s.id === "interference")!} className="[mask-image:linear-gradient(to_left,black_55%,transparent)]" />
        </div>
        <div className="relative z-[1] max-w-[560px]">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/70"><FlaskConical className="h-3.5 w-3.5" /> Simulation lab</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[46px]">See the idea move.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            {SIMS.length} interactive simulations for physics, maths, economics, geography, biology and chemistry. Change one thing, watch what happens, record your data and find the pattern. Teachers can present any of them full screen or set one up and send it as a task.
          </p>
        </div>
      </section>

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto">
            <button type="button" onClick={() => setSubject("all")} className={chip(subject === "all")}>All</button>
            {ORDER.map((k) => <button key={k} type="button" onClick={() => setSubject(k)} className={chip(subject === k)}><span className="h-2 w-2 rounded-full" style={{ background: SUBJECTS[k].color }} />{SUBJECTS[k].name}</button>)}
          </div>
          <label className="relative ml-auto w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search simulations" aria-label="Search simulations" className="h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 pl-9 pr-3 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-sky/60" />
          </label>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button type="button" onClick={() => setLevel("all")} className={chip(level === "all")}>Every level</button>
          {LEVELS.map((l) => <button key={l} type="button" onClick={() => setLevel(l)} className={chip(level === l)}>{l}</button>)}
        </div>
      </div>

      {groups.length ? (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.k}>
              <h2 className="mb-3 flex items-center gap-2 text-[19px] font-semibold tracking-[-0.01em] text-white"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SUBJECTS[g.k].color }} />{SUBJECTS[g.k].name}<span className="text-[13px] font-normal text-lp-mute">{g.sims.length}</span></h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>{g.sims.map((s) => <SimCard key={s.id} s={s} />)}</div>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-lp-line p-10 text-center text-[14px] text-lp-mute">No simulations match. Try another subject or level.</p>
      )}
    </StudyShell>
  );
};

export default SimsPage;
