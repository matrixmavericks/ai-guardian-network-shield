import React from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { DollarSign } from "lucide-react";

const BudgetOptimizerPage = () => (
  <div className="min-h-screen flex bg-background">
    <DashboardSidebar />
    <div className="flex-1 flex flex-col">
      <DashboardNav />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <IntelligenceReport
            feature="budget_optimizer"
            title="AI Budget Optimizer"
            description="Refyn analyzes spend across models and recommends safe routing changes to cut cost 30–60% without losing quality."
            icon={<DollarSign className="h-6 w-6 text-primary" />}
            ctaLabel="Find savings"
          />
        </div>
      </main>
    </div>
  </div>
);

export default BudgetOptimizerPage;
