import React, { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const THEMES = [
  "Who We Are",
  "Where We Are in Place and Time",
  "How We Express Ourselves",
  "How the World Works",
  "How We Organize Ourselves",
  "Sharing the Planet",
];
const BANDS = ["Early Years", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5"];

const PYPUnitGeneratorPage = () => {
  const [gradeBand, setGradeBand] = useState("Primary 3");
  const [theme, setTheme] = useState(THEMES[2]);
  const [subjects, setSubjects] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <IntelligenceReport
              feature="pyp_uoi"
              params={{ gradeBand, theme, subjects, notes }}
              title="PYP Unit of Inquiry Generator"
              description="A full 6-week IB PYP Unit of Inquiry — central idea, lines of inquiry, key concepts, ATL skills, provocations, station rotations, summative task, and parent letter."
              icon={<Sparkles className="h-6 w-6 text-primary" />}
              ctaLabel="Generate UoI"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Grade band</Label>
                  <Select value={gradeBand} onValueChange={setGradeBand}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Transdisciplinary theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {THEMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-sm">Focus subject(s) — optional</Label>
                <Input className="mt-2" value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="e.g. Science + Language, or integrated" />
              </div>
              <div className="mt-3">
                <Label className="text-sm">Teacher notes (context, prior unit, local angle)</Label>
                <Textarea className="mt-2 min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you want the AI to honour — e.g. tie to monsoon season, link to last unit on water..." />
              </div>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PYPUnitGeneratorPage;
