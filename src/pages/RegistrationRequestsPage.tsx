import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Search, CreditCard, Users } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { ALL_PLAN_LABELS } from "@/lib/planConfigs";

interface RegistrationRequest {
  id: string;
  full_name: string;
  email: string;
  requested_role: string;
  status: string;
  rejection_reason: string | null;
  payment_plan: string | null;
  seat_config: { teachers: number; students: number } | null;
  created_at: string;
}

const PLAN_LABELS = ALL_PLAN_LABELS;

const WEBSITE_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

const RegistrationRequestsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; request: RegistrationRequest | null }>({ open: false, request: null });
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [planDialog, setPlanDialog] = useState<{ open: boolean; request: RegistrationRequest | null }>({ open: false, request: null });
  const [assignPlan, setAssignPlan] = useState("starter");
  const [assignBilling, setAssignBilling] = useState("monthly");

  const isWebsiteAdmin = user?.email === WEBSITE_ADMIN_EMAIL;

  useEffect(() => {
    if (!isWebsiteAdmin) return;
    fetchRequests();
  }, [filter, isWebsiteAdmin]);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('registration_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: "Failed to load requests.", variant: "destructive" });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (req: RegistrationRequest) => {
    // If student and has a plan, approve directly; otherwise show plan dialog
    if (req.requested_role === 'student') {
      if (req.payment_plan) {
        await doApprove(req, req.payment_plan);
      } else {
        // Open plan assignment dialog
        setPlanDialog({ open: true, request: req });
      }
    } else {
      await doApprove(req, null);
    }
  };

  const doApprove = async (req: RegistrationRequest, planStr: string | null) => {
    setProcessing(req.id);
    const { error } = await supabase
      .from('registration_requests')
      .update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        payment_plan: planStr || req.payment_plan,
      } as any)
      .eq('id', req.id);

    if (error) {
      toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" });
    } else {
      toast({ title: "Approved", description: `${req.full_name}'s request has been approved.` });
      fetchRequests();
    }
    setProcessing(null);
  };

  const handleAssignAndApprove = async () => {
    if (!planDialog.request) return;
    const planStr = `${assignPlan}_${assignBilling}`;
    await supabase
      .from('registration_requests')
      .update({ payment_plan: planStr } as any)
      .eq('id', planDialog.request.id);

    await doApprove(planDialog.request, planStr);
    setPlanDialog({ open: false, request: null });
  };

  const handleReject = async () => {
    if (!rejectDialog.request) return;
    setProcessing(rejectDialog.request.id);
    const { error } = await supabase
      .from('registration_requests')
      .update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason || null,
      } as any)
      .eq('id', rejectDialog.request.id);

    if (error) {
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    } else {
      toast({ title: "Rejected", description: `${rejectDialog.request.full_name}'s request has been rejected.` });
      fetchRequests();
    }
    setRejectDialog({ open: false, request: null });
    setRejectionReason("");
    setProcessing(null);
  };

  if (!isWebsiteAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Only the website administrator can manage registration requests.</p>
      </div>
    );
  }

  const filteredRequests = requests.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      student: "bg-blue-50 text-blue-700 border-blue-200",
      teacher: "bg-purple-50 text-purple-700 border-purple-200",
      admin: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return <Badge variant="outline" className={colors[role] || ""}>{role === 'admin' ? 'School Admin' : role}</Badge>;
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Registration Requests</h1>
              <p className="text-muted-foreground">Approve or reject user registration requests</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'pending' && requests.length > 0 && filter === 'pending' && (
                    <span className="ml-1 bg-primary-foreground text-primary rounded-full px-1.5 text-xs">{requests.length}</span>
                  )}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." className="pl-8 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No {filter !== 'all' ? filter : ''} registration requests found.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRequests.map(req => (
                <Card key={req.id}>
                  <CardContent className="flex items-center justify-between py-4 px-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{req.full_name}</span>
                        {roleBadge(req.requested_role)}
                        {statusBadge(req.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{req.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString()}
                      </p>
                      {req.payment_plan && (
                        <p className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          Plan: {PLAN_LABELS[req.payment_plan] || req.payment_plan}
                        </p>
                      )}
                      {req.rejection_reason && (
                        <p className="text-xs text-red-600">Reason: {req.rejection_reason}</p>
                      )}
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleApprove(req)} disabled={processing === req.id}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectDialog({ open: true, request: req })} disabled={processing === req.id}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) { setRejectDialog({ open: false, request: null }); setRejectionReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration Request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting request from <strong>{rejectDialog.request?.full_name}</strong> ({rejectDialog.request?.email})
          </p>
          <Textarea
            placeholder="Optional: Provide a reason for rejection..."
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, request: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing !== null}>Reject Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Assignment Dialog (for students without a plan) */}
      <Dialog open={planDialog.open} onOpenChange={(open) => { if (!open) setPlanDialog({ open: false, request: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Plan & Approve</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Assign a plan to <strong>{planDialog.request?.full_name}</strong> before approving.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={assignPlan} onValueChange={setAssignPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter (₹150/mo – 500 tokens)</SelectItem>
                  <SelectItem value="standard">Standard (₹200/mo – 2,000 tokens)</SelectItem>
                  <SelectItem value="premium">Premium (₹300/mo – 5,000 tokens)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select value={assignBilling} onValueChange={setAssignBilling}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly (Save 25%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false, request: null })}>Cancel</Button>
            <Button onClick={handleAssignAndApprove}>Assign & Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationRequestsPage;
