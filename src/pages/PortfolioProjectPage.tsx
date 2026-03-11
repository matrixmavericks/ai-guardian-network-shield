import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPortfolioShareUrl } from "@/lib/publicUrl";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileUp,
  Image,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";


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

const PortfolioProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [capstone, setCapstone] = useState<CapstoneInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New update form
  const [newUpdate, setNewUpdate] = useState("");
  const [updateType, setUpdateType] = useState("reflection");
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);

  // Media upload
  const [isUploading, setIsUploading] = useState(false);

  // New link
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

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

        // Fetch capstone info if linked
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 p-8 max-w-4xl">
        <Button variant="ghost" className="mb-4 pl-0" onClick={() => navigate("/portfolio")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Portfolio
        </Button>

        {/* Header */}
        <div className="mb-6">
          {isEditing ? (
            <div className="space-y-3">
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-2xl font-bold" />
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} />
              <Input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="Tags (comma-separated)" />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> Save</Button>
                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <h1 className="text-3xl font-bold">{project.title}</h1>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button>
                  <Button variant={project.is_published ? "default" : "outline"} size="sm" onClick={togglePublish}>
                    <Share2 className="mr-2 h-4 w-4" /> {project.is_published ? "Published" : "Publish"}
                  </Button>
                  {project.is_published && (
                    <Button variant="outline" size="sm" onClick={copyShareLink}><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="text-muted-foreground mt-2">{project.description}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {project.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created {new Date(project.created_at).toLocaleDateString()}
              </div>
            </>
          )}
        </div>

        {/* Capstone Info */}
        {capstone && (
          <Card className="mb-6 border-primary/20">
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
                          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleSetCover(url)}>
                            <Image className="h-4 w-4" />
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
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink className="h-4 w-4" /> {link.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2 border-t">
              <Input placeholder="Label" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} className="flex-1" />
              <Input placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} className="flex-1" />
              <Button size="sm" onClick={handleAddLink} disabled={!newLinkUrl.trim()}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Updates & Reflections */}
        <Card>
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
                  <div key={update.id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs capitalize">{update.update_type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(update.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teacher Comments (public ones visible to student) */}
        <TeacherComments projectId={project.id} />
      </div>
    </div>
  );
};

export default PortfolioProjectPage;
