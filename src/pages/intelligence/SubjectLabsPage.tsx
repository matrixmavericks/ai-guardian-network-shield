import React, { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { FlaskConical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LABS = [
  { value: "physics_uncertainty", label: "Physics — Uncertainty Calculator" },
  { value: "physics_ia_review", label: "Physics — IA Draft Reviewer" },
  { value: "math_exploration_ideas", label: "Math — Exploration (IA) Idea Generator" },
  { value: "math_step_solver", label: "Math — Notation-aware Step Solver" },
  { value: "is_case_study", label: "I&S — Case Study Builder" },
  { value: "econ_data_response", label: "Economics — Paper-2 Data Response Builder" },
];

const SubjectLabsPage = () => {
  const [labType, setLabType] = useState("math_step_solver");
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [input, setInput] = useState("");

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <IntelligenceReport
              feature="subject_lab"
              params={{ labType, level, subject, input }}
              title="Subject-Specific AI Labs"
              description="Deep, IB-aware tools for Physics, Math, I&S, and Economics — uncertainty calculations, IA reviews, exploration ideas, case studies, and data-response builders."
              icon={<FlaskConical className="h-6 w-6 text-primary" />}
              ctaLabel="Run lab"
            >
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm">Lab</Label>
                  <Select value={labType} onValueChange={setLabType}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LABS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Level</Label>
                  <Input className="mt-2" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="SL / HL / MYP 4..." />
                </div>
                <div>
                  <Label className="text-sm">Subject context</Label>
                  <Input className="mt-2" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mechanics, Calculus, Migration" />
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-sm">Input — measurements, IA draft, topic, problem, or stimulus</Label>
                <Textarea className="mt-2 min-h-[140px]" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste the problem, IA draft, dataset, or topic here..." />
              </div>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubjectLabsPage;
