import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Trash2, MapPin, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface SchoolEvent {
  id: string; title: string; description: string | null; event_date: string; end_date: string | null;
  location: string | null; is_public: boolean; created_at: string;
}

const SchoolEventsPage = () => {
  const { user } = useAuth();
  const { school, primaryColor } = useSchool();
  const { toast } = useToast();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', end_date: '', location: '', is_public: false });
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    if (!school) return;
    const { data } = await supabase.from('school_events').select('*').eq('school_id', school.id).order('event_date', { ascending: true });
    setEvents((data || []) as SchoolEvent[]);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [school]);

  const handleCreate = async () => {
    if (!school || !user || !form.title.trim() || !form.event_date) return;
    setSaving(true);
    const { error } = await supabase.from('school_events').insert({
      school_id: school.id, title: form.title, description: form.description || null,
      event_date: form.event_date, end_date: form.end_date || null,
      location: form.location || null, is_public: form.is_public, created_by: user.id,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Event created' }); setForm({ title: '', description: '', event_date: '', end_date: '', location: '', is_public: false }); setShowForm(false); fetchEvents(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('school_events').delete().eq('id', id);
    fetchEvents();
  };

  const isPast = (d: string) => new Date(d) < new Date();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" style={{ color: primaryColor }} /> Events</h1>
        <Button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: primaryColor }}><Plus className="h-4 w-4 mr-2" /> New Event</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date & Time</Label><Input type="datetime-local" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} /></div>
              <div><Label>End Date & Time (optional)</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Room 201, Main Hall" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_public} onCheckedChange={v => setForm(p => ({ ...p, is_public: v }))} />
              <Label className="text-sm">Public (visible on portal)</Label>
            </div>
            <Button onClick={handleCreate} disabled={saving} style={{ backgroundColor: primaryColor }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create Event
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : events.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No events yet.</p>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <Card key={ev.id} className={isPast(ev.event_date) ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="rounded-lg p-2 text-center min-w-[50px]" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                    <div className="text-lg font-bold">{format(new Date(ev.event_date), 'd')}</div>
                    <div className="text-xs uppercase">{format(new Date(ev.event_date), 'MMM')}</div>
                  </div>
                  <div>
                    <h3 className="font-semibold">{ev.title}</h3>
                    {ev.description && <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(ev.event_date), 'h:mm a')}</span>
                      {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</span>}
                      {ev.is_public && <Badge variant="outline" className="text-[10px]">Public</Badge>}
                      {isPast(ev.event_date) && <Badge variant="secondary" className="text-[10px]">Past</Badge>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(ev.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolEventsPage;
