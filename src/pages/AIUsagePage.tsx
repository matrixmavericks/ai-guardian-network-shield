import React from "react";
import { StudyShell } from "@/components/subjects/kit";
import { PageHeader } from "@/components/teacher/parts";
import AIUsageDashboard from "@/components/AIUsageDashboard";

const AIUsagePage = () => (
  <StudyShell wide>
    <PageHeader eyebrow="AI & insights" title="AI usage" body="How much Refyn is being used, by whom and on which models." />
    <AIUsageDashboard />
  </StudyShell>
);

export default AIUsagePage;
