import { supabase } from "@/integrations/supabase/client";

export interface GradingSystem {
  id: string;
  name: string;
  code: string;
  description: string;
  scale_config: any;
  is_default: boolean;
}

export interface GradeBoundary {
  label?: string;
  grade?: number;
  min: number;
  min_pct?: number;
  gpa?: number;
}

/** Fetch all grading systems */
export async function fetchGradingSystems(): Promise<GradingSystem[]> {
  const { data, error } = await supabase
    .from("grading_systems")
    .select("*")
    .order("is_default", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as GradingSystem[];
}

/** Get default grading system */
export async function getDefaultGradingSystem(): Promise<GradingSystem | null> {
  const { data } = await supabase
    .from("grading_systems")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();
  return data as unknown as GradingSystem | null;
}

/** Get grading system for a class */
export async function getClassGradingSystem(classId: string): Promise<GradingSystem | null> {
  const { data: classData } = await supabase
    .from("classes")
    .select("grading_system_id")
    .eq("id", classId)
    .maybeSingle();

  if (classData?.grading_system_id) {
    const { data } = await supabase
      .from("grading_systems")
      .select("*")
      .eq("id", classData.grading_system_id)
      .maybeSingle();
    return data as unknown as GradingSystem | null;
  }

  return getDefaultGradingSystem();
}

/** Convert a percentage to the grading system's label */
export function convertPercentageToGrade(percentage: number, system: GradingSystem): string {
  const config = system.scale_config;

  if (config.type === "percentage") {
    const boundary = config.boundaries?.find((b: GradeBoundary) => percentage >= b.min);
    return boundary?.label || "F";
  }

  if (config.type === "ib") {
    const boundary = config.boundaries?.find((b: GradeBoundary) => percentage >= (b.min_pct ?? 0));
    return boundary ? `${boundary.grade}` : "1";
  }

  if (config.type === "igcse") {
    const boundary = config.boundaries?.find((b: GradeBoundary) => percentage >= b.min);
    return boundary?.label || "U";
  }

  if (config.type === "us_letter") {
    const boundary = config.boundaries?.find((b: GradeBoundary) => percentage >= b.min);
    return boundary?.label || "F";
  }

  return `${Math.round(percentage)}%`;
}

/** Get GPA for a percentage (US Letter only) */
export function getGPA(percentage: number, system: GradingSystem): number | null {
  const config = system.scale_config;
  if (config.type !== "us_letter") return null;
  const boundary = config.boundaries?.find((b: GradeBoundary) => percentage >= b.min);
  return boundary?.gpa ?? 0;
}

/** Calculate overall GPA from percentages (US Letter) */
export function calculateGPA(percentages: number[], system: GradingSystem): number | null {
  if (percentages.length === 0) return null;
  const config = system.scale_config;
  if (config.type !== "us_letter") return null;
  const gpas = percentages.map(p => getGPA(p, system) ?? 0);
  return Math.round((gpas.reduce((a, b) => a + b, 0) / gpas.length) * 100) / 100;
}

/** Get IB final grade from percentage */
export function getIBGrade(percentage: number, system: GradingSystem): number | null {
  const config = system.scale_config;
  if (config.type !== "ib") return null;
  const boundary = config.boundaries?.find((b: GradeBoundary) => percentage >= (b.min_pct ?? 0));
  return boundary?.grade ?? 1;
}

/** Get grade color based on percentage */
export function getGradeColor(percentage: number): string {
  if (percentage >= 90) return "text-emerald-600";
  if (percentage >= 80) return "text-blue-600";
  if (percentage >= 70) return "text-amber-600";
  if (percentage >= 60) return "text-orange-600";
  return "text-destructive";
}

/** Get all boundaries for a grading system (for distribution chart) */
export function getGradeBoundaries(system: GradingSystem): { label: string; min: number }[] {
  const config = system.scale_config;
  if (config.type === "ib") {
    return (config.boundaries || []).map((b: any) => ({ label: `${b.grade}`, min: b.min_pct }));
  }
  return (config.boundaries || []).map((b: any) => ({ label: b.label || `${b.grade}`, min: b.min ?? b.min_pct ?? 0 }));
}
