import React, { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AutoIEPPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [topic, setTopic] = useState<string>("");

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
              feature="auto_iep"
              params={{ classId, topic }}
              title="Auto-Differentiation Engine"
              description="One click. Refyn reads your class roster and recent performance, then writes per-student lesson differentiations."
              icon={<Layers className="h-6 w-6 text-primary" />}
              ctaLabel="Differentiate this lesson"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Choose a class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.subject})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Topic / lesson</Label>
                  <Input className="mt-2" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Quadratic equations" />
                </div>
              </div>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AutoIEPPage;
