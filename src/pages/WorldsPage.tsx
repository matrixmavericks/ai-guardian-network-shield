import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Drama, FileText, Loader2, Plus, Sparkles, Users, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { Modal, Field } from "@/components/student/Modal";
import { Planet, ShareControl, field, ghost, primary } from "@/components/spaces/ui";
import { buildWorld, listWorlds, paletteVars, saveWorld, type BuildStep, type Visibility, type World } from "@/components/spaces/spaces";

const SUBJECTS = ["Sciences", "Biology", "Chemistry", "Physics", "Mathematics", "Language and literature", "Language acquisition", "Individuals and societies", "History", "Geography", "Economics", "Design", "Arts", "Physical and health education", "Personal Project"];

const STEPS: { id: BuildStep; label: string }[] = [
  { id: "design", label: "Designing the World" },
  { id: "world", label: "Creating it" },
  { id: "guide", label: "Writing its guide" },
  { id: "notes", label: "Writing study notes" },
  { id: "cards", label: "Making flashcards" },
  { id: "scenes", label: "Setting the role-play scenes" },
];

export const WorldCard: React.FC<{ world: World; mine: boolean }> = ({ world, mine }) => (
  <Link
    to={`/world/${world.id}`}
    className="sp-cover group relative flex min-h-[230px] flex-col justify-end overflow-hidden rounded-3xl p-5 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lp-sky"
    style={paletteVars(world.color)}
  >
    <Planet color={world.color} emoji={world.emoji} size={120} className="right-[-18px] top-[-14px] transition-transform duration-700 group-hover:rotate-[8deg] group-hover:scale-105" />
    <div className="relative z-[1]">
      {world.subject && <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">{world.subject}</p>}
      <p className="mt-1 line-clamp-2 text-[21px] font-semibold leading-tight tracking-[-0.02em] text-white">{world.title}</p>
      {world.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-white/75">{world.description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] text-white/85">
        {world.counts && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur"><FileText className="h-3 w-3" /> {world.counts.items}</span>}
        {world.counts && world.counts.scenes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur"><Drama className="h-3 w-3" /> {world.counts.scenes} scene{world.counts.scenes === 1 ? "" : "s"}</span>}
        {mine && world.visibility === "classes" && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur"><Users className="h-3 w-3" /> Shared</span>}
        {!mine && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur"><Users className="h-3 w-3" /> From your teacher</span>}
      </div>
    </div>
  </Link>
);

/** The cosmic "building your World" screen. */
const Building: React.FC<{ step: BuildStep; title: string }> = ({ step, title }) => {
  const at = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="sp-keep fixed inset-0 z-[90] flex items-center justify-center bg-[#030712]/95 p-6 font-ui backdrop-blur" role="status" aria-live="polite">
      <div className="sp-cover absolute inset-0 opacity-60" style={paletteVars("violet")} aria-hidden />
      <div className="relative w-full max-w-[420px] text-center">
        <div className="relative mx-auto h-40 w-40">
          <Planet color="violet" emoji="🪐" size={160} className="sp-pulse left-0 top-0" />
        </div>
        <p className="mt-10 text-[12px] font-medium uppercase tracking-[0.22em] text-white/60">Building your World</p>
        <p className="mt-1.5 text-[24px] font-semibold tracking-[-0.02em] text-white">{title}</p>
        <ol className="mx-auto mt-6 max-w-[300px] space-y-2.5 text-left">
          {STEPS.map((s, i) => (
            <li key={s.id} className={cn("flex items-center gap-3 text-[14px] transition-colors", i < at ? "text-white/60" : i === at ? "text-white" : "text-white/30")}>
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border", i < at ? "border-[#34d399] bg-[#34d399]/20 text-[#6ee7b7]" : i === at ? "border-white/60" : "border-white/20")}>
                {i < at ? <Check className="h-3.5 w-3.5" /> : i === at ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
        {step === "design" && <p className="mt-6 text-[12.5px] text-white/50">This takes about half a minute.</p>}
      </div>
    </div>
  );
};

const WorldsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const [worlds, setWorlds] = useState<World[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", description: "", visibility: "private" as Visibility, class_ids: [] as string[] });
  const [step, setStep] = useState<BuildStep | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { listWorlds().then(setWorlds, (e) => { setWorlds([]); setError(e.message); }); }, []);
  const mine = (worlds ?? []).filter((w) => w.owner_id === user?.id);
  const shared = (worlds ?? []).filter((w) => w.owner_id !== user?.id);

  const build = async () => {
    if (!user || !form.title.trim()) return;
    setOpen(false);
    setError("");
    try {
      const id = await buildWorld(user.id, form, setStep);
      navigate(`/world/${id}`);
    } catch (e) {
      setStep(null);
      setOpen(true);
      setError((e as Error).message);
    }
  };
  const empty = async () => {
    if (!user || !form.title.trim()) return;
    setBusy(true);
    try {
      const w = await saveWorld(user.id, { ...form, emoji: "🌍", color: "blue" });
      navigate(`/world/${w.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <StudyShell wide>
      {step && <Building step={step} title={form.title} />}
      <section className="sp-cover relative mb-8 overflow-hidden rounded-[28px] px-6 py-10 sm:px-10 sm:py-14" style={paletteVars("blue")}>
        <Planet color="aqua" emoji="🪐" size={220} className="right-[-40px] top-[-30px] hidden opacity-90 sm:block" />
        <Planet color="violet" emoji="🌋" size={70} className="right-[230px] top-[150px] hidden sp-float md:block" />
        <div className="relative z-[1] max-w-[560px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">Worlds</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[46px]">A whole world for every unit.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            Notes, files, flashcards and tasks in one place, a guide that knows all of it, and role-play scenes where you step into the topic: interview a scientist, argue in a treaty room, run the lab.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ffffff] px-4 text-[14px] font-semibold text-[#0f172a] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] hover:bg-[#e2e8f0]"><Wand2 className="h-4 w-4" /> Build a World</button>
          </div>
        </div>
      </section>

      {error && !open && <p className="mb-4 rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}

      {!worlds ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>{[0, 1, 2].map((i) => <div key={i} className="lp-skeleton h-[230px] rounded-3xl" />)}</div>
      ) : (
        <div className="space-y-9">
          {shared.length > 0 && (
            <section>
              <h2 className="mb-3 text-[18px] font-semibold text-white">{teacher ? "Shared with you" : "From your classes"}</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>{shared.map((w) => <WorldCard key={w.id} world={w} mine={false} />)}</div>
            </section>
          )}
          <section>
            <h2 className="mb-3 text-[18px] font-semibold text-white">Your Worlds</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {mine.map((w) => <WorldCard key={w.id} world={w} mine />)}
              <button type="button" onClick={() => setOpen(true)} className="flex min-h-[230px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-lp-line text-lp-mute transition-colors hover:border-lp-sky/50 hover:text-white">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-current"><Plus className="h-6 w-6" /></span>
                <span className="text-[14px] font-medium">{mine.length ? "New World" : "Build your first World"}</span>
                {!mine.length && <span className="max-w-[240px] text-center text-[12.5px]">Name a unit and Refyn sets it up: notes, flashcards, a guide and two scenes.</span>}
              </button>
            </div>
          </section>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Build a World"
        description="Name the unit. Refyn writes the guide, study notes, flashcards and two role-play scenes; you can change everything afterwards."
        width="max-w-[560px]"
        footer={
          <>
            <button type="button" onClick={empty} disabled={busy || !form.title.trim()} className={ghost}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Start empty</button>
            <button type="button" onClick={build} disabled={!form.title.trim()} className={primary}><Sparkles className="h-4 w-4" /> Build with AI</button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <p className="rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}
          <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="e.g. The causes of World War One" className={field} /></Field>
          <Field label="Subject">
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} list="world-subjects" maxLength={60} placeholder="e.g. History" className={field} />
            <datalist id="world-subjects">{SUBJECTS.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="What it should cover" hint="Key ideas, the statement of inquiry, the level, anything Refyn should know.">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} maxLength={2500} placeholder="e.g. MYP year 4. Alliances, militarism, imperialism, nationalism and the assassination in Sarajevo. Students should weigh which cause mattered most." className={cn(field, "resize-none")} />
          </Field>
          {teacher && <ShareControl what="World" visibility={form.visibility} classIds={form.class_ids} onChange={(v, ids) => setForm({ ...form, visibility: v, class_ids: ids })} />}
        </div>
      </Modal>
    </StudyShell>
  );
};

export default WorldsPage;
