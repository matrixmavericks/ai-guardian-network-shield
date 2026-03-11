import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Eye,
  EyeOff,
  FileUp,
  FolderOpen,
  Image,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Trash2,
  Users,
} from "lucide-react";

interface StudentPortfolio {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  tags: string[];
  is_published: boolean;
  media_urls: string[];
  external_links: { label: string; url: string }[];
  created_at: string;
  updated_at: string;
  user_id: string;
  studentName: string;
}

interface Comment {
  id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  user_id: string;
}

const TeacherPortfolioReviewPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [projects, setProjects] = useState<StudentPortfolio[]>([]);
  const [selectedProject, setSelectedProject] = useState<StudentPortfolio | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Comment form
  const [newComment, setNewComment] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Load students from teacher's classes
  useEffect(() => {
    if (!user) return;
    const loadStudents = async () => {
      const { data: classes } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", user.id);

      if (!classes?.length) { setIsLoading(false); return; }

      const classIds = classes.map(c => c.id);
      const { data: members } = await supabase
        .from("class_members")
        .select("student_id")
        .in("class_id", classIds);

      if (!members?.length) { setIsLoading(false); return; }

      const studentIds = [...new Set(members.map(m => m.student_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);

      setStudents(
        (profiles || []).map(p => ({ id: p.user_id, name: p.full_name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setIsLoading(false);
    };
    loadStudents();
  }, [user]);

  // Load projects for selected student
  useEffect(() => {
    if (!selectedStudentId) { setProjects([]); setSelectedProject(null); return; }
    const loadProjects = async () => {
      setIsLoadingProjects(true);
      setSelectedProject(null);
      const { data } = await supabase
        .from("portfolio_projects")
        .select("*")
        .eq("user_id", selectedStudentId)
        .order("created_at", { ascending: false });

      const studentName = students.find(s => s.id === selectedStudentId)?.name || "Student";
      setProjects(
        (data || []).map((p: any) => ({
          ...p,
          external_links: Array.isArray(p.external_links) ? p.external_links : [],
          studentName,
        }))
      );
      setIsLoadingProjects(false);
    };
    loadProjects();
  }, [selectedStudentId, students]);

  // Load comments for selected project
  useEffect(() => {
    if (!selectedProject || !user) { setComments([]); return; }
    const loadComments = async () => {
      setIsLoadingComments(true);
      const { data } = await supabase
        .from("portfolio_comments")
        .select("*")
        .eq("project_id", selectedProject.id)
        .order("created_at", { ascending: false });
      setComments((data as Comment[]) || []);
      setIsLoadingComments(false);
    };
    loadComments();
  }, [selectedProject, user]);

  const handleSendComment = async () => {
    if (!user || !selectedProject || !newComment.trim()) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase
        .from("portfolio_comments")
        .insert({
          project_id: selectedProject.id,
          user_id: user.id,
          content: newComment.trim(),
          is_private: isPrivate,
        })
        .select("*")
        .single();
      if (error) throw error;
      setComments(prev => [data as Comment, ...prev]);
      setNewComment("");
      toast({ title: `${isPrivate ? "Private" : "Public"} comment added` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("portfolio_comments").delete().eq("id", commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: "Comment deleted" });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Student Portfolios</h1>
          <p className="text-muted-foreground mt-1">Review and provide feedback on student portfolio projects</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No students found. Students must be in your classes to view their portfolios.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Student List */}
            <div className="lg:col-span-3 space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Students</h2>
              {students.map(s => (
                <Button
                  key={s.id}
                  variant={selectedStudentId === s.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span className="truncate">{s.name}</span>
                </Button>
              ))}
            </div>

            {/* Projects + Detail */}
            <div className="lg:col-span-9">
              {!selectedStudentId ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Select a student to view their portfolio projects</p>
                  </CardContent>
                </Card>
              ) : isLoadingProjects ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : projects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>This student has no portfolio projects yet.</p>
                  </CardContent>
                </Card>
              ) : !selectedProject ? (
                /* Project Grid */
                <div className="grid gap-4 sm:grid-cols-2">
                  {projects.map(project => (
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedProject(project)}
                    >
                      {project.cover_image_url ? (
                        <div className="h-32 overflow-hidden rounded-t-lg">
                          <img src={project.cover_image_url} alt={project.title} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-32 rounded-t-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <FolderOpen className="h-10 w-10 text-primary/30" />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm line-clamp-1">{project.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.description || "No description"}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {project.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                          <Badge variant={project.is_published ? "default" : "outline"} className="text-xs">
                            {project.is_published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Project Detail + Comments */
                <div className="space-y-6">
                  <Button variant="ghost" className="pl-0" onClick={() => setSelectedProject(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to projects
                  </Button>

                  {/* Project Info */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{selectedProject.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">by {selectedProject.studentName}</p>
                        </div>
                        <Badge variant={selectedProject.is_published ? "default" : "outline"}>
                          {selectedProject.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedProject.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}
                      </div>

                      {/* Media */}
                      {selectedProject.media_urls.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><Image className="h-4 w-4" /> Media</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedProject.media_urls.map((url, i) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                              return isImage ? (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`Media ${i + 1}`} className="h-24 w-full rounded border object-cover hover:opacity-80 transition" />
                                </a>
                              ) : (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="h-24 flex items-center justify-center bg-muted rounded border">
                                  <FileUp className="h-6 w-6 text-muted-foreground" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* External Links */}
                      {selectedProject.external_links.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">External Links</h4>
                          {selectedProject.external_links.map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline">
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Comment Form */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Add Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Write your feedback or comment..."
                        className="min-h-[80px]"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                          <span className="text-sm flex items-center gap-1">
                            {isPrivate ? <><Lock className="h-3.5 w-3.5" /> Private (only you see this)</> : <><Eye className="h-3.5 w-3.5" /> Public (student can see)</>}
                          </span>
                        </div>
                        <Button onClick={handleSendComment} disabled={isSending || !newComment.trim()}>
                          {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                          Send
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comments List */}
                  {isLoadingComments ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Comments ({comments.length})</h3>
                      {comments.map(c => (
                        <Card key={c.id} className={c.is_private ? "border-dashed border-muted-foreground/30" : ""}>
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={c.is_private ? "outline" : "secondary"} className="text-xs">
                                    {c.is_private ? <><EyeOff className="h-3 w-3 mr-1" /> Private</> : <><Eye className="h-3 w-3 mr-1" /> Public</>}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteComment(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet on this project.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherPortfolioReviewPage;
