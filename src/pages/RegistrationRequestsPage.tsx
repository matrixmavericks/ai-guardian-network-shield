import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Search } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";

interface RegistrationRequest {
  id: string;
  full_name: string;
  email: string;
  requested_role: string;
  status: string;
  rejection_reason: string | null;
  payment_plan: string | null;
  created_at: string;
}

const PLAN_LABELS: Record<string, string> = {
  starter_monthly: "Starter – ₹150/mo",
  starter_yearly: "Starter – ₹1,350/yr",
  standard_monthly: "Standard – ₹200/mo",
  standard_yearly: "Standard – ₹1,800/yr",
  premium_monthly: "Premium – ₹300/mo",
  premium_yearly: "Premium – ₹2,700/yr",
};

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
    setProcessing(req.id);
    const { error } = await supabase
      .from('registration_requests')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any)
      .eq('id', req.id);

    if (error) {
      toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" });
    } else {
      toast({ title: "Approved", description: `${req.full_name}'s request has been approved.` });
      fetchRequests();
    }
    setProcessing(null);
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
                        <p className="text-xs font-medium text-indigo-600">
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
    </div>
  );
};

export default RegistrationRequestsPage;
