import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getTheme } from "@/lib/portfolioThemes";
import {
  Calendar,
  ExternalLink,
  FileUp,
  Image,
  Link2,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  tags: string[];
  is_published: boolean;
  media_urls: string[];
  external_links: { label: string; url: string }[];
  capstone_submission_id: string | null;
  created_at: string;
  user_id: string;
  theme: string;
}

interface Update {
  id: string;
  content: string;
  update_type: string;
  media_urls: string[];
  created_at: string;
}

const SharedPortfolioPage = () => {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data: proj } = await supabase
        .from("portfolio_projects")
        .select("*")
        .eq("share_token", token)
        .eq("is_published", true)
        .single();

      if (!proj) { setNotFound(true); setIsLoading(false); return; }
      const p = proj as any;
      setProject({ ...p, external_links: Array.isArray(p.external_links) ? p.external_links : [] });

      const [updRes, profileRes] = await Promise.all([
        supabase.from("portfolio_updates").select("*").eq("project_id", p.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("full_name").eq("user_id", p.user_id).single(),
      ]);
      setUpdates((updRes.data as any as Update[]) || []);
      setAuthorName(profileRes.data?.full_name || "Student");
      setIsLoading(false);
    };
    load();
  }, [token]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (notFound || !project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
        <p className="text-muted-foreground">This portfolio project may have been unpublished or doesn't exist.</p>
      </div>
    );
  }

  const theme = getTheme(project.theme || "default");

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.textClass}`}>
      {/* Hero */}
      {project.cover_image_url ? (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img src={project.cover_image_url} alt={project.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-1">{project.title}</h1>
            <p className="text-white/80 text-lg">by {authorName}</p>
          </div>
        </div>
      ) : (
        <div className={`${theme.headerBg || 'bg-gradient-to-br from-primary/10 to-primary/5'} py-16`}>
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
            <p className="text-muted-foreground text-lg">by {authorName}</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Only show title again if no cover (already shown in hero with cover) */}
        {project.cover_image_url && null}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}
        </div>
        <p className="text-muted-foreground mb-8 text-base leading-relaxed">{project.description}</p>

        {/* Media */}
        {project.media_urls.length > 0 && (
          <Card className={`mb-6 ${theme.accent}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4" /> Project Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {project.media_urls.map((url, i) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                  return isImage ? (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Media ${i + 1}`} className="h-32 w-full rounded-lg object-cover border hover:opacity-80 transition" />
                    </a>
                  ) : (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="h-32 flex items-center justify-center bg-muted rounded-lg border hover:bg-muted/80 transition">
                      <FileUp className="h-8 w-8 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* External Links */}
        {project.external_links.length > 0 && (
          <Card className={`mb-6 ${theme.accent}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.external_links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" /> {link.label}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Updates */}
        {updates.length > 0 && (
          <Card className={theme.accent}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Project Journey</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {updates.map(update => (
                <div key={update.id} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs capitalize">{update.update_type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(update.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <Calendar className="inline h-3 w-3 mr-1" />
          Project created {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default SharedPortfolioPage;
