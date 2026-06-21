import React, { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Compass } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const IBStandardsMapperPage = () => {
  const { user } = useAuth();
  const [programme, setProgramme] = useState("auto-detect");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_chat_sessions")
      .select("id, subject, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setSessions(data || []));
  }, [user]);

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <IntelligenceReport
              feature="ib_mapper"
              params={{ programme, subject, gradeLevel, content, sessionId: sessionId || undefined }}
              title="IB Standards Auto-Mapper"
              description="Paste a lesson, assignment, or pick a chat session — get a live PYP/MYP/DP coverage heatmap with criteria, command terms, and next-step tasks."
              icon={<Compass className="h-6 w-6 text-primary" />}
              ctaLabel="Map to IB framework"
            >
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm">Programme</Label>
                  <Select value={programme} onValueChange={setProgramme}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto-detect">Auto-detect</SelectItem>
                      <SelectItem value="PYP">PYP (Primary)</SelectItem>
                      <SelectItem value="MYP">MYP (Middle Years)</SelectItem>
                      <SelectItem value="DP">DP (Diploma)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Subject (optional)</Label>
                  <Input className="mt-2" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics SL, Math AA HL, I&S" />
                </div>
                <div>
                  <Label className="text-sm">Grade / Year</Label>
                  <Input className="mt-2" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g. MYP 4, DP Y1, Grade 3" />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-sm">Optional: pick an AI chat session as source</Label>
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="No session — using pasted content" /></SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject || s.id.slice(0, 8)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3">
                <Label className="text-sm">Paste lesson, assignment, or rubric to map</Label>
                <Textarea className="mt-2 min-h-[120px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste any teaching artifact here..." />
              </div>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default IBStandardsMapperPage;
