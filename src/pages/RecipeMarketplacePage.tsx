import React, { useEffect, useMemo, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Sparkles, Star, Trash2, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

type Recipe = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  grade_band: string | null;
  prompt_template: string;
  example_output: string | null;
  tags: string[];
  is_public: boolean;
  uses_count: number;
  avg_rating: number;
  ratings_count: number;
  created_at: string;
};

const Stars = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        className={onChange ? "cursor-pointer" : "cursor-default"}
      >
        <Star className={`h-4 w-4 ${n <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
      </button>
    ))}
  </div>
);

const RecipeMarketplacePage = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [runOpen, setRunOpen] = useState<Recipe | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("prompt_recipes")
      .select("*")
      .order("avg_rating", { ascending: false })
      .order("uses_count", { ascending: false })
      .limit(200);
    setRecipes((data || []) as Recipe[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) =>
      [r.title, r.description, r.subject, r.grade_band, (r.tags || []).join(" ")]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [recipes, query]);

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Process Recipe Marketplace</h1>
                <p className="text-muted-foreground max-w-2xl mt-1">A school-vetted library of teacher-authored AI prompt recipes. Share your best instructional prompts, rate others, and run them in one click.</p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Publish a recipe</Button>
                </DialogTrigger>
                <CreateRecipeDialog onClose={() => setCreateOpen(false)} onCreated={load} />
              </Dialog>
            </div>

            <Card className="p-4">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes by title, subject, grade, tag..." />
            </Card>

            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="mine">My recipes</TabsTrigger>
                <TabsTrigger value="top">Top rated</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <RecipeGrid loading={loading} recipes={filtered} onRun={setRunOpen} onChanged={load} userId={user?.id} />
              </TabsContent>
              <TabsContent value="mine">
                <RecipeGrid loading={loading} recipes={filtered.filter(r => r.author_id === user?.id)} onRun={setRunOpen} onChanged={load} userId={user?.id} />
              </TabsContent>
              <TabsContent value="top">
                <RecipeGrid loading={loading} recipes={[...filtered].filter(r => r.ratings_count > 0).sort((a, b) => b.avg_rating - a.avg_rating)} onRun={setRunOpen} onChanged={load} userId={user?.id} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {runOpen && <RunRecipeDialog recipe={runOpen} onClose={() => { setRunOpen(null); load(); }} />}
    </div>
  );
};

const RecipeGrid = ({ recipes, loading, onRun, onChanged, userId }: { recipes: Recipe[]; loading: boolean; onRun: (r: Recipe) => void; onChanged: () => void; userId?: string }) => {
  if (loading) return <div className="flex items-center gap-2 text-muted-foreground p-8"><Loader2 className="h-4 w-4 animate-spin" /> Loading recipes…</div>;
  if (!recipes.length) return <Card className="p-8 text-center text-muted-foreground">No recipes yet. Be the first to publish one!</Card>;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} onRun={onRun} onChanged={onChanged} isOwner={r.author_id === userId} />
      ))}
    </div>
  );
};

const RecipeCard = ({ recipe, onRun, onChanged, isOwner }: { recipe: Recipe; onRun: (r: Recipe) => void; onChanged: () => void; isOwner: boolean }) => {
  const remove = async () => {
    if (!confirm(`Delete "${recipe.title}"?`)) return;
    const { error } = await supabase.from("prompt_recipes").delete().eq("id", recipe.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Recipe deleted" }); onChanged(); }
  };
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{recipe.title}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Stars value={recipe.avg_rating} /> <span>({recipe.ratings_count})</span>
        </div>
      </div>
      {recipe.description && <p className="text-sm text-muted-foreground line-clamp-3">{recipe.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        {recipe.subject && <Badge variant="secondary">{recipe.subject}</Badge>}
        {recipe.grade_band && <Badge variant="outline">{recipe.grade_band}</Badge>}
        {(recipe.tags || []).slice(0, 3).map((t) => <Badge key={t} variant="outline" className="opacity-70">#{t}</Badge>)}
      </div>
      <div className="flex items-center gap-2 mt-auto pt-2 border-t">
        <Button size="sm" onClick={() => onRun(recipe)}><Play className="h-3.5 w-3.5 mr-1" /> Run</Button>
        <span className="text-xs text-muted-foreground">{recipe.uses_count} runs</span>
        {isOwner && (
          <Button size="sm" variant="ghost" onClick={remove} className="ml-auto text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
        )}
      </div>
    </Card>
  );
};

const CreateRecipeDialog = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeBand, setGradeBand] = useState("");
  const [tags, setTags] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !promptTemplate.trim()) {
      toast({ title: "Add a title and prompt", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("prompt_recipes").insert({
      author_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      subject: subject.trim() || null,
      grade_band: gradeBand.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      prompt_template: promptTemplate,
      is_public: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not publish", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Recipe published" });
    onCreated();
    onClose();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Publish a Process Recipe</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Title</Label><Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vinod's Physics Hypothesis Generator" /></div>
        <div><Label>Short description</Label><Textarea className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When and how to use it" /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Subject</Label><Input className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Physics" /></div>
          <div><Label>Grade band</Label><Input className="mt-1" value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} placeholder="DP / MYP 4" /></div>
          <div><Label>Tags (comma)</Label><Input className="mt-1" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ia, mechanics" /></div>
        </div>
        <div>
          <Label>Prompt template</Label>
          <p className="text-xs text-muted-foreground mb-1">Use {"{{input}}"} as the placeholder where the runner will paste their context.</p>
          <Textarea className="mt-1 min-h-[160px] font-mono text-sm" value={promptTemplate} onChange={(e) => setPromptTemplate(e.target.value)} placeholder={"You are an IB Physics coach. Given the student work:\n{{input}}\n\nReturn 3 sharper hypotheses..."} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Publish</Button>
      </DialogFooter>
    </DialogContent>
  );
};

const RunRecipeDialog = ({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) => {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [running, setRunning] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [comment, setComment] = useState("");

  const run = async () => {
    setRunning(true);
    setReply("");
    try {
      const filled = recipe.prompt_template.replaceAll("{{input}}", input);
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { messages: [{ role: "user", content: filled }] },
      });
      if (error) throw error;
      const text = data?.reply || data?.message || data?.content || JSON.stringify(data);
      setReply(text);
      await supabase.from("prompt_recipes").update({ uses_count: recipe.uses_count + 1 }).eq("id", recipe.id);
    } catch (e: any) {
      toast({ title: "Run failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const submitRating = async () => {
    if (!user || !myRating) return;
    const { error } = await supabase.from("prompt_recipe_ratings").upsert(
      { recipe_id: recipe.id, user_id: user.id, rating: myRating, comment: comment || null },
      { onConflict: "recipe_id,user_id" },
    );
    if (error) toast({ title: "Rating failed", description: error.message, variant: "destructive" });
    else toast({ title: "Thanks for rating!" });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe.title}</DialogTitle>
        </DialogHeader>
        {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}
        <div className="space-y-3">
          <div>
            <Label>Your input (fills {"{{input}}"} in the recipe)</Label>
            <Textarea className="mt-1 min-h-[120px]" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste student work, lesson notes, or topic..." />
          </div>
          <Button onClick={run} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}Run recipe</Button>
          {reply && (
            <Card className="p-4 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{reply}</ReactMarkdown>
            </Card>
          )}
          <Card className="p-3">
            <div className="text-sm font-medium mb-2">Rate this recipe</div>
            <div className="flex items-center gap-3">
              <Stars value={myRating} onChange={setMyRating} />
              <Input className="flex-1" placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button size="sm" onClick={submitRating} disabled={!myRating}>Submit</Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeMarketplacePage;
