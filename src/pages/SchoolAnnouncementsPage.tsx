import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string; title: string; content: string; priority: string; is_public: boolean; created_at: string;
}

const SchoolAnnouncementsPage = () => {
  const { user } = useAuth();
  const { school, primaryColor } = useSchool();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal', is_public: false });
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = async () => {
    if (!school) return;
    const { data } = await supabase.from('school_announcements').select('*').eq('school_id', school.id).order('created_at', { ascending: false });
    setAnnouncements((data || []) as Announcement[]);
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, [school]);

  const handleCreate = async () => {
    if (!school || !user || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('school_announcements').insert({
      school_id: school.id, title: form.title, content: form.content,
      priority: form.priority, is_public: form.is_public, created_by: user.id,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Announcement created' }); setForm({ title: '', content: '', priority: 'normal', is_public: false }); setShowForm(false); fetchAnnouncements(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('school_announcements').delete().eq('id', id);
    fetchAnnouncements();
  };

  const priorityColors: Record<string, string> = { urgent: 'destructive', high: 'secondary', normal: 'outline', low: 'outline' };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6" style={{ color: primaryColor }} /> Announcements</h1>
        <Button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: primaryColor }}><Plus className="h-4 w-4 mr-2" /> New Announcement</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={3} /></div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={form.is_public} onCheckedChange={v => setForm(p => ({ ...p, is_public: v }))} />
                <Label className="text-sm">Public (visible on portal)</Label>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving} style={{ backgroundColor: primaryColor }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Publish
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : announcements.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {a.priority === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    {a.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={priorityColors[a.priority] as any}>{a.priority}</Badge>
                    {a.is_public && <Badge variant="outline">Public</Badge>}
                    <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolAnnouncementsPage;
