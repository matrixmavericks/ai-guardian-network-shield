import React from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import AIUsageDashboard from "@/components/AIUsageDashboard";

const AIUsagePage = () => {
  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <AIUsageDashboard />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AIUsagePage;
