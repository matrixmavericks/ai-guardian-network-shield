import React, { useId, useState } from "react";
import { Bookmark, BookmarkCheck, Clock, Layers, Star, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { toggleBookmark, type LearningPath } from "@/services/learningPathService";
import { themeFor } from "@/components/student/themes";

/**
 * A winding trail with one stop per module; stops fill in as modules are done.
 * `done` is how many stops to fill (from progress when module ids aren't known).
 */
export const PathTrail: React.FC<{ stops: number; done: number; accent: string; className?: string; height?: number }> = ({ stops, done, accent, className, height = 56 }) => {
  const id = useId().replace(/:/g, "");
  const n = Math.max(2, Math.min(stops, 12));
  const w = 320;
  const h = height;
  const pts = Array.from({ length: n }, (_, i) => {
    const x = 16 + (i / (n - 1)) * (w - 32);
    const y = h / 2 + Math.sin((i / (n - 1)) * Math.PI * 2.2) * (h / 2 - 12);
    return [x, y] as const;
  });
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }, "");
  const filled = Math.round((Math.min(done, n) / n) * 1000) / 1000;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`t-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset={Math.max(0.001, filled)} stopColor={accent} />
          <stop offset={Math.max(0.002, filled + 0.001)} stopColor="rgba(255,255,255,0.22)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.22)" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#t-${id})`} strokeWidth="3" strokeLinecap="round" strokeDasharray={filled >= 1 ? undefined : "1 0"} />
      {pts.map(([x, y], i) => {
        const isDone = i < done;
        const isNext = i === done;
        return (
          <g key={i}>
            {isNext && <circle cx={x} cy={y} r="9" fill={accent} opacity="0.25" />}
            <circle cx={x} cy={y} r={isNext ? 6 : 4.5} fill={isDone ? accent : "#0A1328"} stroke={isDone || isNext ? accent : "rgba(255,255,255,0.35)"} strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
};

const DIFF: Record<string, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "#34D399" },
  intermediate: { label: "Intermediate", color: "#FBBF24" },
  advanced: { label: "Advanced", color: "#F2706A" },
};

export const DifficultyChip: React.FC<{ level: string; onDark?: boolean }> = ({ level, onDark }) => {
  const d = DIFF[level] ?? { label: level, color: "#7CB4FF" };
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em]", onDark ? "bg-black/25 text-white/90 backdrop-blur-sm" : "")}
      style={onDark ? undefined : { color: d.color, background: `${d.color}1F` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
      {d.label}
    </span>
  );
};

export const PathCard: React.FC<{
  path: LearningPath;
  progress: number;
  bookmarked: boolean;
  onOpen: () => void;
  onChanged: () => void;
  delay: number;
  large?: boolean;
}> = ({ path, progress, bookmarked, onOpen, onChanged, delay, large }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const theme = themeFor(path.subject);
  const stops = Math.max(2, path.modules.length);
  const done = Math.round((progress / 100) * stops);

  const bookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Login required", description: "Please log in to bookmark learning paths.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const now = await toggleBookmark(user.id, path.id);
      toast({ title: now ? "Bookmarked" : "Bookmark removed" });
      onChanged();
    } catch (err) {
      toast({ title: "Bookmark failed", description: (err as Error)?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className="lp-fade group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-surface text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_60px_-28px_rgba(59,130,246,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-lp-sky"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className={cn("relative overflow-hidden px-4 pt-4", large ? "h-40" : "h-32")} style={{ background: theme.gradient }}>
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <DifficultyChip level={path.difficulty} onDark />
            {path.featured && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#0B1530]">Featured</span>}
          </div>
          <button
            type="button"
            onClick={bookmark}
            disabled={busy}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            aria-pressed={bookmarked}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
          >
            {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
        <PathTrail stops={stops} done={done} accent="#FFFFFF" className="absolute inset-x-2 bottom-2 h-14 w-[calc(100%-1rem)] opacity-90 transition-transform duration-500 group-hover:-translate-y-0.5" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">{path.subject}</p>
        <h3 className={cn("mt-1 font-semibold tracking-[-0.015em] text-white group-hover:text-lp-sky", large ? "text-[19px]" : "text-[16px]")}>{path.title}</h3>
        <p className={cn("mt-1.5 text-[13px] leading-snug text-lp-soft", large ? "line-clamp-3" : "line-clamp-2")}>{path.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-lp-mute">
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" /> {path.modules.length} modules
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {path.estimatedHours}h
          </span>
          {path.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" /> {path.rating.toFixed(1)}
            </span>
          )}
          {path.enrolledCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {path.enrolledCount}
            </span>
          )}
        </div>
        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
            <span className="text-lp-mute">{progress >= 100 ? "Completed" : progress > 0 ? "In progress" : "Not started"}</span>
            <span className="font-medium tabular-nums text-white">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-lp-line">
            <div className="lp-bar-in h-full rounded-full" style={{ width: `${progress}%`, background: theme.accent }} />
          </div>
        </div>
      </div>
    </div>
  );
};
