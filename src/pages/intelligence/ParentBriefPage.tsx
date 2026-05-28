import React, { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ParentBriefPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("classes").select("id, name, subject").eq("teacher_id", user.id).then(({ data }) => setClasses(data || []));
  }, [user]);

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <IntelligenceReport
              feature="parent_brief"
              params={{ classId }}
              title="Parent Auto-Brief"
              description="Personal weekly parent emails for every student in the class — drafted in seconds. Review, tweak, send."
              icon={<Mail className="h-6 w-6 text-primary" />}
              ctaLabel="Draft this week's briefs"
            >
              <Label className="text-sm">Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Choose a class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.subject})</SelectItem>)}
                </SelectContent>
              </Select>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ParentBriefPage;
