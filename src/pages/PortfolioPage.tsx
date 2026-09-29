import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowUpRight, Briefcase, Copy, Download, Eye, EyeOff, FolderOpen, Globe, Loader2, Plus, Share2, Sparkles, Tag } from "lucide-react";
import FeatureGate from "@/components/FeatureGate";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPortfolioShareUrl } from "@/lib/publicUrl";
import { cn } from "@/lib/utils";
import { EmptyState, ghostBtn } from "@/components/student/ui";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { Field, Modal, inputCls } from "@/components/student/Modal";
import { monogram, themeFor } from "@/components/student/themes";
import { tone } from "@/lib/portalAppearance";

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  tags: string[];
  share_token: string;
  is_published: boolean;
  media_urls: string[];
  capstone_submission_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Cover art for projects without an uploaded image. */
const Cover: React.FC<{ p: PortfolioProject; tall?: boolean }> = ({ p, tall }) => {
  const theme = themeFor(p.tags[0] ?? p.title);
  if (p.cover_image_url) {
    return (
      <div className={cn("lp-keep relative overflow-hidden", tall ? "h-64 lg:h-full lg:min-h-[300px]" : "h-44")}>
        <img src={p.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-lp-bg/80 via-transparent to-transparent" />
      </div>
    );
  }
  return (
    <div className={cn("lp-keep relative overflow-hidden", tall ? "h-64 lg:h-full lg:min-h-[300px]" : "h-44")} style={{ background: theme.gradient }}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(90% 90% at 80% 90%, black, transparent 70%)", WebkitMaskImage: "radial-gradient(90% 90% at 80% 90%, black, transparent 70%)" }}
      />
      <span aria-hidden className={cn("absolute select-none font-semibold leading-none tracking-[-0.06em] text-white/25 transition-transform duration-500 group-hover:-translate-y-1", tall ? "-bottom-6 right-6 text-[160px]" : "-bottom-5 right-4 text-[104px]")}>
        {monogram(p.title)}
      </span>
      {p.capstone_submission_id && (
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          <Sparkles className="h-3 w-3" /> Capstone
        </span>
      )}
    </div>
  );
};

const PortfolioPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const loadProjects = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase.from("portfolio_projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setProjects(((data as unknown) as PortfolioProject[]) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.from("portfolio_projects").insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (error) throw error;
      toast({ title: "Project created!" });
      setNewTitle("");
      setNewDescription("");
      setNewTags("");
      setShowCreate(false);
      loadProjects();
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const importCapstones = async () => {
    if (!user) return;
    setIsImporting(true);
    try {
      const { data: capstones } = await supabase.from("capstone_submissions").select("id, path_id, text_content, file_name, file_url, ai_score, status, created_at").eq("user_id", user.id);
      if (!capstones?.length) {
        toast({ title: "No capstones found", description: "Submit a capstone project first." });
        return;
      }
      const existingIds = projects.filter((p) => p.capstone_submission_id).map((p) => p.capstone_submission_id);
      const newCapstones = capstones.filter((c) => !existingIds.includes(c.id));
      if (!newCapstones.length) {
        toast({ title: "All caught up", description: "All capstone projects are already in your portfolio." });
        return;
      }
      const pathIds = [...new Set(newCapstones.map((c) => c.path_id))];
      const { data: paths } = await supabase.from("learning_paths").select("id, title, subject").in("id", pathIds);
      const inserts = newCapstones.map((c) => {
        const path = paths?.find((p) => p.id === c.path_id);
        return {
          user_id: user.id,
          capstone_submission_id: c.id,
          title: `Capstone: ${path?.title || "Learning Path"}`,
          description: c.text_content?.substring(0, 500) || "Capstone project submission",
          tags: path?.subject ? [path.subject, "capstone"] : ["capstone"],
          media_urls: c.file_url ? [c.file_url] : [],
        };
      });
      const { error } = await supabase.from("portfolio_projects").insert(inserts);
      if (error) throw error;
      toast({ title: `Imported ${inserts.length} capstone(s)!` });
      loadProjects();
    } catch (err) {
      toast({ title: "Import failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const copyShareLink = (token: string) => {
    navigator.clipboard.writeText(getPortfolioShareUrl(token));
    toast({ title: "Link copied!", description: "Share this URL with anyone." });
  };

  const togglePublish = async (project: PortfolioProject) => {
    const { error } = await supabase.from("portfolio_projects").update({ is_published: !project.is_published }).eq("id", project.id);
    if (!error) {
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, is_published: !p.is_published } : p)));
      toast({ title: project.is_published ? "Unpublished" : "Published & shareable!" });
    }
  };

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [projects]);
  const shown = tagFilter ? projects.filter((p) => p.tags.includes(tagFilter)) : projects;
  const published = projects.filter((p) => p.is_published).length;
  const [lead, ...rest] = shown;

  const actions = (p: PortfolioProject) => (
    <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {p.is_published && (
        <button type="button" onClick={() => copyShareLink(p.share_token)} title="Copy share link" aria-label="Copy share link" className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white">
          <Copy className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => togglePublish(p)}
        title={p.is_published ? "Unpublish" : "Publish & share"}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
          p.is_published ? "border-lp-green/40 bg-lp-green/10 text-lp-green" : "border-lp-line text-lp-soft hover:text-white",
        )}
      >
        {p.is_published ? <Globe className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
        {p.is_published ? "Public" : "Publish"}
      </button>
    </span>
  );

  return (
    <StudyShell>
      <FeatureGate feature="portfolio">
        <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Showcase</p>
            <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">Portfolio</h1>
            <p className="mt-1.5 max-w-[560px] text-[14.5px] text-lp-soft">Your best work in one place: projects, capstones, reflections and the story of how you got there. Publish any piece to share a link.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={importCapstones} disabled={isImporting} className={ghostBtn}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Import capstones
            </button>
            <button type="button" onClick={() => setShowCreate(true)} className={primaryBtn}>
              <Plus className="h-4 w-4" /> New project
            </button>
          </div>
        </header>

        {projects.length > 0 && (
          <div className="lp-fade mt-6 flex flex-wrap items-center gap-2" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
            {[
              { icon: Briefcase, label: `${projects.length} project${projects.length === 1 ? "" : "s"}` },
              { icon: Globe, label: `${published} public` },
              { icon: EyeOff, label: `${projects.length - published} private` },
            ].map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 rounded-full border border-lp-line bg-lp-surface/70 px-3 py-1 text-[12.5px] text-lp-soft">
                <s.icon className="h-3.5 w-3.5 text-lp-sky" /> {s.label}
              </span>
            ))}
            {tags.length > 0 && <span className="mx-1 h-4 w-px bg-lp-line" />}
            {tags.map(([t, n]) => (
              <button
                key={t}
                type="button"
                aria-pressed={tagFilter === t}
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition-colors",
                  tagFilter === t ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white",
                )}
              >
                <Tag className="h-3 w-3" style={{ color: tone(themeFor(t).accent) }} /> {t} <span className="text-lp-mute">{n}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="lp-skeleton h-[340px] rounded-3xl sm:col-span-2" />
              <div className="lp-skeleton h-[340px] rounded-3xl" />
            </div>
          ) : projects.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-lp-line">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
              <EmptyState
                icon={FolderOpen}
                title="Start your portfolio"
                body="Add a project you're proud of, or import the capstones from your learning paths. Publish any piece to get a link you can share."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => setShowCreate(true)} className={primaryBtn}>
                      <Plus className="h-4 w-4" /> New project
                    </button>
                    <button type="button" onClick={importCapstones} className={ghostBtn}>
                      <Download className="h-4 w-4" /> Import capstones
                    </button>
                  </div>
                }
                className="py-16"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {lead && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/portfolio/${lead.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/portfolio/${lead.id}`)}
                  className="lp-fade group grid cursor-pointer grid-cols-1 overflow-hidden rounded-3xl border border-lp-line bg-lp-surface transition-all duration-300 hover:border-white/20 hover:shadow-[0_30px_80px_-36px_rgba(59,130,246,0.7)] lg:grid-cols-[1.3fr_1fr]"
                  style={{ animationFillMode: "both" }}
                >
                  <Cover p={lead} tall />
                  <div className="flex flex-col p-6">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-lp-sky">{tagFilter ? tagFilter : "Latest project"}</p>
                    <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-white group-hover:text-lp-sky">{lead.title}</h2>
                    <p className="mt-2 line-clamp-5 text-[14px] leading-relaxed text-lp-soft">{lead.description || "No description yet."}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {lead.tags.slice(0, 5).map((t) => (
                        <span key={t} className="rounded-full px-2.5 py-0.5 text-[11.5px]" style={{ color: tone(themeFor(t).accent), background: `${themeFor(t).accent}1A` }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <span className="text-[12px] text-lp-mute">
                        {format(new Date(lead.created_at), "d MMM yyyy")}
                        {lead.media_urls?.length ? ` · ${lead.media_urls.length} file${lead.media_urls.length === 1 ? "" : "s"}` : ""}
                      </span>
                      {actions(lead)}
                    </div>
                  </div>
                </div>
              )}

              {rest.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p, i) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/portfolio/${p.id}`)}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/portfolio/${p.id}`)}
                      className="lp-fade group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-surface transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
                      style={{ animationDelay: `${60 + i * 45}ms`, animationFillMode: "both" }}
                    >
                      <Cover p={p} />
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="line-clamp-1 text-[15.5px] font-semibold text-white group-hover:text-lp-sky">{p.title}</h3>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-lp-soft">{p.description || "No description yet."}</p>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {p.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: tone(themeFor(t).accent), background: `${themeFor(t).accent}1A` }}>
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                          <span className="text-[11.5px] text-lp-mute">{format(new Date(p.created_at), "d MMM yyyy")}</span>
                          {actions(p)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lp-line bg-lp-surface/60 px-5 py-4">
                <p className="flex items-center gap-2 text-[13px] text-lp-soft">
                  <Eye className="h-4 w-4 text-lp-sky" />
                  Public projects get a link anyone can open, no login needed. Private ones stay visible only to you and your teachers.
                </p>
                <button type="button" onClick={() => setShowCreate(true)} className={cn(ghostBtn, "h-9")}>
                  <Plus className="h-4 w-4" /> Add another <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </FeatureGate>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New portfolio project"
        description="You can add media, a cover image, updates and collaborators once it's created."
        footer={
          <>
            <button type="button" onClick={() => setShowCreate(false)} className={ghostBtn}>
              Cancel
            </button>
            <button type="button" onClick={handleCreate} disabled={isCreating || !newTitle.trim()} className={primaryBtn}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create project
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <input className={inputCls} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Water filter design for the school garden" />
          </Field>
          <Field label="Description">
            <textarea className={cn(inputCls, "min-h-[110px]")} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What you made, why, and what you learned" />
          </Field>
          <Field label="Tags" hint="Separate with commas, e.g. design, biology, community project">
            <input className={inputCls} value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="design, biology" />
          </Field>
        </div>
      </Modal>
    </StudyShell>
  );
};

export default PortfolioPage;
