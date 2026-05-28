import React, { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Rocket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FutureSelfPage = () => {
  const [career, setCareer] = useState("Software Engineer");
  const [submitted, setSubmitted] = useState("Software Engineer");

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <IntelligenceReport
              key={submitted}
              feature="future_self"
              params={{ career: submitted }}
              title="Future Self — Career Simulator"
              description="Pick a target career. Refyn builds a 3-year roadmap tying your coursework, skills, projects, and portfolio."
              icon={<Rocket className="h-6 w-6 text-primary" />}
              ctaLabel="Build my 3-year roadmap"
            >
              <Label className="text-sm">Target career</Label>
              <div className="flex gap-2 mt-2">
                <Input value={career} onChange={(e) => setCareer(e.target.value)} placeholder="e.g. Bioengineer, Game Designer, Investment Banker" />
                <button className="px-4 py-2 rounded-md border text-sm hover:bg-accent" onClick={() => setSubmitted(career)}>Apply</button>
              </div>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FutureSelfPage;
