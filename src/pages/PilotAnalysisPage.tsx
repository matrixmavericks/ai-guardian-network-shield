import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, IndianRupee, Activity, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { STUDENT_PLANS, TEACHER_PLANS, ADMIN_PLANS, calcAdminMonthlyCost } from "@/lib/planConfigs";

const WEBSITE_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

function payable(plan: string | null, seats: any): number {
  if (!plan) return 0;
  const parts = plan.split("_");
  const cycle = parts[parts.length - 1];
  const id = parts.slice(0, -1).join("_");
  if (STUDENT_PLANS[id]) return cycle === "yearly" ? STUDENT_PLANS[id].yearlyPrice / 12 : STUDENT_PLANS[id].monthlyPrice;
  if (TEACHER_PLANS[id]) return cycle === "yearly" ? TEACHER_PLANS[id].yearlyPrice / 12 : TEACHER_PLANS[id].monthlyPrice;
  if (ADMIN_PLANS[id] && seats) return calcAdminMonthlyCost(id, seats.teachers, seats.students, cycle === "yearly").total;
  return 0;
}

const PilotAnalysisPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.email === WEBSITE_ADMIN_EMAIL;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSignups: 0,
    paidSignups: 0,
    pendingSignups: 0,
    rejectedSignups: 0,
    mrr: 0,
    arr: 0,
    last7dSignups: 0,
    last30dSignups: 0,
    aiPromptsTotal: 0,
    aiCostTotal: 0,
    aiPromptsLast7d: 0,
    flaggedPromptsLast30d: 0,
    activeUsersLast7d: 0,
    schools: 0,
    classes: 0,
    students: 0,
    teachers: 0,
  });
  const [byRole, setByRole] = useState<Record<string, number>>({});
  const [byPlan, setByPlan] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAdmin) return;
    void loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    setLoading(true);
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();

    const [reqs, usage, schools, classes, profiles, roles] = await Promise.all([
      supabase.from("registration_requests").select("*"),
      supabase.from("ai_usage_logs").select("estimated_cost_usd, created_at, user_id, severity:id"),
      supabase.from("schools").select("id"),
      supabase.from("classes").select("id"),
      supabase.from("profiles").select("user_id, created_at"),
      supabase.from("user_roles").select("role"),
    ]);

    const requests = reqs.data ?? [];
    const usageRows = (usage.data ?? []) as any[];

    let mrr = 0;
    const planCount: Record<string, number> = {};
    const roleCount: Record<string, number> = {};
    requests.forEach((r: any) => {
      roleCount[r.requested_role] = (roleCount[r.requested_role] ?? 0) + 1;
      if (r.status === "approved" || r.payment_status === "paid" || r.payment_status === "comped") {
        mrr += payable(r.payment_plan, r.seat_config);
        if (r.payment_plan) planCount[r.payment_plan] = (planCount[r.payment_plan] ?? 0) + 1;
      }
    });

    const aiCost = usageRows.reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0);
    const aiLast7 = usageRows.filter(r => r.created_at >= d7).length;
    const activeUsers7d = new Set(usageRows.filter(r => r.created_at >= d7).map(r => r.user_id)).size;

    // flagged prompts (severity high) — query separately
    const { count: flaggedCount } = await supabase
      .from("prompt_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", d30)
      .in("severity", ["high", "critical"]);

    const teachersCount = (roles.data ?? []).filter((r: any) => r.role === "teacher").length;
    const studentsCount = (roles.data ?? []).filter((r: any) => r.role === "student").length;

    setStats({
      totalSignups: requests.length,
      paidSignups: requests.filter((r: any) => r.payment_status === "paid").length,
      pendingSignups: requests.filter((r: any) => r.status === "pending").length,
      rejectedSignups: requests.filter((r: any) => r.status === "rejected").length,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      last7dSignups: requests.filter((r: any) => r.created_at >= d7).length,
      last30dSignups: requests.filter((r: any) => r.created_at >= d30).length,
      aiPromptsTotal: usageRows.length,
      aiCostTotal: aiCost,
      aiPromptsLast7d: aiLast7,
      flaggedPromptsLast30d: flaggedCount ?? 0,
      activeUsersLast7d: activeUsers7d,
      schools: (schools.data ?? []).length,
      classes: (classes.data ?? []).length,
      students: studentsCount,
      teachers: teachersCount,
    });
    setByRole(roleCount);
    setByPlan(planCount);
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Pilot Analysis is for the master administrator.</p>
      </div>
    );
  }

  const conversionRate = stats.totalSignups > 0
    ? ((stats.paidSignups / stats.totalSignups) * 100).toFixed(1)
    : "0";

  const Stat = ({ icon: Icon, label, value, sub, tone = "default" }: any) => (
    <Card className={
      tone === "good" ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
      : tone === "warn" ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
      : tone === "bad" ? "bg-gradient-to-br from-red-50 to-rose-50 border-red-200"
      : ""
    }>
      <CardContent className="py-4 px-5">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" /> {label}
        </p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> Pilot Analysis
            </h1>
            <p className="text-muted-foreground">Live snapshot of signups, revenue, AI usage, and pilot health.</p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading metrics…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat icon={IndianRupee} label="Est. MRR" value={`₹${stats.mrr.toLocaleString("en-IN")}`} sub={`ARR ₹${stats.arr.toLocaleString("en-IN")}`} tone="good" />
                <Stat icon={Users} label="Total signups" value={stats.totalSignups} sub={`${stats.last7dSignups} in last 7d`} />
                <Stat icon={CheckCircle2} label="Paid conversion" value={`${conversionRate}%`} sub={`${stats.paidSignups} paid`} tone="good" />
                <Stat icon={TrendingUp} label="Active users (7d)" value={stats.activeUsersLast7d} sub="users with AI activity" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat icon={Zap} label="AI prompts (total)" value={stats.aiPromptsTotal.toLocaleString()} sub={`${stats.aiPromptsLast7d} in 7d`} />
                <Stat icon={IndianRupee} label="AI cost (total)" value={`$${stats.aiCostTotal.toFixed(2)}`} sub="USD spend on tokens" />
                <Stat icon={AlertTriangle} label="Flagged prompts (30d)" value={stats.flaggedPromptsLast30d} sub="high/critical severity" tone={stats.flaggedPromptsLast30d > 0 ? "warn" : "default"} />
                <Stat icon={Users} label="Schools / Classes" value={`${stats.schools} / ${stats.classes}`} sub={`${stats.teachers} teachers · ${stats.students} students`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Signups by role</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(byRole).length === 0 && <p className="text-sm text-muted-foreground">No signups yet.</p>}
                    {Object.entries(byRole).map(([role, n]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span className="capitalize text-sm">{role}</span>
                        <Badge variant="outline">{n}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Active subscriptions by plan</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(byPlan).length === 0 && <p className="text-sm text-muted-foreground">No paid subscriptions yet.</p>}
                    {Object.entries(byPlan).map(([plan, n]) => (
                      <div key={plan} className="flex items-center justify-between">
                        <span className="text-sm">{plan}</span>
                        <Badge variant="outline">{n}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Pilot health checklist</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    { ok: stats.last7dSignups > 0, msg: "Signups in last 7 days" },
                    { ok: stats.activeUsersLast7d >= 5, msg: "≥5 weekly active AI users (engagement signal)" },
                    { ok: stats.flaggedPromptsLast30d < stats.aiPromptsTotal * 0.05, msg: "Flagged-prompt rate under 5%" },
                    { ok: Number(conversionRate) >= 10, msg: "Paid conversion ≥10%" },
                    { ok: stats.schools > 0, msg: "At least one pilot school onboarded" },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {c.ok
                        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                        : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                      <span className={c.ok ? "" : "text-muted-foreground"}>{c.msg}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PilotAnalysisPage;
