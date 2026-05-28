import React, { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { FlaskConical } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const PolicySandboxPage = () => {
  const [change, setChange] = useState("Disable image generation for grades 6–8");
  const [applied, setApplied] = useState(change);

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto">
            <IntelligenceReport
              key={applied}
              feature="policy_sandbox"
              params={{ change: applied }}
              title="Policy Sandbox — What If?"
              description="Simulate any AI policy change against the last 30 days of real usage before you ship it."
              icon={<FlaskConical className="h-6 w-6 text-primary" />}
              ctaLabel="Simulate this policy"
            >
              <Label className="text-sm">Proposed change</Label>
              <Textarea className="mt-2" value={change} onChange={(e) => setChange(e.target.value)} rows={3} />
              <button className="mt-2 px-4 py-2 rounded-md border text-sm hover:bg-accent" onClick={() => setApplied(change)}>Apply</button>
            </IntelligenceReport>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PolicySandboxPage;
