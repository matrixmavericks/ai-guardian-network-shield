import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User as UserIcon, BookOpen, Users, GraduationCap, Shield, CreditCard, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const WEBSITE_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

type ChatMsg = { role: "user" | "assistant"; content: string };

const DOCS = {
  admin: [
    {
      q: "How do I approve a new registration?",
      a: "Go to **Registration Requests**. Each row shows the user, role, and payment status. Click **Approve** to set the request to approved (the user will be activated on their next login). For paid plans, you can also click **Pay link** to send them straight to Stripe checkout.",
    },
    {
      q: "How do I turn payments on/off globally?",
      a: "On the **Registration Requests** page there's a 'Require payment at registration' switch. ON = users get redirected to Stripe checkout after signing up. OFF = users go into the manual approval queue and you approve/reject by hand.",
    },
    {
      q: "How do I create a comp (free) account?",
      a: "Open **Create Account** (admin sidebar). Fill in name, email, password, role and pick any plan + billing cycle. The account is created instantly with full access — no payment needed. Useful for pilot users, internal staff, and partner schools.",
    },
    {
      q: "How does the school per-seat billing work?",
      a: "School plans (Starter / Growth / Enterprise) charge per teacher seat + per student seat. When a school admin invites a user we check `school_seat_limits` and reject the invite if seats are full. They can upgrade their plan to add more seats.",
    },
    {
      q: "Where do I see AI usage and costs?",
      a: "**AI Usage** page shows token consumption and estimated USD cost per user per month. School-level caps live in `school_ai_settings.max_monthly_cost_usd`.",
    },
    {
      q: "How do I add discount codes?",
      a: "Use the `discount_codes` table. Each code can be percent-off or flat-amount-off, time-limited, and capped to N uses. Codes are validated server-side in the `create-checkout` edge function.",
    },
  ],
  teacher: [
    {
      q: "How do I create a class?",
      a: "**Classes → New Class**. Pick subject, curriculum (IB / IGCSE / US / etc.), and grading system. You'll get a 6-character join code to share with students.",
    },
    {
      q: "How do AI-generated learning paths work?",
      a: "On **Learning Paths**, click 'Generate with AI'. Provide a topic, level, and target hours. The AI builds a multi-module path with a final capstone project. You can edit it before assigning.",
    },
    {
      q: "What is Process Teaching Mode?",
      a: "It's a moderation layer that detects when a student is asking for a direct answer ('write my essay', 'solve this for me') and rewrites the request into a guided learning prompt. It's enforced platform-wide and you can extend the blocked-keyword list in school settings.",
    },
    {
      q: "How do I run a Live Quiz?",
      a: "**Live Quizzes → Create Quiz**. Choose teacher-paced or self-paced, set time per question and powerups. Students join with a code (Kahoot-style). You can also generate questions with AI from any topic.",
    },
    {
      q: "How do I review portfolios?",
      a: "Go to **Student Portfolios**. You can see published projects, leave comments, and provide capstone scores that flow into the student's grade book.",
    },
  ],
  student: [
    {
      q: "How do I join a class?",
      a: "**Classes → Join with code**, then enter the 6-character code your teacher shared.",
    },
    {
      q: "What can the AI assistant help with?",
      a: "It tutors you on any subject without giving direct answers. It guides your thinking, asks Socratic questions, and lets you build understanding — not copy answers.",
    },
    {
      q: "How are my AI tokens used?",
      a: "Each AI conversation uses tokens from your monthly plan limit. **Settings → Usage** shows what you've used this month. Free unused tokens reset at the start of each month.",
    },
    {
      q: "How do I publish my portfolio?",
      a: "**Portfolio → New Project**. Add description, media, links. Toggle 'Publish' to get a public share link on refyntech.online.",
    },
  ],
  parent: [
    {
      q: "How do I see what my child is doing?",
      a: "Sign in to the **Parent Dashboard**. You'll see filtered AI activity (by child, date, severity), grades, and learning path progress. Sensitive prompts are flagged for your review.",
    },
    {
      q: "Is my child's chat private?",
      a: "Conversations are visible to (a) the student, (b) their teachers, (c) the school admin, and (d) you as their parent. We never sell student data.",
    },
    {
      q: "How is billing handled?",
      a: "If you registered for the paid plan, you can manage billing from **Settings → Manage Billing**. This opens the Stripe portal where you can update card, view invoices, or cancel.",
    },
    {
      q: "What if my child tries to misuse the AI?",
      a: "Process Teaching Mode blocks attempts to get direct answers. Repeated misuse is logged in `bypass_attempts` and surfaced to teachers and admins.",
    },
  ],
};

const QUICK_PROMPTS = {
  general: [
    "Explain how Process Teaching Mode works",
    "Walk me through the registration flow end-to-end",
    "What's the difference between school plans?",
  ],
  parent: [
    "Draft a message to a worried parent about AI safety",
    "Summarize what a parent sees vs what a teacher sees",
    "How do I help a parent set up their account?",
  ],
  pilot: [
    "What KPIs should I track in week 1 of a pilot?",
    "How do I tell if a pilot school is engaged?",
    "Suggest 3 metrics that predict pilot conversion",
  ],
};

const PlatformDocsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAdmin = user?.email === WEBSITE_ADMIN_EMAIL;

  const [mode, setMode] = useState<"general" | "parent" | "pilot">("general");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Platform Docs is for the master administrator.</p>
      </div>
    );
  }

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const next: ChatMsg[] = [...chat, { role: "user", content }];
    setChat(next);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("docs-assistant", {
        body: { messages: next, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setChat([...next, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      toast({ title: "Assistant error", description: e?.message ?? "Try again", variant: "destructive" });
      setChat(next);
    } finally {
      setSending(false);
    }
  };

  const ROLE_TABS = [
    { value: "admin", label: "Admin", icon: Shield, color: "text-orange-600" },
    { value: "teacher", label: "Teacher", icon: GraduationCap, color: "text-purple-600" },
    { value: "student", label: "Student", icon: BookOpen, color: "text-blue-600" },
    { value: "parent", label: "Parent", icon: Users, color: "text-green-600" },
  ] as const;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Platform Docs
            </h1>
            <p className="text-muted-foreground">Full feature reference + AI helper for product, parent, and pilot questions.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Docs */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Feature reference</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="admin">
                    <TabsList className="grid grid-cols-4 w-full">
                      {ROLE_TABS.map(t => (
                        <TabsTrigger key={t.value} value={t.value}>
                          <t.icon className={`h-4 w-4 mr-1 ${t.color}`} />
                          {t.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {ROLE_TABS.map(t => (
                      <TabsContent key={t.value} value={t.value} className="mt-4">
                        <Accordion type="single" collapsible className="w-full">
                          {DOCS[t.value].map((d, i) => (
                            <AccordionItem key={i} value={`${t.value}-${i}`}>
                              <AccordionTrigger className="text-left">{d.q}</AccordionTrigger>
                              <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">
                                {d.a}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Plans & pricing cheat-sheet
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="border rounded-md p-3">
                    <p className="font-semibold mb-1">Student</p>
                    <p className="text-muted-foreground text-xs">Starter ₹150/mo · Standard ₹200/mo · Premium ₹300/mo</p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="font-semibold mb-1">Teacher</p>
                    <p className="text-muted-foreground text-xs">Individual + Pro tiers, unlimited tokens for both.</p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="font-semibold mb-1">School (per seat)</p>
                    <p className="text-muted-foreground text-xs">Starter / Growth / Enterprise — Enterprise is the most expensive tier.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: AI helper */}
            <Card className="lg:sticky lg:top-6 h-[calc(100vh-8rem)] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Docs AI assistant
                </CardTitle>
                <div className="flex gap-1 flex-wrap pt-2">
                  {(["general", "parent", "pilot"] as const).map(m => (
                    <Badge
                      key={m}
                      variant={mode === m ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => setMode(m)}
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                <ScrollArea className="flex-1 pr-3" ref={scrollRef as any}>
                  {chat.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Try:</p>
                      {QUICK_PROMPTS[mode].map((p, i) => (
                        <Button key={i} variant="outline" size="sm" className="w-full justify-start text-left h-auto py-2 text-xs" onClick={() => send(p)}>
                          {p}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chat.map((m, i) => (
                        <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className={`text-sm rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {sending && (
                        <div className="flex gap-2">
                          <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="text-sm bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
                <form
                  onSubmit={(e) => { e.preventDefault(); send(); }}
                  className="flex gap-2 border-t pt-3"
                >
                  <Input
                    placeholder={`Ask about ${mode === "general" ? "the platform" : mode === "parent" ? "parent support" : "pilot analysis"}...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                  />
                  <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformDocsPage;
