import React, { useEffect, useState } from "react";
import FeatureGate from "@/components/FeatureGate";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPortfolioShareUrl } from "@/lib/publicUrl";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  Award,
  Briefcase,
  Calendar,
  ExternalLink,
  Eye,
  FolderOpen,
  Link2,
  Loader2,
  Plus,
  Share2,
  Sparkles,
  Tag,
  Copy,
  Download,
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
  external_links: any[];
  capstone_submission_id: string | null;
  created_at: string;
  updated_at: string;
}

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

  const loadProjects = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("portfolio_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setProjects((data as any as PortfolioProject[]) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.from("portfolio_projects").insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      });
      if (error) throw error;
      toast({ title: "Project created!" });
      setNewTitle("");
      setNewDescription("");
      setNewTags("");
      setShowCreate(false);
      loadProjects();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const importCapstones = async () => {
    if (!user) return;
    setIsImporting(true);
    try {
      // Fetch capstone submissions not yet in portfolio
      const { data: capstones } = await supabase
        .from("capstone_submissions")
        .select("id, path_id, text_content, file_name, file_url, ai_score, status, created_at")
        .eq("user_id", user.id);

      if (!capstones?.length) {
        toast({ title: "No capstones found", description: "Submit a capstone project first." });
        return;
      }

      // Get existing capstone IDs in portfolio
      const existingIds = projects.filter(p => p.capstone_submission_id).map(p => p.capstone_submission_id);
      const newCapstones = capstones.filter(c => !existingIds.includes(c.id));

      if (!newCapstones.length) {
        toast({ title: "All caught up", description: "All capstone projects are already in your portfolio." });
        return;
      }

      // Fetch path titles
      const pathIds = [...new Set(newCapstones.map(c => c.path_id))];
      const { data: paths } = await supabase
        .from("learning_paths")
        .select("id, title, subject")
        .in("id", pathIds);

      const inserts = newCapstones.map(c => {
        const path = paths?.find(p => p.id === c.path_id);
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
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const copyShareLink = (token: string) => {
    const url = getPortfolioShareUrl(token);
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share this URL with anyone." });
  };

  const togglePublish = async (project: PortfolioProject) => {
    const { error } = await supabase
      .from("portfolio_projects")
      .update({ is_published: !project.is_published })
      .eq("id", project.id);
    if (!error) {
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_published: !p.is_published } : p));
      toast({ title: project.is_published ? "Unpublished" : "Published & shareable!" });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <FeatureGate feature="portfolio">
      <div className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Portfolio</h1>
            <p className="text-muted-foreground mt-1">Showcase your projects, reflections, and growth</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={importCapstones} disabled={isImporting}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Import Capstones
            </Button>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> New Project</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Portfolio Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My awesome project" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="What this project is about..." className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tags (comma-separated)</label>
                    <Input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="math, coding, capstone" className="mt-1" />
                  </div>
                  <Button onClick={handleCreate} disabled={isCreating || !newTitle.trim()} className="w-full">
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Briefcase className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Your portfolio is empty</h3>
              <p className="text-muted-foreground mb-4">Import capstone projects or create new ones to build your portfolio.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={importCapstones}><Download className="mr-2 h-4 w-4" /> Import Capstones</Button>
                <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> New Project</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <Card key={project.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/portfolio/${project.id}`)}>
                {project.cover_image_url && (
                  <div className="h-40 overflow-hidden rounded-t-lg">
                    <img src={project.cover_image_url} alt={project.title} className="h-full w-full object-cover" />
                  </div>
                )}
                {!project.cover_image_url && (
                  <div className="h-40 rounded-t-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <FolderOpen className="h-12 w-12 text-primary/30" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description || "No description"}</p>
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {project.is_published && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyShareLink(project.share_token)} title="Copy share link">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant={project.is_published ? "default" : "ghost"}
                        className="h-7 w-7"
                        onClick={() => togglePublish(project)}
                        title={project.is_published ? "Unpublish" : "Publish & share"}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </FeatureGate>
    </div>
  );
};

export default PortfolioPage;
