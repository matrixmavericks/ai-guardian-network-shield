import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { School, Users, BookOpen, Mail, MapPin, Globe, LogIn, ArrowRight, Loader2, Megaphone, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ClassInfo { id: string; name: string; subject: string; description: string | null; }
interface Announcement { id: string; title: string; content: string; priority: string; created_at: string; }
interface SchoolEvent { id: string; title: string; description: string | null; event_date: string; end_date: string | null; location: string | null; }

const SchoolPortalPage = () => {
  const { user } = useAuth();
  const { school, loading, notFound, primaryColor, accentColor, schoolBasePath } = useSchool();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ members: 0, classes: 0 });
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);

  useEffect(() => {
    if (!school) return;
    const fetchData = async () => {
      const [membersRes, classesRes, classListRes, annRes, eventsRes] = await Promise.all([
        supabase.from('school_members').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
        supabase.from('classes').select('id, name, subject, description').eq('school_id', school.id).limit(12),
        supabase.from('school_announcements').select('*').eq('school_id', school.id).eq('is_public', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('school_events').select('*').eq('school_id', school.id).eq('is_public', true).gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(6),
      ]);
      setStats({ members: membersRes.count || 0, classes: classesRes.count || 0 });
      setClasses((classListRes.data || []) as ClassInfo[]);
      setAnnouncements((annRes.data || []) as Announcement[]);
      setEvents((eventsRes.data || []) as SchoolEvent[]);
    };
    fetchData();
  }, [school]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <School className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">School Not Found</h1>
        <p className="text-muted-foreground">No school exists with this subdomain</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const priorityStyles: Record<string, string> = {
    urgent: 'border-l-4 border-l-red-500 bg-red-50',
    high: 'border-l-4 border-l-orange-500 bg-orange-50',
    normal: 'border-l-4 border-l-blue-500',
    low: 'border-l-4 border-l-slate-300',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative py-16 px-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>
        <div className="max-w-5xl mx-auto text-center">
          {school?.logo_url ? (
            <img src={school.logo_url} alt={school.name} className="h-20 w-20 mx-auto mb-4 rounded-full bg-white/20 p-2 object-contain" />
          ) : (
            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <School className="h-10 w-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{school?.name}</h1>
          {school?.description && <p className="text-white/80 text-lg max-w-2xl mx-auto">{school.description}</p>}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge className="bg-white/20 text-white border-white/30"><Users className="h-3 w-3 mr-1" /> {stats.members} Members</Badge>
            <Badge className="bg-white/20 text-white border-white/30"><BookOpen className="h-3 w-3 mr-1" /> {stats.classes} Classes</Badge>
          </div>
          <div className="mt-6">
            {user ? (
              <Button size="lg" onClick={() => navigate(`${schoolBasePath}/dashboard`)} className="bg-white hover:bg-white/90" style={{ color: primaryColor }}>
                Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate(`${schoolBasePath}/login`)} className="bg-white hover:bg-white/90" style={{ color: primaryColor }}>
                <LogIn className="h-4 w-4 mr-2" /> Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-8 -mt-6">
        {/* Announcements */}
        {announcements.length > 0 && (
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Megaphone className="h-5 w-5" style={{ color: primaryColor }} /> Announcements</h2>
            <div className="space-y-3">
              {announcements.map(a => (
                <Card key={a.id} className={priorityStyles[a.priority] || ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {a.priority === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {a.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(a.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {events.length > 0 && (
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Calendar className="h-5 w-5" style={{ color: primaryColor }} /> Upcoming Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(ev => (
                <Card key={ev.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg p-2 text-center min-w-[50px]" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                        <div className="text-lg font-bold">{format(new Date(ev.event_date), 'd')}</div>
                        <div className="text-xs uppercase">{format(new Date(ev.event_date), 'MMM')}</div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{ev.title}</h3>
                        {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {format(new Date(ev.event_date), 'h:mm a')}
                          {ev.location && <><MapPin className="h-3 w-3 ml-2" /> {ev.location}</>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Class Catalog */}
        {classes.length > 0 && (
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><BookOpen className="h-5 w-5" style={{ color: primaryColor }} /> Class Catalog</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(c => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge variant="secondary" className="mt-1 text-xs">{c.subject}</Badge>
                    {c.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {school?.contact_email && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" style={{ color: primaryColor }} /> Contact</CardTitle></CardHeader>
              <CardContent><a href={`mailto:${school.contact_email}`} className="text-primary hover:underline text-sm">{school.contact_email}</a></CardContent>
            </Card>
          )}
          {school?.address && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: primaryColor }} /> Address</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">{school.address}</p></CardContent>
            </Card>
          )}
        </div>

        <Separator />
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Powered by <span className="font-semibold">Refyn</span> — AI-Powered Education Platform</p>
          <p className="mt-1 flex items-center justify-center gap-1"><Globe className="h-3 w-3" /> {school?.subdomain}.refyntech.us</p>
        </div>
      </div>
    </div>
  );
};

export default SchoolPortalPage;
