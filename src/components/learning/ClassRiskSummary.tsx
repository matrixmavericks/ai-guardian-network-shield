import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle, CheckCircle2, Loader, Shield, ShieldAlert,
  Sparkles, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StudentRisk {
  student_id: string;
  name: string;
  risk_level: "low" | "medium" | "high";
  readiness_score: number;
  key_concern: string;
  recommendation: string;
}

interface RiskSummary {
  students: StudentRisk[];
  overall_summary: string;
}

interface ClassRiskSummaryProps {
  pathId: string;
  pathTitle: string;
  pathSubject: string;
  pathDifficulty: string;
  modules: { id: string; title: string; description: string }[];
  studentIds: string[];
}

const riskConfig = {
  low: { label: "Low Risk", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2, badgeVariant: "secondary" as const },
  medium: { label: "Medium Risk", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertTriangle, badgeVariant: "default" as const },
  high: { label: "High Risk", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert, badgeVariant: "destructive" as const },
};

const ClassRiskSummary = ({ pathId, pathTitle, pathSubject, pathDifficulty, modules, studentIds }: ClassRiskSummaryProps) => {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-class-risks", {
        body: { pathId, pathTitle, pathSubject, pathDifficulty, modules, studentIds },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err?.message || "Could not generate risk summary.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!summary && !isLoading && !error) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="rounded-full bg-primary/10 p-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Class Risk Overview</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Get an AI-powered analysis of all {studentIds.length} students' readiness for this learning path. Quickly identify who needs extra support.
            </p>
          </div>
          <Button onClick={loadSummary} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Analyze Class Readiness
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-12">
          <Loader className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Analyzing {studentIds.length} students...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadSummary}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const highRisk = summary.students.filter(s => s.risk_level === "high");
  const mediumRisk = summary.students.filter(s => s.risk_level === "medium");
  const lowRisk = summary.students.filter(s => s.risk_level === "low");
  const sorted = [...highRisk, ...mediumRisk, ...lowRisk];

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="mb-1 text-sm font-semibold">Class Overview</p>
            <p className="text-sm text-muted-foreground">{summary.overall_summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { level: "high" as const, count: highRisk.length, label: "High Risk" },
          { level: "medium" as const, count: mediumRisk.length, label: "Medium Risk" },
          { level: "low" as const, count: lowRisk.length, label: "Low Risk" },
        ].map(({ level, count, label }) => {
          const config = riskConfig[level];
          const Icon = config.icon;
          return (
            <Card key={level} className={`border ${config.color}`}>
              <CardContent className="flex items-center gap-3 py-4">
                <Icon className="h-6 w-6" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Student Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Student Risk Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead className="hidden md:table-cell">Key Concern</TableHead>
                <TableHead className="hidden lg:table-cell">Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((student) => {
                const config = riskConfig[student.risk_level];
                return (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>
                      <Badge variant={config.badgeVariant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={student.readiness_score} className="h-2 w-16" />
                        <span className="text-xs text-muted-foreground">{student.readiness_score}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate text-sm text-muted-foreground md:table-cell">
                      {student.key_concern}
                    </TableCell>
                    <TableCell className="hidden max-w-[250px] text-sm text-muted-foreground lg:table-cell">
                      {student.recommendation}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile details for concerns/recommendations */}
      <div className="space-y-3 md:hidden">
        {sorted.map((student) => {
          const config = riskConfig[student.risk_level];
          const Icon = config.icon;
          return (
            <Card key={student.student_id}>
              <CardContent className="py-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{student.name}</span>
                  <Badge variant={config.badgeVariant}>{config.label}</Badge>
                </div>
                <p className="mb-1 text-sm text-muted-foreground"><strong>Concern:</strong> {student.key_concern}</p>
                <p className="text-sm text-muted-foreground"><strong>Action:</strong> {student.recommendation}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={loadSummary} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
};

export default ClassRiskSummary;
