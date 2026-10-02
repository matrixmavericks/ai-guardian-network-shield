import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BookOpen, ChevronDown, History, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { GemOrb, SpaceShell } from "@/components/spaces/ui";
import { SpaceChat } from "@/components/spaces/SpaceChat";
import { PALETTE, getGem, type Gem } from "@/components/spaces/spaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Past = { id: string; title: string; updated_at: string };

/** Previous chats with this Gem. */
const PastChats: React.FC<{ gemId: string; current: string | null; onPick: (id: string) => void; refresh: number }> = ({ gemId, current, onPick, refresh }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Past[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user) return;
    db.from("ai_chat_sessions").select("id, title, updated_at").eq("user_id", user.id).eq("gem_id", gemId).order("updated_at", { ascending: false }).limit(20).then(({ data }: { data: Past[] | null }) => setList(data ?? []));
  }, [gemId, user, refresh]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (!list.length) return null;
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[13px] text-lp-soft hover:text-white">
        <History className="h-4 w-4" /><span className="hidden sm:inline">Past chats</span><ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="lp-pop lp-fade absolute right-0 top-11 z-30 w-[300px] overflow-hidden rounded-2xl border border-lp-line bg-lp-surface p-1.5 shadow-2xl">
          {list.map((s) => (
            <button key={s.id} type="button" onClick={() => { onPick(s.id); setOpen(false); }} className={cn("block w-full rounded-xl px-3 py-2 text-left hover:bg-lp-raised", current === s.id && "bg-lp-blue/15")}>
              <span className="block truncate text-[13.5px] text-white">{s.title.replace(/^.*?:\s*/, "")}</span>
              <span className="block text-[11.5px] text-lp-mute">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const GemPage: React.FC = () => {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [gem, setGem] = useState<Gem | null | undefined>(undefined);
  const [session, setSession] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { setGem(undefined); getGem(id).then(setGem, () => setGem(null)); }, [id]);

  if (gem === undefined) return <SpaceShell><div className="m-auto h-24 w-24 animate-pulse rounded-full bg-lp-raised" /></SpaceShell>;
  if (!gem) {
    return (
      <SpaceShell>
        <div className="m-auto max-w-[420px] p-6 text-center">
          <GemOrb color="slate" emoji="🔒" size="lg" />
          <p className="mt-4 text-[17px] font-semibold text-white">This Gem isn't available</p>
          <p className="mt-1 text-[13.5px] text-lp-mute">It may have been deleted, or it isn't shared with any of your classes.</p>
          <Link to="/gems" className="mt-4 inline-flex text-[13.5px] text-lp-sky hover:underline">Back to Gems</Link>
        </div>
      </SpaceShell>
    );
  }
  const mine = gem.owner_id === user?.id;
  const back = gem.world_id ? `/world/${gem.world_id}` : "/gems";
  return (
    <SpaceShell>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-120px] h-[420px] w-[900px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]" style={{ background: `radial-gradient(closest-side, ${PALETTE[gem.color].b}, transparent)` }} />
      <header className="relative z-[1] flex h-16 shrink-0 items-center gap-3 border-b border-lp-line/60 px-3 sm:px-5">
        <Link to={back} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-white/[0.06] hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
        <GemOrb color={gem.color} emoji={gem.emoji} size="xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white">{gem.name}</p>
          {gem.tagline && <p className="hidden truncate text-[12px] text-lp-mute sm:block">{gem.tagline}</p>}
        </div>
        <PastChats gemId={gem.id} current={session} refresh={refresh} onPick={(s) => { setSession(s); setChatKey((k) => k + 1); }} />
        <button type="button" onClick={() => { setSession(null); setChatKey((k) => k + 1); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[13px] text-lp-soft hover:text-white"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New chat</span></button>
        {mine && <Link to={`/gems/${gem.id}/edit`} aria-label="Edit Gem" title="Edit" className="flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line text-lp-soft hover:text-white"><Pencil className="h-4 w-4" /></Link>}
      </header>
      <SpaceChat
        key={chatKey}
        className="relative z-[1] flex-1"
        mode="gem"
        gemId={gem.id}
        worldId={gem.world_id}
        who={{ name: gem.name, emoji: gem.emoji, color: gem.color }}
        starters={gem.starters}
        sessionId={session}
        onSession={(s) => { setSession(s); setRefresh((r) => r + 1); }}
        fabSafe
        empty={
          <>
            <GemOrb color={gem.color} emoji={gem.emoji} size="hero" float />
            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-[34px]">{gem.name}</h1>
            {gem.tagline && <p className="mt-1.5 max-w-[520px] text-[15px] text-lp-soft">{gem.tagline}</p>}
            {gem.knowledge.length > 0 && (
              <p className="mt-3 flex max-w-[560px] flex-wrap justify-center gap-1.5">
                {gem.knowledge.slice(0, 5).map((k) => <span key={k.id} className="inline-flex items-center gap-1 rounded-full bg-lp-raised px-2.5 py-1 text-[11.5px] text-lp-soft"><BookOpen className="h-3 w-3" /> {k.name}</span>)}
              </p>
            )}
          </>
        }
      />
    </SpaceShell>
  );
};

export default GemPage;
