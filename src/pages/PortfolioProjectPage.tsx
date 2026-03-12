import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPortfolioShareUrl } from "@/lib/publicUrl";
import DashboardSidebar from "@/components/DashboardSidebar";
import PortfolioCollaborators from "@/components/PortfolioCollaborators";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileUp,
  Image,
  Link2,
  Loader2,
  MessageSquare,
  Palette,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { PORTFOLIO_THEMES, getTheme } from "@/lib/portfolioThemes";

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  tags: string[];
  share_token: string;
  is_published: boolean;
  media_urls: string[];
  external_links: { label: string; url: string }[];
  capstone_submission_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  invite_code: string | null;
}

interface Update {
  id: string;
  content: string;
  update_type: string;
  media_urls: string[];
  created_at: string;
}

interface CapstoneInfo {
  ai_score: number | null;
  ai_feedback: any;
  teacher_score: number | null;
  teacher_feedback: string | null;
  file_url: string | null;
  file_name: string | null;
  text_content: string | null;
  external_link: string | null;
}

interface TeacherComment {
  id: string;
  content: string;
  is_private: boolean;
  created_at: string;
}

const TeacherComments: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [tComments, setTComments] = useState<TeacherComment[]>([]);
  const [tLoading, setTLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("portfolio_comments")
        .select("id, content, is_private, created_at")
        .eq("project_id", projectId)
        .eq("is_private", false)
        .order("created_at", { ascending: false });
      setTComments((data as TeacherComment[]) || []);
      setTLoading(false);
    };
    load();
  }, [projectId]);

  if (tLoading || tComments.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Teacher Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tComments.map(c => (
          <div key={c.id} className="rounded-lg border p-3">
            <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
            <p className="text-sm whitespace-pre-wrap mt-1">{c.content}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const PortfolioProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [capstone, setCapstone] = useState<CapstoneInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Theme
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Cover image
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // New update form
  const [newUpdate, setNewUpdate] = useState("");
  const [updateType, setUpdateType] = useState("reflection");
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);

  // Media upload
  const [isUploading, setIsUploading] = useState(false);

  // New link
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const theme = THEME_PRESETS.find(t => t.id === selectedTheme) || THEME_PRESETS[0];

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      setIsLoading(true);
      const [projRes, updRes] = await Promise.all([
        supabase.from("portfolio_projects").select("*").eq("id", id).single(),
        supabase.from("portfolio_updates").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      ]);

      if (projRes.data) {
        const p = projRes.data as any;
        setProject({
          ...p,
          external_links: Array.isArray(p.external_links) ? p.external_links : [],
        });
        setEditTitle(p.title);
        setEditDescription(p.description);
        setEditTags((p.tags || []).join(", "));

        // Load saved theme from external_links metadata or localStorage
        const savedTheme = localStorage.getItem(`portfolio-theme-${p.id}`);
        if (savedTheme && THEME_PRESETS.some(t => t.id === savedTheme)) {
          setSelectedTheme(savedTheme);
        }

        if (p.capstone_submission_id) {
          const { data: cap } = await supabase
            .from("capstone_submissions")
            .select("ai_score, ai_feedback, teacher_score, teacher_feedback, file_url, file_name, text_content, external_link")
            .eq("id", p.capstone_submission_id)
            .single();
          if (cap) setCapstone(cap as any);
        }
      }
      setUpdates((updRes.data as any as Update[]) || []);
      setIsLoading(false);
    };
    load();
  }, [id, user]);

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    if (project) {
      localStorage.setItem(`portfolio-theme-${project.id}`, themeId);
    }
  };

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("portfolio_projects")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim(),
        tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
      })
      .eq("id", project.id);
    if (!error) {
      setProject(prev => prev ? { ...prev, title: editTitle.trim(), description: editDescription.trim(), tags: editTags.split(",").map(t => t.trim()).filter(Boolean) } : prev);
      setIsEditing(false);
      toast({ title: "Saved!" });
    }
    setIsSaving(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !project) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB", variant: "destructive" });
      return;
    }
    setIsUploadingCover(true);
    try {
      const filePath = `${user.id}/${project.id}/cover_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("portfolio-media").upload(filePath, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("portfolio-media").getPublicUrl(filePath);
      await supabase.from("portfolio_projects").update({ cover_image_url: urlData.publicUrl }).eq("id", project.id);
      setProject(prev => prev ? { ...prev, cover_image_url: urlData.publicUrl } : prev);
      toast({ title: "Cover image updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!project) return;
    await supabase.from("portfolio_projects").update({ cover_image_url: null }).eq("id", project.id);
    setProject(prev => prev ? { ...prev, cover_image_url: null } : prev);
    toast({ title: "Cover removed" });
  };

  const handleAddUpdate = async () => {
    if (!user || !project || !newUpdate.trim()) return;
    setIsAddingUpdate(true);
    const { data, error } = await supabase
      .from("portfolio_updates")
      .insert({ project_id: project.id, user_id: user.id, content: newUpdate.trim(), update_type: updateType })
      .select("*")
      .single();
    if (!error && data) {
      setUpdates(prev => [data as any, ...prev]);
      setNewUpdate("");
      toast({ title: "Update added!" });
    }
    setIsAddingUpdate(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !project) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const filePath = `${user.id}/${project.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("portfolio-media").upload(filePath, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("portfolio-media").getPublicUrl(filePath);
      const newUrls = [...project.media_urls, urlData.publicUrl];
      await supabase.from("portfolio_projects").update({ media_urls: newUrls }).eq("id", project.id);
      setProject(prev => prev ? { ...prev, media_urls: newUrls } : prev);
      toast({ title: "Media uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMedia = async (index: number) => {
    if (!project) return;
    const newUrls = project.media_urls.filter((_, i) => i !== index);
    await supabase.from("portfolio_projects").update({ media_urls: newUrls }).eq("id", project.id);
    setProject(prev => prev ? { ...prev, media_urls: newUrls } : prev);
    toast({ title: "Media removed" });
  };

  const handleSetCover = async (url: string) => {
    if (!project) return;
    await supabase.from("portfolio_projects").update({ cover_image_url: url }).eq("id", project.id);
    setProject(prev => prev ? { ...prev, cover_image_url: url } : prev);
    toast({ title: "Cover image set!" });
  };

  const handleAddLink = async () => {
    if (!project || !newLinkUrl.trim()) return;
    const links = [...project.external_links, { label: newLinkLabel.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() }];
    await supabase.from("portfolio_projects").update({ external_links: links }).eq("id", project.id);
    setProject(prev => prev ? { ...prev, external_links: links } : prev);
    setNewLinkLabel("");
    setNewLinkUrl("");
    toast({ title: "Link added!" });
  };

  const handleRemoveLink = async (index: number) => {
    if (!project) return;
    const links = project.external_links.filter((_, i) => i !== index);
    await supabase.from("portfolio_projects").update({ external_links: links }).eq("id", project.id);
    setProject(prev => prev ? { ...prev, external_links: links } : prev);
    toast({ title: "Link removed" });
  };

  const togglePublish = async () => {
    if (!project) return;
    const { error } = await supabase.from("portfolio_projects").update({ is_published: !project.is_published }).eq("id", project.id);
    if (!error) {
      setProject(prev => prev ? { ...prev, is_published: !prev.is_published } : prev);
      toast({ title: project.is_published ? "Unpublished" : "Published!" });
    }
  };

  const copyShareLink = () => {
    if (!project) return;
    navigator.clipboard.writeText(getPortfolioShareUrl(project.share_token));
    toast({ title: "Link copied!" });
  };

  const handleDelete = async () => {
    if (!project || !confirm("Delete this portfolio project? This cannot be undone.")) return;
    await supabase.from("portfolio_projects").delete().eq("id", project.id);
    toast({ title: "Deleted" });
    navigate("/portfolio");
  };

  const handleDeleteUpdate = async (updateId: string) => {
    await supabase.from("portfolio_updates").delete().eq("id", updateId);
    setUpdates(prev => prev.filter(u => u.id !== updateId));
    toast({ title: "Update deleted" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!project) return null;

  const isOwner = project.user_id === user?.id;

  return (
    <div className={`flex min-h-screen ${theme.bg}`}>
      <DashboardSidebar />
      <div className="flex-1 max-w-4xl">
        {/* Cover Image Section */}
        <div className="relative">
          {project.cover_image_url ? (
            <div className="relative h-56 md:h-72 overflow-hidden">
              <img
                src={project.cover_image_url}
                alt={project.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {isOwner && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="sm" variant="secondary" className="bg-white/90 backdrop-blur-sm" onClick={() => coverInputRef.current?.click()}>
                    {isUploadingCover ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Camera className="mr-1.5 h-3.5 w-3.5" />}
                    Change Cover
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white/90 backdrop-blur-sm" onClick={handleRemoveCover}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="absolute bottom-4 left-8 right-8">
                <Button variant="ghost" className="text-white/80 hover:text-white mb-2 pl-0" onClick={() => navigate("/portfolio")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
            </div>
          ) : (
            <div className={`h-48 md:h-56 ${theme.headerBg || 'bg-gradient-to-br from-primary/10 to-primary/5'} flex items-end relative`}>
              {isOwner && (
                <div className="absolute top-4 right-4">
                  <Button size="sm" variant="secondary" onClick={() => coverInputRef.current?.click()}>
                    {isUploadingCover ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Camera className="mr-1.5 h-3.5 w-3.5" />}
                    Add Cover Image
                  </Button>
                </div>
              )}
              <div className="p-8 pb-4">
                <Button variant="ghost" className="pl-0 mb-2" onClick={() => navigate("/portfolio")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              </div>
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
        </div>

        <div className="px-8 py-6">
          {/* Header with inline editing */}
          <div className="mb-6">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Project Title</Label>
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-2xl font-bold mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="mt-1" rows={4} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
                  <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="design, coding, capstone" className="mt-1" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <h1 className="text-3xl font-bold">{project.title}</h1>
                  <div className="flex gap-2 flex-shrink-0">
                    {isOwner && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => setShowThemePicker(!showThemePicker)} title="Change theme">
                          <Palette className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} title="Edit project">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant={project.is_published ? "default" : "outline"} size="sm" onClick={togglePublish}>
                      <Share2 className="mr-2 h-4 w-4" /> {project.is_published ? "Published" : "Publish"}
                    </Button>
                    {project.is_published && (
                      <Button variant="outline" size="sm" onClick={copyShareLink}><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
                    )}
                    {isOwner && (
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-base leading-relaxed">{project.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}
                </div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Created {new Date(project.created_at).toLocaleDateString()}
                  {project.updated_at !== project.created_at && (
                    <span className="ml-2">· Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Theme Picker */}
          {showThemePicker && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Page Theme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {THEME_PRESETS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`rounded-lg border-2 p-3 text-center text-xs font-medium transition-all ${
                        selectedTheme === t.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`h-8 rounded mb-1.5 ${t.headerBg || 'bg-gradient-to-br from-primary/10 to-primary/5'}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capstone Info */}
          {capstone && (
            <Card className={`mb-6 ${theme.accent}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Capstone Submission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 flex-wrap">
                  {capstone.ai_score !== null && <Badge variant="outline">AI Score: {capstone.ai_score}/100</Badge>}
                  {capstone.teacher_score !== null && <Badge>Teacher Score: {capstone.teacher_score}/100</Badge>}
                </div>
                {capstone.file_url && (
                  <a href={capstone.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Download className="h-4 w-4" /> Download: {capstone.file_name}
                  </a>
                )}
                {capstone.external_link && (
                  <a href={capstone.external_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="h-4 w-4" /> {capstone.external_link}
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Collaborators */}
          <PortfolioCollaborators
            projectId={project.id}
            isOwner={isOwner}
            inviteCode={project.invite_code}
          />

          {/* Media Gallery */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Image className="h-4 w-4" /> Media & Presentations</span>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <span>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload
                    </span>
                  </Button>
                  <input type="file" className="hidden" onChange={handleMediaUpload} accept="image/*,video/*,.pdf,.pptx,.ppt,.doc,.docx" />
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.media_urls.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No media yet. Upload images, presentations, or documents.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {project.media_urls.map((url, i) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                    return (
                      <div key={i} className="group relative rounded-lg border overflow-hidden">
                        {isImage ? (
                          <img src={url} alt={`Media ${i + 1}`} className="h-32 w-full object-cover" />
                        ) : (
                          <div className="h-32 flex items-center justify-center bg-muted">
                            <FileUp className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="secondary" className="h-8 w-8"><ExternalLink className="h-4 w-4" /></Button>
                          </a>
                          {isImage && (
                            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleSetCover(url)} title="Set as cover">
                              <Image className="h-4 w-4" />
                            </Button>
                          )}
                          {isOwner && (
                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleRemoveMedia(i)} title="Remove">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* External Links */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> External Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.external_links.map((link, i) => (
                <div key={i} className="flex items-center justify-between">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="h-4 w-4" /> {link.label}
                  </a>
                  {isOwner && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveLink(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2 border-t">
                <Input placeholder="Label" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} className="flex-1" />
                <Input placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={handleAddLink} disabled={!newLinkUrl.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          {/* Updates & Reflections */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Updates & Reflections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 border-b pb-4">
                <div className="flex gap-2">
                  <select
                    value={updateType}
                    onChange={e => setUpdateType(e.target.value)}
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="reflection">Reflection</option>
                    <option value="progress">Progress Update</option>
                    <option value="milestone">Milestone</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                <Textarea
                  value={newUpdate}
                  onChange={e => setNewUpdate(e.target.value)}
                  placeholder="Write a reflection, progress update, or milestone..."
                  className="min-h-[80px]"
                />
                <Button onClick={handleAddUpdate} disabled={isAddingUpdate || !newUpdate.trim()}>
                  {isAddingUpdate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Update
                </Button>
              </div>

              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No updates yet. Add reflections to track your growth.</p>
              ) : (
                <div className="space-y-4">
                  {updates.map(update => (
                    <div key={update.id} className="rounded-lg border p-4 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">{update.update_type}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(update.created_at).toLocaleDateString()}</span>
                        </div>
                        {isOwner && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteUpdate(update.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teacher Comments */}
          <TeacherComments projectId={project.id} />
        </div>
      </div>
    </div>
  );
};

export default PortfolioProjectPage;
