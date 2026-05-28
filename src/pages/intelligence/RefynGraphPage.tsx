import React from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Network } from "lucide-react";

const RefynGraphPage = () => (
  <div className="min-h-screen flex bg-background">
    <DashboardSidebar />
    <div className="flex-1 flex flex-col">
      <DashboardNav />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <IntelligenceReport
            feature="refyn_graph"
            title="Refyn Graph"
            description="The living knowledge graph of your school: students, teachers, resources, chats, outcomes — and where they connect."
            icon={<Network className="h-6 w-6 text-primary" />}
            ctaLabel="Render the graph"
          />
        </div>
      </main>
    </div>
  </div>
);

export default RefynGraphPage;
