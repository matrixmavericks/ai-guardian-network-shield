import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, ClipboardList, Drama, FileText, Layers, Loader2, MessageCircle, Orbit, Pencil, Plus, Settings2, Sparkles, Trash2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { StudyShell } from "@/components/subjects/kit";
import { Modal, Field } from "@/components/student/Modal";
import { ColorPicker, EmojiPicker, GemOrb, Planet, ShareControl, Tabs, field, ghost, primary } from "@/components/spaces/ui";
import { SpaceChat } from "@/components/spaces/SpaceChat";
import { Flashcards, Library, Scenes, Tasks } from "@/components/spaces/WorldParts";
import { BrainCanvas, colorFor, type BrainHandle } from "@/components/spaces/BrainCanvas";
import { TYPE_META, conceptLayer, linkConcepts, worldGraph } from "@/components/spaces/brain";
import { deleteWorld, draftGem, getWorld, paletteVars, saveGem, saveWorld, type WorldBundle, type WorldDraft } from "@/components/spaces/spaces";

type Tab = "guide" | "library" | "cards" | "scenes" | "tasks" | "map";

/** The World as a network, with ideas linking its notes. */
const WorldMap: React.FC<{ bundle: WorldBundle; onOpen: (href: string) => void }> = ({ bundle, onOpen }) => {
  const base = useMemo(() => worldGraph(bundle), [bundle]);
  const [ideas, setIdeas] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const ref = useRef<BrainHandle>(null);
  useEffect(() => {
    if (!base.index.length) return;
    const signal = { cancelled: false };
    setLinking(true);
    linkConcepts(base.index, (byItem, pending) => { setIdeas((p) => ({ ...p, ...byItem })); if (!pending) setLinking(false); }, signal).catch(() => setLinking(false));
    return () => { signal.cancelled = true; };
  }, [base]);
  const graph = useMemo(() => {
    const layer = conceptLayer(ideas, new Set(base.nodes.map((n) => n.id)));
    return { nodes: [...base.nodes, ...layer.nodes], links: [...base.links, ...layer.links] };
  }, [base, ideas]);
  const sel = graph.nodes.find((n) => n.id === selected);
  return (
    <div className="relative h-[min(72vh,700px)] overflow-hidden rounded-3xl border border-lp-line bg-lp-deep/60">
      <BrainCanvas ref={ref} nodes={graph.nodes} links={graph.links} selected={selected} onSelect={setSelected} onOpen={(n) => n.href && onOpen(n.href)} label={`Map of ${bundle.world.title}`} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-lp-line bg-lp-surface/80 px-3 py-1 text-[12px] text-lp-soft backdrop-blur">{graph.nodes.length} items{graph.nodes.some((n) => n.type === "concept") ? ` · ${graph.nodes.filter((n) => n.type === "concept").length} shared ideas` : ""}</span>
        {linking && <span className="inline-flex items-center gap-1.5 rounded-full border border-lp-line bg-lp-surface/80 px-3 py-1 text-[12px] text-lp-soft backdrop-blur"><Loader2 className="h-3 w-3 animate-spin" /> Linking ideas</span>}
      </div>
      <Link to={`/brain?node=world:${bundle.world.id}`} className="absolute right-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line bg-lp-surface/80 px-3 text-[12.5px] text-lp-soft backdrop-blur hover:text-white"><Orbit className="h-4 w-4" /> See it in your Brain</Link>
      {sel && (
        <div className="lp-fade absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-3 rounded-2xl border border-lp-line bg-lp-surface/90 p-3 backdrop-blur sm:inset-x-auto sm:left-4 sm:max-w-[460px]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(sel) }} />
          <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-white">{sel.label}</span><span className="block text-[11.5px] text-lp-mute">{TYPE_META[sel.type].label}{sel.sub ? ` · ${sel.sub}` : ""}</span></span>
          {sel.href && <button type="button" onClick={() => onOpen(sel.href!)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-lp-blue px-2.5 text-[12.5px] font-medium text-white"><ArrowUpRight className="h-3.5 w-3.5" /> Open</button>}
        </div>
      )}
    </div>
  );
};

const WorldPage: React.FC = () => {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const [bundle, setBundle] = useState<WorldBundle | null | undefined>(undefined);
  const [chatKey, setChatKey] = useState(0);
  const [settings, setSettings] = useState<WorldDraft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const tab = (params.get("tab") as Tab) || "guide";
  const setTab = (t: Tab) => { const p = new URLSearchParams(params); p.set("tab", t); p.delete("item"); setParams(p, { replace: true }); };

  const reload = useCallback(() => getWorld(id).then(setBundle, () => setBundle(null)), [id]);
  useEffect(() => { setBundle(undefined); reload(); }, [reload]);

  if (bundle === undefined) {
    return <StudyShell wide><div className="lp-skeleton h-[280px] rounded-[28px]" /><div className="lp-skeleton mt-5 h-12 w-[520px] max-w-full rounded-2xl" /><div className="lp-skeleton mt-5 h-[420px] rounded-3xl" /></StudyShell>;
  }
  if (!bundle) {
    return (
      <StudyShell>
        <div className="mx-auto max-w-[420px] py-20 text-center">
          <GemOrb color="slate" emoji="🔭" size="lg" />
          <p className="mt-4 text-[17px] font-semibold text-white">This World isn't available</p>
          <p className="mt-1 text-[13.5px] text-lp-mute">It may have been deleted, or it isn't shared with any of your classes.</p>
          <Link to="/worlds" className="mt-4 inline-flex text-[13.5px] text-lp-sky hover:underline">Back to Worlds</Link>
        </div>
      </StudyShell>
    );
  }
  const { world, items, scenes, guide } = bundle;
  const owner = world.owner_id === user?.id;
  const docs = items.filter((i) => i.kind === "note" || i.kind === "file" || i.kind === "link").length;
  const decks = items.filter((i) => i.kind === "flashcards");
  const cards = decks.reduce((a, d) => a + (d.data?.cards?.length ?? 0), 0);
  const tasks = items.filter((i) => i.kind === "task").length;
  const who = guide ? { name: guide.name, emoji: guide.emoji, color: guide.color } : { name: `${world.title} guide`, emoji: world.emoji, color: world.color };

  const addGuide = async () => {
    if (!user) return;
    setBusy("guide");
    setError("");
    try {
      const g = await draftGem(`A friendly expert guide for a learning World called "${world.title}"${world.subject ? ` (${world.subject})` : ""}. ${world.description}`, "assistant");
      const gem = await saveGem(user.id, { ...g, kind: "assistant", knowledge: [], visibility: "private", class_ids: [], world_id: world.id });
      await saveWorld(user.id, { ...world, guide_gem_id: gem.id });
      await reload();
      setChatKey((k) => k + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };
  const saveSettings = async () => {
    if (!settings || !user) return;
    setBusy("settings");
    setError("");
    try { await saveWorld(user.id, { ...settings, id: world.id }); setSettings(null); await reload(); }
    catch (e) { setError((e as Error).message.includes("row-level security") ? "You can only share with classes you teach." : (e as Error).message); }
    finally { setBusy(""); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${world.title}" and everything in it? This can't be undone.`)) return;
    setBusy("delete");
    try { await deleteWorld(world.id); navigate("/worlds", { replace: true }); } catch (e) { setError((e as Error).message); setBusy(""); }
  };
  const openHref = (href: string) => {
    if (href.startsWith("?")) { const p = new URLSearchParams(href.slice(1)); setParams(p, { replace: true }); return; }
    navigate(href);
  };

  return (
    <StudyShell wide>
      {/* Cover */}
      <section className="sp-cover relative mb-6 overflow-hidden rounded-[28px] px-6 pb-7 pt-5 sm:px-10 sm:pb-10" style={paletteVars(world.color)}>
        <Planet color={world.color} emoji={world.emoji} size={190} className="right-[-30px] top-[-20px] hidden sm:block sm:right-[40px] sm:top-[34px]" />
        <Planet color={world.color} emoji={world.emoji} size={96} className="right-[-10px] top-[18px] sm:hidden" />
        <div className="relative z-[1] flex items-center gap-2">
          <Link to="/worlds" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-[13px] text-white/75 hover:bg-white/10 hover:text-white"><ArrowLeft className="h-4 w-4" /> Worlds</Link>
        </div>
        <div className="relative z-[1] mt-6 max-w-[640px] pr-20 sm:mt-10 sm:pr-0">
          {world.subject && <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">{world.subject}</p>}
          <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[42px]">{world.title}</h1>
          {world.description && <p className="mt-3 text-[14.5px] leading-relaxed text-white/80">{world.description}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setTab("guide")} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ffffff] px-3.5 text-[13.5px] font-semibold text-[#0f172a] hover:bg-[#e2e8f0]"><MessageCircle className="h-4 w-4" /> Ask the guide</button>
            {scenes[0] && <Link to={`/world/${world.id}/scene/${scenes[0].id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 px-3.5 text-[13.5px] text-white hover:bg-white/10"><Drama className="h-4 w-4" /> Play a scene</Link>}
            {owner && <button type="button" onClick={() => setSettings({ title: world.title, subject: world.subject, description: world.description, emoji: world.emoji, color: world.color, visibility: world.visibility, class_ids: world.class_ids })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 px-3.5 text-[13.5px] text-white hover:bg-white/10"><Settings2 className="h-4 w-4" /> Edit World</button>}
            {owner && world.visibility === "classes" && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[12px] text-white/90"><Users className="h-3.5 w-3.5" /> Shared with {world.class_ids.length} class{world.class_ids.length === 1 ? "" : "es"}</span>}
          </div>
        </div>
      </section>

      {error && <p className="mb-4 rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "guide", label: "Guide", icon: MessageCircle },
          { id: "library", label: "Library", icon: FileText, count: docs },
          { id: "cards", label: "Flashcards", icon: Layers, count: cards },
          { id: "scenes", label: "Scenes", icon: Drama, count: scenes.length },
          { id: "tasks", label: "Tasks", icon: ClipboardList, count: tasks },
          { id: "map", label: "Map", icon: Orbit },
        ]}
      />

      {tab === "guide" && (
        <div className="overflow-hidden rounded-3xl border border-lp-line bg-lp-surface/60">
          <div className="flex flex-wrap items-center gap-3 border-b border-lp-line/70 px-4 py-3">
            <GemOrb color={who.color} emoji={who.emoji} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-white">{who.name}</p>
              <p className="truncate text-[12px] text-lp-mute">{guide?.tagline || `Knows everything in this World: ${docs} note${docs === 1 ? "" : "s"} and file${docs === 1 ? "" : "s"}, ${cards} flashcards.`}</p>
            </div>
            <button type="button" onClick={() => setChatKey((k) => k + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[13px] text-lp-soft hover:text-white"><Plus className="h-4 w-4" /> New chat</button>
            {owner && guide && <Link to={`/gems/${guide.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[13px] text-lp-soft hover:text-white"><Pencil className="h-4 w-4" /> Edit guide</Link>}
            {owner && !guide && <button type="button" onClick={addGuide} disabled={busy === "guide"} className={ghost}>{busy === "guide" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Give it a guide</button>}
          </div>
          <SpaceChat
            key={chatKey}
            className="h-[min(68vh,680px)]"
            mode="world"
            worldId={world.id}
            who={who}
            subject={world.subject}
            starters={guide?.starters.length ? guide.starters : ["Give me an overview of this unit", "Quiz me on the key ideas", "What should I learn first?", "Make me a revision plan"]}
            empty={
              <>
                <GemOrb color={who.color} emoji={who.emoji} size="xl" float />
                <p className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-white">{who.name}</p>
                <p className="mt-1 max-w-[460px] text-[13.5px] text-lp-mute">Ask anything about {world.title}. The guide answers from this World's notes and files first.</p>
              </>
            }
          />
        </div>
      )}
      {tab === "library" && <Library world={world} items={items} owner={owner} onChange={reload} openId={params.get("item")} />}
      {tab === "cards" && <Flashcards world={world} items={items} owner={owner} onChange={reload} />}
      {tab === "scenes" && <Scenes world={world} scenes={scenes} owner={owner} onChange={reload} />}
      {tab === "tasks" && <Tasks world={world} items={items} owner={owner} onChange={reload} />}
      {tab === "map" && <WorldMap bundle={bundle} onOpen={openHref} />}

      <Modal
        open={!!settings}
        onClose={() => setSettings(null)}
        title="Edit World"
        width="max-w-[600px]"
        footer={<>
          <button type="button" onClick={remove} disabled={!!busy} className="mr-auto inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] text-lp-mute hover:bg-lp-red/10 hover:text-lp-red">{busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete World</button>
          <button type="button" onClick={saveSettings} disabled={!!busy || !settings?.title.trim()} className={primary}>{busy === "settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</button>
        </>}
      >
        {settings && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <EmojiPicker value={settings.emoji} color={settings.color} onChange={(e) => setSettings({ ...settings, emoji: e })} />
              <div className="min-w-0 flex-1"><ColorPicker value={settings.color} onChange={(c) => setSettings({ ...settings, color: c })} /></div>
            </div>
            <Field label="Title"><input value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} maxLength={120} className={field} /></Field>
            <Field label="Subject"><input value={settings.subject} onChange={(e) => setSettings({ ...settings, subject: e.target.value })} maxLength={60} className={field} /></Field>
            <Field label="Description"><textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={3} maxLength={4000} className={cn(field, "resize-y")} /></Field>
            {teacher && <ShareControl what="World" visibility={settings.visibility} classIds={settings.class_ids} onChange={(v, ids) => setSettings({ ...settings, visibility: v, class_ids: ids })} />}
          </div>
        )}
      </Modal>
    </StudyShell>
  );
};

export default WorldPage;
