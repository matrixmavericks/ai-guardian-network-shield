import React, { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Brain } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ThinkingReplayPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("ai_chat_sessions").select("id, title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
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
              feature="thinking_replay"
              params={{ sessionId: sessionId || undefined }}
              title="Thinking Replay"
              description="See how you actually think. Refyn distills your AI chats into a visual map of questions, dead-ends, and breakthroughs."
              icon={<Brain className="h-6 w-6 text-primary" />}
              ctaLabel="Replay my thinking"
            >
              <Label className="text-sm">Focus on a specific session (optional)</Label>
              <Select value={sessionId || "__all__"} onValueChange={(v) => setSessionId(v === "__all__" ? "" : v)}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="All recent sessions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All recent sessions</SelectItem>
                  {sessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title || "Untitled"} — {new Date(s.created_at).toLocaleDateString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ThinkingReplayPage;
