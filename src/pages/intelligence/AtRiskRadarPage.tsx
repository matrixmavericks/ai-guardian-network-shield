import React from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Radar } from "lucide-react";

const AtRiskRadarPage = () => (
  <div className="min-h-screen flex bg-background">
    <DashboardSidebar />
    <div className="flex-1 flex flex-col">
      <DashboardNav />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <IntelligenceReport
            feature="at_risk_radar"
            title="At-Risk Radar"
            description="Spot students at risk of failing or disengaging up to 6 weeks before grades drop, using AI usage + performance signals."
            icon={<Radar className="h-6 w-6 text-primary" />}
            ctaLabel="Scan the cohort"
          />
        </div>
      </main>
    </div>
  </div>
);

export default AtRiskRadarPage;
