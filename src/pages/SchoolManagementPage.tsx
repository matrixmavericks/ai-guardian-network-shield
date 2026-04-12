import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardNav from '@/components/DashboardNav';
import { useToast } from '@/components/ui/use-toast';
import {
  School, Plus, Settings2, Users, Brain, Trash2, UserPlus,
  Shield, BookOpen, RefreshCw, Building2, Globe, Mail, MapPin
} from 'lucide-react';

const AI_MODELS = [
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-flash-preview',
  'google/gemini-3.1-pro-preview',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5.2',
];

interface SchoolData {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  domain: string | null;
  contact_email: string | null;
  address: string | null;
  created_at: string;
  memberCount?: number;
  classCount?: number;
}

interface SchoolAISettings {
  id?: string;
  school_id: string;
  allowed_ai_models: string[];
  max_daily_prompts_per_student: number;
  max_monthly_cost_usd: number;
  blocked_keywords: string[];
  process_mode_enabled: boolean;
  allow_student_chat: boolean;
  allow_capstone_ai_grading: boolean;
  allow_learning_path_generation: boolean;
  custom_system_prompt: string;
  grade_level_restrictions: string[];
  subject_restrictions: string[];
}

export default function SchoolManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    setLoading(true);
    const { data: schoolsData } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
    const { data: members } = await supabase.from('school_members').select('school_id');
    const { data: classes } = await supabase.from('classes').select('school_id');

    const enriched = (schoolsData || []).map((s: any) => ({
      ...s,
      memberCount: (members || []).filter((m: any) => m.school_id === s.id).length,
      classCount: (classes || []).filter((c: any) => c.school_id === s.id).length,
    }));
    setSchools(enriched);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  School Ecosystem Management
                </h1>
                <p className="text-muted-foreground mt-1">Create and manage separate school environments with independent AI settings</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchSchools} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="h-4 w-4" /> Create School</Button>
                  </DialogTrigger>
                  <CreateSchoolDialog userId={user?.id || ''} onCreated={() => { fetchSchools(); setShowCreateDialog(false); }} />
                </Dialog>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : schools.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Schools Created Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first school ecosystem to organize users, classes, and AI settings.</p>
                  <Button onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-2" /> Create School</Button>
                </CardContent>
              </Card>
            ) : selectedSchool ? (
              <SchoolDetail school={selectedSchool} onBack={() => { setSelectedSchool(null); fetchSchools(); }} userId={user?.id || ''} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schools.map(school => (
                  <Card key={school.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedSchool(school)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{school.name}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">{school.description || 'No description'}</CardDescription>
                        </div>
                        <School className="h-6 w-6 text-blue-500 shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {school.memberCount} members</span>
                        <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {school.classCount} classes</span>
                      </div>
                      {school.domain && <Badge variant="outline" className="mt-3"><Globe className="h-3 w-3 mr-1" />{school.domain}</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ============ CREATE SCHOOL DIALOG ============

function CreateSchoolDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', description: '', domain: '', contact_email: '', address: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('schools').insert({
      name: form.name, description: form.description, domain: form.domain || null,
      contact_email: form.contact_email || null, address: form.address || null, created_by: userId,
    } as any).select().single();

    if (error) {
      toast({ title: 'Error creating school', description: error.message, variant: 'destructive' });
    } else if (data) {
      // Create default AI settings
      await supabase.from('school_ai_settings').insert({ school_id: (data as any).id } as any);
      // Add creator as admin of the school
      await supabase.from('school_members').insert({ school_id: (data as any).id, user_id: userId, school_role: 'admin' } as any);
      toast({ title: 'School created', description: `${form.name} is ready.` });
      onCreated();
    }
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Create New School</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>School Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Lincoln High School" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the school" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Domain</Label><Input value={form.domain} onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} placeholder="school.edu" /></div>
          <div><Label>Contact Email</Label><Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="admin@school.edu" /></div>
        </div>
        <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City" /></div>
      </div>
      <DialogFooter>
        <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>{saving ? 'Creating...' : 'Create School'}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============ SCHOOL DETAIL VIEW ============

function SchoolDetail({ school, onBack, userId }: { school: SchoolData; onBack: () => void; userId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [aiSettings, setAiSettings] = useState<SchoolAISettings | null>(null);
  const [seatLimits, setSeatLimits] = useState<any>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');
  const [newKeyword, setNewKeyword] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [assignClassId, setAssignClassId] = useState('');
  const [unassignedClasses, setUnassignedClasses] = useState<any[]>([]);
  const [trainingData, setTrainingData] = useState<any[]>([]);

  useEffect(() => { fetchDetail(); }, [school.id]);

  const fetchDetail = async () => {
    setLoading(true);
    const [{ data: mems }, { data: cls }, { data: settings }, { data: profiles }, { data: allCls }, { data: tData }, { data: seats }] = await Promise.all([
      supabase.from('school_members').select('*').eq('school_id', school.id),
      supabase.from('classes').select('*').eq('school_id', school.id),
      supabase.from('school_ai_settings').select('*').eq('school_id', school.id).maybeSingle(),
      supabase.from('profiles').select('user_id, full_name, email'),
      supabase.from('classes').select('*'),
      supabase.from('model_training_data').select('*').order('created_at', { ascending: false }),
      supabase.from('school_seat_limits').select('*').eq('school_id', school.id).maybeSingle(),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setMembers((mems || []).map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) })));
    setClasses(cls || []);
    setAllProfiles(profiles || []);
    setUnassignedClasses((allCls || []).filter((c: any) => !c.school_id));
    setTrainingData(tData || []);
    setSeatLimits(seats || null);

    if (settings) {
      setAiSettings(settings as any);
    } else {
      const { data: newSettings } = await supabase.from('school_ai_settings').insert({ school_id: school.id } as any).select().single();
      setAiSettings(newSettings as any);
    }
    setLoading(false);
  };

  const addMember = async () => {
    const profile = allProfiles.find((p: any) => p.email === addMemberEmail);
    if (!profile) {
      toast({ title: 'User not found', description: 'No user with that email exists.', variant: 'destructive' });
      return;
    }

    // Enforce seat limits
    if (seatLimits) {
      const isTeacherAdd = addMemberRole === 'teacher' || addMemberRole === 'admin';
      const currentTeachers = members.filter(m => m.school_role === 'teacher' || m.school_role === 'admin').length;
      const currentStudents = members.filter(m => m.school_role === 'member').length;

      if (isTeacherAdd && currentTeachers >= seatLimits.teacher_seats) {
        toast({ title: 'Teacher seat limit reached', description: `Your plan allows ${seatLimits.teacher_seats} teacher seats. Upgrade to add more.`, variant: 'destructive' });
        return;
      }
      if (!isTeacherAdd && currentStudents >= seatLimits.student_seats) {
        toast({ title: 'Student seat limit reached', description: `Your plan allows ${seatLimits.student_seats} student seats. Upgrade to add more.`, variant: 'destructive' });
        return;
      }
    }

    const { error } = await supabase.from('school_members').insert({
      school_id: school.id, user_id: profile.user_id, school_role: addMemberRole,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update seat usage
      if (seatLimits) {
        const isTeacher = addMemberRole === 'teacher' || addMemberRole === 'admin';
        const updateData = isTeacher
          ? { teachers_used: (seatLimits.teachers_used || 0) + 1 }
          : { students_used: (seatLimits.students_used || 0) + 1 };
        await supabase.from('school_seat_limits').update(updateData as any).eq('school_id', school.id);
      }
      toast({ title: 'Member added' });
      setAddMemberEmail('');
      fetchDetail();
    }
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('school_members').delete().eq('id', memberId);
    toast({ title: 'Member removed' });
    fetchDetail();
  };

  const assignClass = async () => {
    if (!assignClassId) return;
    await supabase.from('classes').update({ school_id: school.id } as any).eq('id', assignClassId);
    toast({ title: 'Class assigned to school' });
    setAssignClassId('');
    fetchDetail();
  };

  const unassignClass = async (classId: string) => {
    await supabase.from('classes').update({ school_id: null } as any).eq('id', classId);
    toast({ title: 'Class unassigned' });
    fetchDetail();
  };

  const updateAISettings = async (updates: Partial<SchoolAISettings>) => {
    if (!aiSettings?.id) return;
    const { error } = await supabase.from('school_ai_settings').update(updates as any).eq('id', aiSettings.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setAiSettings(prev => prev ? { ...prev, ...updates } : prev);
      toast({ title: 'Settings updated' });
    }
  };

  const addBlockedKeyword = () => {
    if (!newKeyword.trim() || !aiSettings) return;
    const updated = [...(aiSettings.blocked_keywords || []), newKeyword.trim()];
    updateAISettings({ blocked_keywords: updated });
    setNewKeyword('');
  };

  const removeBlockedKeyword = (kw: string) => {
    if (!aiSettings) return;
    updateAISettings({ blocked_keywords: aiSettings.blocked_keywords.filter(k => k !== kw) });
  };

  const addSubjectRestriction = () => {
    if (!newSubject.trim() || !aiSettings) return;
    const updated = [...(aiSettings.subject_restrictions || []), newSubject.trim().toLowerCase()];
    updateAISettings({ subject_restrictions: updated });
    setNewSubject('');
  };

  const removeSubjectRestriction = (subj: string) => {
    if (!aiSettings) return;
    updateAISettings({ subject_restrictions: aiSettings.subject_restrictions.filter(s => s !== subj) });
  };

  const toggleTrainingData = (tdId: string) => {
    if (!aiSettings) return;
    const current = (aiSettings as any).custom_model_training_data_ids || [];
    const updated = current.includes(tdId) ? current.filter((id: string) => id !== tdId) : [...current, tdId];
    updateAISettings({ custom_model_training_data_ids: updated } as any);
  };

  const toggleModel = (model: string) => {
    if (!aiSettings) return;
    const current = aiSettings.allowed_ai_models || [];
    const updated = current.includes(model) ? current.filter(m => m !== model) : [...current, model];
    updateAISettings({ allowed_ai_models: updated });
  };

  const deleteSchool = async () => {
    if (!confirm(`Delete "${school.name}"? This will remove all members and settings.`)) return;
    await supabase.from('schools').delete().eq('id', school.id);
    toast({ title: 'School deleted' });
    onBack();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2 text-sm">← Back to Schools</Button>
          <h2 className="text-2xl font-bold flex items-center gap-2"><School className="h-6 w-6 text-blue-600" />{school.name}</h2>
          <p className="text-muted-foreground">{school.description || 'No description'}</p>
          <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
            {school.domain && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{school.domain}</span>}
            {school.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{school.contact_email}</span>}
            {school.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{school.address}</span>}
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={deleteSchool}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
          <TabsTrigger value="ai-models">AI Models</TabsTrigger>
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-4">
          {/* Seat Limits Card */}
          {seatLimits && (
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-600" /> Seat Allocation</CardTitle>
                <CardDescription>Your plan: <strong className="capitalize">{seatLimits.plan_id?.replace(/_/g, ' ')}</strong> ({seatLimits.billing_cycle})</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Teacher Seats</p>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">{members.filter(m => m.school_role === 'teacher' || m.school_role === 'admin').length}</span>
                      <span className="text-muted-foreground text-sm mb-0.5">/ {seatLimits.teacher_seats}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (members.filter(m => m.school_role === 'teacher' || m.school_role === 'admin').length / Math.max(1, seatLimits.teacher_seats)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Student Seats</p>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">{members.filter(m => m.school_role === 'member').length}</span>
                      <span className="text-muted-foreground text-sm mb-0.5">/ {seatLimits.student_seats}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (members.filter(m => m.school_role === 'member').length / Math.max(1, seatLimits.student_seats)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add Member</CardTitle>
              {seatLimits && (
                <CardDescription>
                  {(() => {
                    const teachersUsed = members.filter(m => m.school_role === 'teacher' || m.school_role === 'admin').length;
                    const studentsUsed = members.filter(m => m.school_role === 'member').length;
                    const tLeft = seatLimits.teacher_seats - teachersUsed;
                    const sLeft = seatLimits.student_seats - studentsUsed;
                    return `${tLeft} teacher seat${tLeft !== 1 ? 's' : ''} • ${sLeft} student seat${sLeft !== 1 ? 's' : ''} remaining`;
                  })()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)} placeholder="User email" className="flex-1" />
                <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMember} disabled={!addMemberEmail}>Add</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? <p className="text-muted-foreground text-sm">No members yet.</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>School Role</TableHead><TableHead>Joined</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.profile?.full_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.profile?.email || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{m.school_role}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLASSES TAB */}
        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign Existing Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Select value={assignClassId} onValueChange={setAssignClassId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select unassigned class..." /></SelectTrigger>
                  <SelectContent>
                    {unassignedClasses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} — {c.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={assignClass} disabled={!assignClassId}>Assign</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">School Classes ({classes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? <p className="text-muted-foreground text-sm">No classes assigned.</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Name</TableHead><TableHead>Subject</TableHead><TableHead>Join Code</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {classes.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="outline">{c.subject}</Badge></TableCell>
                        <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{c.join_code}</code></TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => unassignClass(c.id)}>Unassign</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI SETTINGS TAB */}
        <TabsContent value="ai-settings" className="space-y-4">
          {aiSettings && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5" /> Feature Controls</CardTitle>
                  <CardDescription>Enable or disable AI features for this school</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow label="AI Chat for Students" desc="Allow students to use the AI learning assistant" checked={aiSettings.allow_student_chat} onChange={v => updateAISettings({ allow_student_chat: v })} />
                  <ToggleRow label="Process Teaching Mode" desc="Enable guided prompts that teach instead of giving answers" checked={aiSettings.process_mode_enabled} onChange={v => updateAISettings({ process_mode_enabled: v })} />
                  <ToggleRow label="Capstone AI Grading" desc="Allow AI to provide automated feedback on capstone submissions" checked={aiSettings.allow_capstone_ai_grading} onChange={v => updateAISettings({ allow_capstone_ai_grading: v })} />
                  <ToggleRow label="Learning Path Generation" desc="Allow AI to generate personalized learning paths" checked={aiSettings.allow_learning_path_generation} onChange={v => updateAISettings({ allow_learning_path_generation: v })} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-5 w-5" /> Usage Limits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Daily Prompts per Student</Label>
                      <Input type="number" value={aiSettings.max_daily_prompts_per_student} onChange={e => updateAISettings({ max_daily_prompts_per_student: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Max Monthly Cost (USD)</Label>
                      <Input type="number" step="0.01" value={aiSettings.max_monthly_cost_usd} onChange={e => updateAISettings({ max_monthly_cost_usd: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Blocked Keywords</CardTitle>
                  <CardDescription>Keywords that will be blocked in student prompts for this school</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-3">
                    <Input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Add keyword..." onKeyDown={e => e.key === 'Enter' && addBlockedKeyword()} />
                    <Button onClick={addBlockedKeyword} size="sm">Add</Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(aiSettings.blocked_keywords || []).map(kw => (
                      <Badge key={kw} variant="destructive" className="gap-1 cursor-pointer" onClick={() => removeBlockedKeyword(kw)}>{kw} ×</Badge>
                    ))}
                    {(aiSettings.blocked_keywords || []).length === 0 && <p className="text-sm text-muted-foreground">No blocked keywords.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subject-Specific Filtering</CardTitle>
                  <CardDescription>Restrict AI usage to specific subjects only. Leave empty to allow all subjects.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-3">
                    <Select value={newSubject} onValueChange={setNewSubject}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select subject..." /></SelectTrigger>
                      <SelectContent>
                        {['math', 'science', 'english', 'history', 'programming', 'writing', 'languages', 'art', 'music', 'geography'].filter(s => !(aiSettings.subject_restrictions || []).includes(s)).map(s => (
                          <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addSubjectRestriction} size="sm" disabled={!newSubject}>Add</Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(aiSettings.subject_restrictions || []).map((subj: string) => (
                      <Badge key={subj} variant="secondary" className="gap-1 cursor-pointer capitalize" onClick={() => removeSubjectRestriction(subj)}>
                        {subj} ×
                      </Badge>
                    ))}
                    {(aiSettings.subject_restrictions || []).length === 0 && <p className="text-sm text-muted-foreground">All subjects allowed.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom System Prompt</CardTitle>
                  <CardDescription>Override the default AI system prompt for this school's students</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={aiSettings.custom_system_prompt}
                    onChange={e => updateAISettings({ custom_system_prompt: e.target.value })}
                    placeholder="e.g. You are a helpful teaching assistant for Lincoln High School. Focus on STEM subjects and always encourage students to show their work..."
                    rows={4}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* AI MODELS TAB */}
        <TabsContent value="ai-models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Brain className="h-5 w-5" /> Allowed AI Models</CardTitle>
              <CardDescription>Select which AI models students in this school can access. Restricting to smaller models reduces cost.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AI_MODELS.map(model => {
                  const isEnabled = aiSettings?.allowed_ai_models?.includes(model);
                  const [provider, name] = model.split('/');
                  return (
                    <div key={model} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="font-medium text-sm">{name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{provider}</div>
                      </div>
                      <Switch checked={isEnabled} onCheckedChange={() => toggleModel(model)} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">School Training Datasets</CardTitle>
              <CardDescription>Link approved training data to this school. The AI will use these examples to customize responses for students.</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No training data available. Visit the <strong>Model Training</strong> page to create prompt-response pairs.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {trainingData.map((td: any) => {
                    const isLinked = ((aiSettings as any)?.custom_model_training_data_ids || []).includes(td.id);
                    return (
                      <div key={td.id} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${isLinked ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize text-xs">{td.subject}</Badge>
                            {td.grade_level && <Badge variant="outline" className="text-xs">{td.grade_level}</Badge>}
                            {td.approved ? <Badge className="text-xs bg-green-100 text-green-700">Approved</Badge> : <Badge variant="secondary" className="text-xs">Pending</Badge>}
                          </div>
                          <p className="text-sm truncate">{td.input_prompt}</p>
                        </div>
                        <Switch checked={isLinked} onCheckedChange={() => toggleTrainingData(td.id)} />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                <strong>How it works:</strong> Linked training examples shape the AI's teaching style, curriculum focus, and response patterns specifically for this school's students.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
