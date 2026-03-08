import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Users, ShieldAlert, RefreshCw, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UsageSummary {
  userId: string;
  fullName: string;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  quota: number | null;
}

const AIUsageDashboard = () => {
  const { user } = useAuth();
  const [usageSummaries, setUsageSummaries] = useState<UsageSummary[]>([]);
  const [ownUsage, setOwnUsage] = useState({ totalCost: 0, totalTokens: 0, requestCount: 0 });
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [quotaDialog, setQuotaDialog] = useState<{ open: boolean; studentId: string; studentName: string; currentQuota: number }>({
    open: false, studentId: "", studentName: "", currentQuota: 5
  });
  const [newQuota, setNewQuota] = useState("5.00");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch own usage
      const { data: ownLogs } = await supabase
        .from("ai_usage_logs")
        .select("estimated_cost_usd, total_tokens")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);

      const ownTotal = (ownLogs || []).reduce(
        (acc, l) => ({
          totalCost: acc.totalCost + Number(l.estimated_cost_usd),
          totalTokens: acc.totalTokens + l.total_tokens,
          requestCount: acc.requestCount + 1,
        }),
        { totalCost: 0, totalTokens: 0, requestCount: 0 }
      );
      setOwnUsage(ownTotal);

      // Fetch teacher's classes
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", user.id);
      setClasses(classData || []);

      // Fetch class members
      let memberQuery = supabase
        .from("class_members")
        .select("student_id, class_id");

      if (selectedClass !== "all") {
        memberQuery = memberQuery.eq("class_id", selectedClass);
      } else if (classData && classData.length > 0) {
        memberQuery = memberQuery.in("class_id", classData.map(c => c.id));
      }

      const { data: members } = await memberQuery;
      const studentIds = [...new Set((members || []).map(m => m.student_id))];

      if (studentIds.length === 0) {
        setUsageSummaries([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      // Fetch usage logs for students this month
      const { data: studentLogs } = await supabase
        .from("ai_usage_logs")
        .select("user_id, estimated_cost_usd, total_tokens")
        .in("user_id", studentIds)
        .gte("created_at", startOfMonth);

      // Fetch quotas
      const { data: quotas } = await supabase
        .from("ai_usage_quotas")
        .select("student_id, monthly_limit_usd")
        .eq("teacher_id", user.id)
        .in("student_id", studentIds);

      const quotaMap = new Map((quotas || []).map(q => [q.student_id, Number(q.monthly_limit_usd)]));

      // Aggregate per student
      const usageMap = new Map<string, { totalCost: number; totalTokens: number; requestCount: number }>();
      for (const log of studentLogs || []) {
        const existing = usageMap.get(log.user_id) || { totalCost: 0, totalTokens: 0, requestCount: 0 };
        existing.totalCost += Number(log.estimated_cost_usd);
        existing.totalTokens += log.total_tokens;
        existing.requestCount += 1;
        usageMap.set(log.user_id, existing);
      }

      const summaries: UsageSummary[] = studentIds.map(sid => {
        const usage = usageMap.get(sid) || { totalCost: 0, totalTokens: 0, requestCount: 0 };
        return {
          userId: sid,
          fullName: profileMap.get(sid) || "Unknown Student",
          totalCost: usage.totalCost,
          totalTokens: usage.totalTokens,
          requestCount: usage.requestCount,
          quota: quotaMap.get(sid) ?? null,
        };
      });

      summaries.sort((a, b) => b.totalCost - a.totalCost);
      setUsageSummaries(summaries);
    } catch (err) {
      console.error("Failed to fetch usage data:", err);
      toast.error("Failed to load usage data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, selectedClass]);

  const handleSetQuota = async () => {
    if (!user) return;
    const limit = parseFloat(newQuota);
    if (isNaN(limit) || limit < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const { error } = await supabase.from("ai_usage_quotas").upsert(
        {
          student_id: quotaDialog.studentId,
          teacher_id: user.id,
          monthly_limit_usd: limit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,teacher_id" }
      );

      if (error) throw error;
      toast.success(`Quota set to $${limit.toFixed(2)} for ${quotaDialog.studentName}`);
      setQuotaDialog({ ...quotaDialog, open: false });
      fetchData();
    } catch (err: any) {
      console.error("Failed to set quota:", err);
      toast.error("Failed to set quota: " + err.message);
    }
  };

  const totalStudentSpend = usageSummaries.reduce((s, u) => s + u.totalCost, 0);
  const overQuotaCount = usageSummaries.filter(u => u.quota !== null && u.totalCost >= u.quota).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">AI Usage & Quotas</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your Usage (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">${ownUsage.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">{ownUsage.requestCount} requests • {ownUsage.totalTokens.toLocaleString()} tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Student Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">${totalStudentSpend.toFixed(4)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Across {usageSummaries.length} students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{usageSummaries.filter(u => u.requestCount > 0).length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Used AI this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Over Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${overQuotaCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="text-2xl font-bold text-foreground">{overQuotaCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Students at/above limit</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Student Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Student AI Usage — {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </CardTitle>
          <CardDescription>Per-student usage in USD with quota management</CardDescription>
        </CardHeader>
        <CardContent>
          {usageSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No students found in your classes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost (USD)</TableHead>
                  <TableHead className="text-right">Quota</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageSummaries.map(s => {
                  const isOverQuota = s.quota !== null && s.totalCost >= s.quota;
                  const usagePercent = s.quota ? (s.totalCost / s.quota) * 100 : 0;
                  return (
                    <TableRow key={s.userId}>
                      <TableCell className="font-medium">{s.fullName}</TableCell>
                      <TableCell className="text-right">{s.requestCount}</TableCell>
                      <TableCell className="text-right">{s.totalTokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">${s.totalCost.toFixed(4)}</TableCell>
                      <TableCell className="text-right">
                        {s.quota !== null ? `$${s.quota.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.quota === null ? (
                          <Badge variant="outline">No limit</Badge>
                        ) : isOverQuota ? (
                          <Badge variant="destructive">Over quota</Badge>
                        ) : usagePercent > 75 ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Warning</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQuotaDialog({
                              open: true,
                              studentId: s.userId,
                              studentName: s.fullName,
                              currentQuota: s.quota ?? 5,
                            });
                            setNewQuota((s.quota ?? 5).toFixed(2));
                          }}
                        >
                          <Settings2 className="h-4 w-4 mr-1" />
                          Quota
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quota Dialog */}
      <Dialog open={quotaDialog.open} onOpenChange={(open) => setQuotaDialog({ ...quotaDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Monthly AI Quota</DialogTitle>
            <DialogDescription>
              Set the maximum monthly AI spending limit for <strong>{quotaDialog.studentName}</strong>.
              Once reached, the student will be blocked from using AI until next month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">$</span>
              <Input
                type="number"
                step="0.50"
                min="0"
                value={newQuota}
                onChange={e => setNewQuota(e.target.value)}
                placeholder="5.00"
              />
              <span className="text-sm text-muted-foreground">USD / month</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 5, 10, 20].map(v => (
                <Button key={v} variant="outline" size="sm" onClick={() => setNewQuota(v.toFixed(2))}>
                  ${v}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotaDialog({ ...quotaDialog, open: false })}>Cancel</Button>
            <Button onClick={handleSetQuota}>Save Quota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIUsageDashboard;
