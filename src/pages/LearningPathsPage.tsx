import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bookmark, CheckCircle2, Compass, Map as MapIcon, Route, Search, Sparkles, Star, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getLearningPaths, getUserProgress, type LearningPath, type PathProgress } from "@/services/learningPathService";
import { EmptyState, ghostBtn } from "@/components/student/ui";
import { StudyShell, primaryBtn, selectCls } from "@/components/subjects/kit";
import { PathCard, PathTrail } from "@/components/paths/PathParts";
import { themeFor } from "@/components/student/themes";

type SortOption = "recommended" | "rating" | "newest" | "popular" | "duration";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";
type ProgressFilter = "all" | "not-started" | "in-progress" | "completed" | "bookmarked";

const LearningPathsPage = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [progressItems, setProgressItems] = useState<PathProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [paths, progress] = await Promise.all([getLearningPaths(), user ? getUserProgress(user.id) : Promise.resolve([])]);
        setLearningPaths(paths);
        setProgressItems(progress);
      } catch (err) {
        setError((err as Error)?.message || "Failed to load learning paths.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.id, refreshKey]);

  const progressMap = useMemo(() => new Map(progressItems.map((item) => [item.pathId, item])), [progressItems]);
  const bookmarked = useMemo(() => new Set(progressItems.filter((i) => i.bookmarked).map((i) => i.pathId)), [progressItems]);
  const subjects = useMemo(() => [...new Set(learningPaths.map((p) => p.subject))].sort(), [learningPaths]);
  const progressOf = (id: string) => progressMap.get(id)?.progress ?? 0;

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const list = learningPaths.filter((path) => {
      const matchesSearch = !q || path.title.toLowerCase().includes(q) || path.description.toLowerCase().includes(q) || path.tags.some((t) => t.toLowerCase().includes(q));
      const matchesSubject = activeSubject === "all" || path.subject === activeSubject;
      const matchesDifficulty = difficultyFilter === "all" || path.difficulty === difficultyFilter;
      const p = progressOf(path.id);
      const matchesProgress =
        progressFilter === "all" ||
        (progressFilter === "not-started" && p === 0) ||
        (progressFilter === "in-progress" && p > 0 && p < 100) ||
        (progressFilter === "completed" && p === 100) ||
        (progressFilter === "bookmarked" && bookmarked.has(path.id));
      return matchesSearch && matchesSubject && matchesDifficulty && matchesProgress;
    });
    return list.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "popular":
          return b.enrolledCount - a.enrolledCount;
        case "duration":
          return a.estimatedHours - b.estimatedHours;
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningPaths, searchTerm, activeSubject, difficultyFilter, progressFilter, sortBy, bookmarked, progressMap]);

  const inProgress = useMemo(
    () =>
      progressItems
        .filter((i) => i.progress > 0 && i.progress < 100)
        .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
        .map((i) => ({ item: i, path: learningPaths.find((p) => p.id === i.pathId) }))
        .filter((x): x is { item: PathProgress; path: LearningPath } => !!x.path),
    [progressItems, learningPaths],
  );
  const featured = learningPaths.filter((p) => p.featured).slice(0, 2);
  const stats = [
    { label: "In progress", value: inProgress.length, icon: Route, filter: "in-progress" as const },
    { label: "Completed", value: progressItems.filter((i) => i.progress === 100).length, icon: CheckCircle2, filter: "completed" as const },
    { label: "Bookmarked", value: bookmarked.size, icon: Bookmark, filter: "bookmarked" as const },
    { label: "To explore", value: learningPaths.length, icon: Compass, filter: "all" as const },
  ];
  const refresh = () => setRefreshKey((k) => k + 1);
  const open = (id: string) => navigate(`/learning-path/${id}`);

  return (
    <StudyShell>
      <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Learning</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">Learning paths</h1>
          <p className="mt-1.5 max-w-[560px] text-[14.5px] text-lp-soft">Step-by-step journeys with lessons, quizzes and a capstone at the end. Pick one up, or build your own with AI.</p>
        </div>
        {user && (
          <button type="button" onClick={() => navigate("/create-learning-path")} className={primaryBtn}>
            <Wand2 className="h-4 w-4" /> Build a custom path
          </button>
        )}
      </header>

      {error && <p className="mt-6 rounded-2xl border border-lp-red/30 bg-lp-red/10 px-4 py-3 text-[13.5px] text-lp-red">{error}</p>}

      <div className="lp-fade mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setProgressFilter(s.filter)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              progressFilter === s.filter && s.filter !== "all" ? "border-lp-sky/50 bg-lp-blue/10" : "border-lp-line bg-lp-surface/70 hover:border-white/20",
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lp-raised text-lp-sky">
              <s.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[18px] font-semibold tabular-nums leading-tight text-white">{s.value}</span>
              <span className="block text-[12px] text-lp-mute">{s.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Continue */}
      {inProgress.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-medium text-white">
            <MapIcon className="h-4 w-4 text-lp-sky" /> Pick up where you left off
          </h2>
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
            {inProgress.map(({ item, path }, i) => {
              const theme = themeFor(path.subject);
              const sorted = [...path.modules].sort((a, b) => a.order - b.order);
              const nextModule = sorted.find((m) => !item.completedModules.includes(m.id));
              return (
                <button
                  key={path.id}
                  type="button"
                  onClick={() => open(path.id)}
                  className="lp-fade group relative w-[320px] shrink-0 snap-start overflow-hidden rounded-3xl border border-lp-line bg-lp-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-white/20"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: theme.gradient }} />
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">{path.subject}</p>
                  <p className="mt-1 truncate text-[15.5px] font-semibold text-white">{path.title}</p>
                  <PathTrail stops={path.modules.length} done={item.completedModules.length} accent={theme.accent} className="mt-3 h-12 w-full" />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[12.5px] text-lp-soft">
                      <span className="text-lp-mute">Next: </span>
                      {nextModule?.title ?? "Capstone"}
                    </p>
                    <span className="shrink-0 text-[12.5px] font-semibold tabular-nums" style={{ color: theme.accent }}>
                      {item.progress}%
                    </span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-lp-sky">
                    Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && !isLoading && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-medium text-white">
            <Star className="h-4 w-4 text-[#FBBF24]" /> Featured
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {featured.map((p, i) => (
              <PathCard key={p.id} path={p} progress={progressOf(p.id)} bookmarked={bookmarked.has(p.id)} onOpen={() => open(p.id)} onChanged={refresh} delay={i * 60} large />
            ))}
          </div>
        </section>
      )}

      {/* Browse */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search learning paths</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search paths, topics and tags"
              className="h-10 w-full rounded-xl border border-lp-line bg-lp-surface pl-9 pr-3 text-[13.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
            />
          </label>
          <div role="radiogroup" aria-label="Difficulty" className="flex gap-1 rounded-xl border border-lp-line bg-lp-deep/70 p-1">
            {(["all", "beginner", "intermediate", "advanced"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={difficultyFilter === d}
                onClick={() => setDifficultyFilter(d)}
                className={cn("h-8 rounded-lg px-2.5 text-[12.5px] font-medium capitalize", difficultyFilter === d ? "bg-lp-raised text-white" : "text-lp-mute hover:text-white")}
              >
                {d === "all" ? "Any level" : d}
              </button>
            ))}
          </div>
          <select value={progressFilter} onChange={(e) => setProgressFilter(e.target.value as ProgressFilter)} className={selectCls} aria-label="Progress">
            <option value="all">All paths</option>
            <option value="not-started">Not started</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="bookmarked">Bookmarked</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className={selectCls} aria-label="Sort">
            <option value="recommended">Recommended</option>
            <option value="rating">Highest rated</option>
            <option value="newest">Newest</option>
            <option value="popular">Most popular</option>
            <option value="duration">Shortest first</option>
          </select>
        </div>
        {subjects.length > 1 && (
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {["all", ...subjects].map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={activeSubject === s}
                onClick={() => setActiveSubject(s)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium",
                  activeSubject === s ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white",
                )}
              >
                {s !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: themeFor(s).accent }} />}
                {s === "all" ? "All subjects" : s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="lp-skeleton h-[330px] rounded-3xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-lp-line">
              <EmptyState
                icon={Sparkles}
                title={learningPaths.length ? "No paths match those filters" : "No learning paths yet"}
                body={learningPaths.length ? "Try a different subject or level, or build your own path in seconds." : "Build your own path with AI: tell Refyn what you want to learn."}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {learningPaths.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setActiveSubject("all");
                          setDifficultyFilter("all");
                          setProgressFilter("all");
                        }}
                        className={ghostBtn}
                      >
                        Clear filters
                      </button>
                    )}
                    {user && (
                      <button type="button" onClick={() => navigate("/create-learning-path")} className={primaryBtn}>
                        <Wand2 className="h-4 w-4" /> Build a path
                      </button>
                    )}
                  </div>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, i) => (
                <PathCard key={p.id} path={p} progress={progressOf(p.id)} bookmarked={bookmarked.has(p.id)} onOpen={() => open(p.id)} onChanged={refresh} delay={Math.min(i, 8) * 40} />
              ))}
            </div>
          )}
        </div>
      </section>
    </StudyShell>
  );
};

export default LearningPathsPage;
