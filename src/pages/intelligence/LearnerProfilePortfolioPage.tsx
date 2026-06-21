import React, { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LearnerProfilePortfolioPage = () => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "student") {
      setStudentId(user.id);
      return;
    }
    // teachers: load their class roster
    (async () => {
      const { data: classes } = await supabase.from("classes").select("id").eq("teacher_id", user.id);
      const ids = (classes || []).map((c: any) => c.id);
      if (!ids.length) return;
      const { data: members } = await supabase
        .from("class_members")
        .select("student_id, profiles:profiles!inner(full_name)")
        .in("class_id", ids);
      const unique = new Map<string, string>();
      (members || []).forEach((m: any) => unique.set(m.student_id, m.profiles?.full_name || m.student_id));
      setStudents(Array.from(unique.entries()).map(([id, name]) => ({ id, name })));
    })();
  }, [user]);

  const isStudent = user?.role === "student";

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <IntelligenceReport
              feature="learner_profile_badges"
              params={{ studentId: studentId || undefined }}
              title="Learner Profile Portfolio"
              description="Auto-curate evidence from chats, reflections, and submissions, then award IB Learner Profile badges across all 10 attributes — Bronze, Silver, Gold, or Emerging."
              icon={<Award className="h-6 w-6 text-primary" />}
              ctaLabel={isStudent ? "Generate my portfolio" : "Generate portfolio"}
            >
              {!isStudent && (
                <div>
                  <Label className="text-sm">Student</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Pick a student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isStudent && (
                <p className="text-sm text-muted-foreground">Using your own chats, portfolio updates, and recent submissions as evidence.</p>
              )}
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LearnerProfilePortfolioPage;
