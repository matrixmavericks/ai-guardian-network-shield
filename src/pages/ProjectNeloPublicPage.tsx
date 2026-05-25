import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

type Verdict = {
  applicant_name: string;
  status: 'accepted' | 'rejected';
  letter_title: string | null;
  letter_body: string;
  updated_at: string;
};

export default function ProjectNeloPublicPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Verdict | null | 'notfound'>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    const { data } = await supabase
      .from('project_nelo_applicants')
      .select('applicant_name,status,letter_title,letter_body,updated_at')
      .eq('normalized_name', normalize(query))
      .maybeSingle();
    setLoading(false);
    setResult((data as any) || 'notfound');
  };

  const reset = () => { setResult(null); setQuery(''); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 text-xs uppercase tracking-widest text-white/70 mb-6">
            <Sparkles className="h-3 w-3" /> Confidential Portal
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4">Project Nelo</h1>
          <p className="text-white/60 text-lg">Admissions Decision Portal</p>
        </div>

        {!result && (
          <form onSubmit={search} className="max-w-xl mx-auto">
            <p className="text-center text-white/70 mb-4">Enter your full name as submitted in your application.</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Your full name"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
                />
              </div>
              <Button type="submit" disabled={loading} className="h-12 px-6 bg-white text-slate-900 hover:bg-white/90">
                {loading ? 'Checking...' : 'View decision'}
              </Button>
            </div>
            <p className="text-xs text-white/40 text-center mt-6">This portal is private. Decisions are final.</p>
          </form>
        )}

        {result === 'notfound' && (
          <div className="max-w-xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-semibold mb-2">No record found</h2>
            <p className="text-white/60 mb-6">
              We could not locate an application under "{query}". Double-check the spelling, or contact the committee if you believe this is an error.
            </p>
            <Button onClick={reset} variant="outline" className="border-white/30 text-white hover:bg-white/10">Try again</Button>
          </div>
        )}

        {result && result !== 'notfound' && (
          <div className="bg-[#fdfaf3] text-slate-900 rounded-2xl shadow-2xl p-10 md:p-14 font-serif animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-300">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Project Nelo</div>
                <div className="text-sm text-slate-500 mt-1">Office of Admissions</div>
              </div>
              <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full font-sans ${
                result.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {result.status === 'accepted' ? 'Offer of Admission' : 'Decision Notice'}
              </span>
            </div>

            {result.letter_title && (
              <h2 className="text-3xl font-bold mb-6">{result.letter_title}</h2>
            )}

            <div className="whitespace-pre-wrap leading-relaxed text-slate-800 text-lg">
              {result.letter_body}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-300 text-xs text-slate-500 font-sans">
              Decision issued: {new Date(result.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>

            <div className="mt-8 text-center font-sans">
              <Button onClick={reset} variant="outline">Look up another name</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
