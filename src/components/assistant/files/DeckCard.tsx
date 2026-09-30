import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Presentation, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DESIGN, createDeck } from "@/components/decks/store";
import type { DeckSpec } from "./outputs";

// The decks table is newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** A deck the chat asked Refyn Slides to build: opens the one already made, or makes it. */
export const DeckCard: React.FC<{
  deck: DeckSpec;
  userId?: string;
  sessionId: string | null;
  /** A reply that just arrived: open the builder straight away */
  autoStart?: boolean;
  canBuild: boolean;
}> = ({ deck, userId, sessionId, autoStart, canBuild }) => {
  const navigate = useNavigate();
  const [existing, setExisting] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    let off = false;
    if (!sessionId || !userId) { setExisting(null); return; }
    db.from("studio_decks")
      .select("id, brief:deck->brief")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }: { data: { id: string; brief: { topic?: string } | null }[] | null }) => {
        if (off) return;
        const hit = (data ?? []).find((r) => r.brief?.topic?.trim() === deck.brief.trim());
        setExisting(hit?.id ?? null);
      });
    return () => { off = true; };
  }, [sessionId, userId, deck.brief]);

  const open = async () => {
    if (existing) { navigate(`/decks/${existing}`); return; }
    if (!userId || !canBuild || busy) return;
    setBusy(true);
    try {
      const id = await createDeck(
        userId,
        { topic: deck.brief, slides: deck.slides, audience: deck.audience, sessionId: sessionId ?? undefined },
        { ...DEFAULT_DESIGN, theme: "auto" },
        deck.title,
      );
      navigate(`/decks/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoStart && existing === null && canBuild && !started.current) {
      started.current = true;
      open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, existing, canBuild]);

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-lp-line bg-lp-surface">
      <div className="lp-keep relative overflow-hidden px-5 py-4" style={{ background: "linear-gradient(135deg, #0B1230 0%, #1C2A6B 55%, #3B5BDB 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full opacity-50 blur-[60px]" style={{ background: "radial-gradient(closest-side, rgba(124,199,255,0.9), transparent)" }} />
        <p className="relative flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-200/90">
          <Presentation className="h-3.5 w-3.5" /> Refyn Slides
        </p>
        <p className="relative mt-1.5 text-[19px] font-semibold leading-snug tracking-[-0.01em] text-white">{deck.title}</p>
        <p className="relative mt-0.5 text-[12.5px] text-sky-100/80">
          {deck.slides} slides{deck.audience ? ` · ${deck.audience}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-relaxed text-lp-soft">{deck.brief}</p>
        {canBuild || existing ? (
          <button
            type="button"
            onClick={open}
            disabled={busy || existing === undefined}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-lp-blue px-4 text-[13.5px] font-medium text-white hover:bg-[#2F6FE0] disabled:opacity-60"
          >
            {busy || existing === undefined ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? <ArrowRight className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {existing ? "Open presentation" : busy ? "Opening…" : "Build presentation"}
          </button>
        ) : (
          <p className="text-[12.5px] text-lp-mute">Presentations are for teachers.</p>
        )}
      </div>
    </div>
  );
};
