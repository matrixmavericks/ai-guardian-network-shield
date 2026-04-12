import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { School, Users, BookOpen, Mail, MapPin, Globe, LogIn, ArrowRight, Loader2 } from 'lucide-react';

interface SchoolData {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  address: string | null;
  subdomain: string | null;
  theme_config: any;
  created_at: string;
}

const SchoolPortalPage = () => {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [stats, setStats] = useState({ members: 0, classes: 0 });

  useEffect(() => {
    const fetchSchool = async () => {
      if (!subdomain) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('subdomain', subdomain.toLowerCase())
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setSchool(data as SchoolData);

      // Fetch stats
      const [membersRes, classesRes] = await Promise.all([
        supabase.from('school_members').select('id', { count: 'exact', head: true }).eq('school_id', data.id),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', data.id),
      ]);

      setStats({
        members: membersRes.count || 0,
        classes: classesRes.count || 0,
      });

      setLoading(false);
    };
    fetchSchool();
  }, [subdomain]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <School className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">School Not Found</h1>
        <p className="text-muted-foreground">No school exists with the subdomain "{subdomain}"</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const primaryColor = school?.theme_config?.primaryColor || '#3b82f6';
  const accentColor = school?.theme_config?.accentColor || '#8b5cf6';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div
        className="relative py-16 px-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {school?.logo_url ? (
            <img src={school.logo_url} alt={school.name} className="h-20 w-20 mx-auto mb-4 rounded-full bg-white/20 p-2 object-contain" />
          ) : (
            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <School className="h-10 w-10 text-white" />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{school?.name}</h1>
          {school?.description && (
            <p className="text-white/80 text-lg max-w-2xl mx-auto">{school.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              <Users className="h-3 w-3 mr-1" /> {stats.members} Members
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              <BookOpen className="h-3 w-3 mr-1" /> {stats.classes} Classes
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6 -mt-8">
        {/* Actions Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div>
                <h2 className="text-xl font-semibold">Welcome to {school?.name}</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {user ? 'Access your school dashboard and resources.' : 'Sign in to access your school resources.'}
                </p>
              </div>
              {user ? (
                <Button onClick={() => navigate('/dashboard')} style={{ backgroundColor: primaryColor }}>
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => navigate('/login')} style={{ backgroundColor: primaryColor }}>
                  <LogIn className="h-4 w-4 mr-2" /> Sign In
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* School Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {school?.contact_email && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" style={{ color: primaryColor }} /> Contact Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a href={`mailto:${school.contact_email}`} className="text-primary hover:underline">
                  {school.contact_email}
                </a>
              </CardContent>
            </Card>
          )}

          {school?.address && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: primaryColor }} /> Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{school.address}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Powered by <span className="font-semibold">Refyn</span> — AI-Powered Education Platform</p>
          <p className="mt-1 flex items-center justify-center gap-1">
            <Globe className="h-3 w-3" /> {subdomain}.refyntech.us
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolPortalPage;
