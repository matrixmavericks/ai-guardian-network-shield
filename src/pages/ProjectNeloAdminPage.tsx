import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Pencil, X } from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';

const MASTER_ADMIN_EMAIL = 'info.aiconditioner@gmail.com';

type Applicant = {
  id: string;
  applicant_name: string;
  normalized_name: string;
  status: 'accepted' | 'rejected';
  letter_title: string | null;
  letter_body: string;
  created_at: string;
  updated_at: string;
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const defaultAcceptance = (name: string) =>
  `Dear ${name},\n\nCongratulations! After careful review of your application, it is our great pleasure to offer you a place in Project Nelo.\n\nYou stood out among an extraordinary pool of applicants, and we believe you will thrive within this program. We look forward to building something remarkable with you.\n\nWelcome aboard.\n\nWarm regards,\nThe Project Nelo Committee`;

const defaultRejection = (name: string) =>
  `Dear ${name},\n\nThank you for applying to Project Nelo. After thoughtful review, we are unable to offer you a place in this cohort.\n\nThis decision is in no way a reflection of your potential. The applicant pool was exceptional, and the number of seats was limited. We encourage you to keep building, keep learning, and to apply to future cohorts.\n\nWith respect,\nThe Project Nelo Committee`;

export default function ProjectNeloAdminPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'accepted' | 'rejected'>('accepted');
  const [letterTitle, setLetterTitle] = useState('Project Nelo — Admissions Decision');
  const [letterBody, setLetterBody] = useState('');

  const isMaster = user?.email === MASTER_ADMIN_EMAIL && user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_nelo_applicants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isMaster) load(); }, [isMaster]);

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isMaster) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setStatus('accepted');
    setLetterTitle('Project Nelo — Admissions Decision');
    setLetterBody('');
  };

  const startEdit = (a: Applicant) => {
    setEditingId(a.id);
    setName(a.applicant_name);
    setStatus(a.status);
    setLetterTitle(a.letter_title || 'Project Nelo — Admissions Decision');
    setLetterBody(a.letter_body);
  };

  const fillDefault = () => {
    setLetterBody(status === 'accepted' ? defaultAcceptance(name || 'Applicant') : defaultRejection(name || 'Applicant'));
  };

  const save = async () => {
    if (!name.trim() || !letterBody.trim()) {
      toast({ title: 'Name and letter required', variant: 'destructive' });
      return;
    }
    const payload = {
      applicant_name: name.trim(),
      normalized_name: normalize(name),
      status,
      letter_title: letterTitle.trim() || null,
      letter_body: letterBody,
      created_by: user.id,
    };
    const { error } = editingId
      ? await supabase.from('project_nelo_applicants').update(payload).eq('id', editingId)
      : await supabase.from('project_nelo_applicants').insert(payload);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? 'Updated' : 'Verdict saved' });
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this verdict?')) return;
    const { error } = await supabase.from('project_nelo_applicants').delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else load();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 p-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Project Nelo — Admissions Console</h1>
          <p className="text-slate-600 mt-1">
            Secret applicant verdicts. Public lookup page: <code className="bg-slate-200 px-2 py-0.5 rounded">/project-nelo</code>
          </p>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{editingId ? 'Edit verdict' : 'New verdict'}</h2>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4 mr-1" />Cancel edit</Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Applicant full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <Label>Verdict</Label>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant={status === 'accepted' ? 'default' : 'outline'} onClick={() => setStatus('accepted')}>Accepted</Button>
                <Button type="button" variant={status === 'rejected' ? 'default' : 'outline'} onClick={() => setStatus('rejected')}>Rejected</Button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <Label>Letter title</Label>
            <Input value={letterTitle} onChange={(e) => setLetterTitle(e.target.value)} />
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center">
              <Label>Letter body</Label>
              <Button type="button" variant="ghost" size="sm" onClick={fillDefault}>Use default template</Button>
            </div>
            <Textarea value={letterBody} onChange={(e) => setLetterBody(e.target.value)} rows={10} placeholder="Write the custom acceptance or rejection letter..." />
          </div>

          <Button onClick={save}>{editingId ? 'Update verdict' : 'Save verdict'}</Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">All verdicts ({items.length})</h2>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-slate-500">No verdicts yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((a) => (
                <div key={a.id} className="flex items-start justify-between border rounded-lg p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.applicant_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2 whitespace-pre-wrap">{a.letter_body}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
