import React from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";
import IntelligenceReport from "@/components/intelligence/IntelligenceReport";
import { CalendarClock } from "lucide-react";

const CurriculumConflictPage = () => (
  <div className="min-h-screen flex bg-background">
    <DashboardSidebar />
    <div className="flex-1 flex flex-col">
      <DashboardNav />
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <IntelligenceReport
            feature="curriculum_conflict"
            title="Curriculum Conflict Detector"
            description="Refyn scans upcoming assignments across classes and flags overlaps, gaps, and overloaded weeks before they hit your students."
            icon={<CalendarClock className="h-6 w-6 text-primary" />}
            ctaLabel="Scan the calendar"
          />
        </div>
      </main>
    </div>
  </div>
);

export default CurriculumConflictPage;
