import React from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { Users } from "lucide-react";

const PeerComparePage = () => (
  <div className="min-h-screen flex bg-background">
    <DashboardSidebar />
    <div className="flex-1 flex flex-col">
      <DashboardNav />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <IntelligenceReport
            feature="peer_compare"
            title="Peer Benchmark — Anonymous"
            description="See where you shine and where to push, compared to peers on the same assignments. No names. No leaderboards."
            icon={<Users className="h-6 w-6 text-primary" />}
            ctaLabel="Show my benchmark"
          />
        </div>
      </main>
    </div>
  </div>
);

export default PeerComparePage;
