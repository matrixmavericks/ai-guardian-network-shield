import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolData {
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

export interface SchoolAISettings {
  allow_student_chat: boolean;
  allow_learning_path_generation: boolean;
  allow_capstone_ai_grading: boolean;
  process_mode_enabled: boolean;
  allowed_ai_models: string[] | null;
  blocked_keywords: string[] | null;
  subject_restrictions: string[] | null;
  grade_level_restrictions: string[] | null;
  max_daily_prompts_per_student: number | null;
  max_monthly_cost_usd: number | null;
  custom_system_prompt: string | null;
}

interface SchoolContextType {
  school: SchoolData | null;
  aiSettings: SchoolAISettings | null;
  loading: boolean;
  notFound: boolean;
  subdomain: string;
  primaryColor: string;
  accentColor: string;
  isFeatureEnabled: (feature: string) => boolean;
  schoolBasePath: string;
}

const SchoolContext = createContext<SchoolContextType>({
  school: null,
  aiSettings: null,
  loading: true,
  notFound: false,
  subdomain: '',
  primaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  isFeatureEnabled: () => true,
  schoolBasePath: '',
});

export const useSchool = () => useContext(SchoolContext);

export const SchoolProvider: React.FC<{ subdomain: string; children: React.ReactNode }> = ({ subdomain, children }) => {
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [aiSettings, setAISettings] = useState<SchoolAISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
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

      // Fetch AI settings
      const { data: settings } = await supabase
        .from('school_ai_settings')
        .select('*')
        .eq('school_id', data.id)
        .maybeSingle();

      if (settings) {
        setAISettings(settings as unknown as SchoolAISettings);
      }

      setLoading(false);
    };
    fetch();
  }, [subdomain]);

  const primaryColor = school?.theme_config?.primaryColor || '#3b82f6';
  const accentColor = school?.theme_config?.accentColor || '#8b5cf6';
  const schoolBasePath = `/s/${subdomain}`;

  const isFeatureEnabled = (feature: string): boolean => {
    if (!aiSettings) return true; // No restrictions = everything enabled
    switch (feature) {
      case 'ai_chat': return aiSettings.allow_student_chat !== false;
      case 'learning_paths': return aiSettings.allow_learning_path_generation !== false;
      case 'ai_grading': return aiSettings.allow_capstone_ai_grading !== false;
      case 'process_mode': return aiSettings.process_mode_enabled === true;
      default: return true;
    }
  };

  return (
    <SchoolContext.Provider value={{
      school, aiSettings, loading, notFound, subdomain, primaryColor, accentColor, isFeatureEnabled, schoolBasePath,
    }}>
      {children}
    </SchoolContext.Provider>
  );
};

export default SchoolContext;
