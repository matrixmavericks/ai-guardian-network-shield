import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Sparkles, Loader2 } from "lucide-react";
import { STUDENT_PLANS, TEACHER_PLANS } from "@/lib/planConfigs";

const WEBSITE_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

const CreateUserAccountPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.email === WEBSITE_ADMIN_EMAIL;

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "student" as "student" | "teacher" | "parent" | "admin",
    planId: "starter",
    billingCycle: "monthly" as "monthly" | "yearly",
    monthlyTokenLimit: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Only the master admin can create comp accounts.</p>
      </div>
    );
  }

  const planOptions =
    form.role === "teacher"
      ? Object.values(TEACHER_PLANS)
      : Object.values(STUDENT_PLANS);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.fullName) {
      toast({ title: "Missing fields", description: "Name, email and password are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-comp-account", {
        body: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          planId: form.planId,
          billingCycle: form.billingCycle,
          monthlyTokenLimit: form.monthlyTokenLimit ? Number(form.monthlyTokenLimit) : undefined,
          notes: form.notes || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Account created", description: `${form.fullName} can now sign in.` });
      setForm({ ...form, fullName: "", email: "", password: "", notes: "" });
    } catch (e: any) {
      toast({ title: "Failed to create account", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-primary" /> Create Account
              <Badge variant="outline" className="ml-2"><Sparkles className="h-3 w-3 mr-1" />Comp / Manual</Badge>
            </h1>
            <p className="text-muted-foreground">
              Provision a fully-active account with any plan and billing cycle. No payment required — useful for pilots, partners, and internal staff.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">New account details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Full name</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Temporary password</Label>
                    <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 6 characters" required />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v, planId: v === "teacher" ? "teacher_individual" : "starter" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Plan</Label>
                    <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {planOptions.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (₹{p.monthlyPrice}/mo)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Billing cycle</Label>
                    <Select value={form.billingCycle} onValueChange={(v: any) => setForm({ ...form, billingCycle: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Token limit / mo (optional)</Label>
                    <Input type="number" placeholder="Use plan default" value={form.monthlyTokenLimit} onChange={(e) => setForm({ ...form, monthlyTokenLimit: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label>Notes (internal)</Label>
                  <Textarea rows={2} placeholder="e.g. Pilot school – Greenfield Academy, comped through Q3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Create account
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardContent className="py-4 text-sm text-muted-foreground space-y-1">
              <p>• The user is created instantly and email-verified — they can sign in with the password you set.</p>
              <p>• A registration record is added with status <code>approved</code> and payment_status <code>comped</code> for audit.</p>
              <p>• School-attached comp accounts should still go through <strong>School Management</strong> so seat limits stay accurate.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateUserAccountPage;
