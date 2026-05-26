import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Terminal, ShieldCheck, ShieldAlert } from 'lucide-react';
// @ts-ignore - no types installed
import confetti from 'canvas-confetti';

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

type Verdict = {
  applicant_name: string;
  status: 'accepted' | 'rejected';
  letter_title: string | null;
  letter_body: string;
  updated_at: string;
};

type Phase = 'idle' | 'searching' | 'booting' | 'gate' | 'letter' | 'notfound';

const fireConfetti = () => {
  const end = Date.now() + 2500;
  const colors = ['#22d3ee', '#a78bfa', '#34d399', '#facc15', '#f472b6'];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 }, colors });
};

const BootTerminal: React.FC<{ name: string; status: 'accepted' | 'rejected'; onDone: () => void }> = ({ name, status, onDone }) => {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ts = () => new Date().toISOString().split('T')[1].replace('Z', '');
    const sequence = [
      `[${ts()}] nelo-secure-shell v4.2.1 :: initializing handshake...`,
      `[${ts()}] > establishing TLS 1.3 tunnel ........ OK`,
      `[${ts()}] > negotiating ed25519 keypair ........ OK`,
      `[${ts()}] > authenticating applicant: "${name}"`,
      `[${ts()}] > querying admissions ledger /var/nelo/ledger.db`,
      `[${ts()}] > decrypting verdict payload (AES-256-GCM) ........ OK`,
      `[${ts()}] > verifying committee signature ........ OK`,
      `[${ts()}] > integrity hash sha3-512 :: ${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 10)}`,
      `[${ts()}] > unlocking secure channel`,
      status === 'accepted'
        ? `[${ts()}] >> STATUS: \x1b[32mACCESS_GRANTED\x1b[0m`
        : `[${ts()}] >> STATUS: \x1b[31mACCESS_DENIED\x1b[0m`,
      `[${ts()}] > rendering official document ...`,
    ];

    let i = 0;
    const interval = setInterval(() => {
      setLines((prev) => [...prev, sequence[i]]);
      i++;
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(onDone, 600);
      }
    }, 220);

    return () => clearInterval(interval);
  }, [name, status, onDone]);

  const isGranted = status === 'accepted';

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="rounded-xl overflow-hidden border border-cyan-500/30 bg-black shadow-[0_0_60px_-15px_rgba(34,211,238,0.5)]">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border-b border-cyan-500/20">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2 ml-3 text-xs text-cyan-300/80 font-mono">
            <Terminal className="h-3 w-3" /> nelo@admissions:~$
          </div>
        </div>
        <div ref={scrollRef} className="p-5 font-mono text-[13px] text-emerald-300 h-72 overflow-y-auto leading-relaxed">
          {lines.map((l, idx) => {
            const greenMatch = l.includes('ACCESS_GRANTED');
            const redMatch = l.includes('ACCESS_DENIED');
            const cleaned = l.replace(/\x1b\[\d+m/g, '');
            return (
              <div key={idx} className={`whitespace-pre-wrap ${greenMatch ? 'text-emerald-400 font-bold' : ''} ${redMatch ? 'text-rose-400 font-bold' : ''}`}>
                {cleaned}
                {idx === lines.length - 1 && <span className="inline-block w-2 h-4 bg-emerald-400 ml-1 animate-pulse" />}
              </div>
            );
          })}
        </div>
      </div>
      <p className={`text-center mt-4 text-xs font-mono uppercase tracking-widest ${isGranted ? 'text-cyan-300/70' : 'text-rose-300/70'}`}>
        secure channel active · do not disconnect
      </p>
    </div>
  );
};

const GateReveal: React.FC<{ status: 'accepted' | 'rejected'; onDone: () => void }> = ({ status, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  const isGranted = status === 'accepted';
  const accent = isGranted ? 'cyan' : 'rose';

  return (
    <div className="max-w-2xl mx-auto relative h-80 flex items-center justify-center animate-in fade-in duration-300">
      {/* Scanline grid */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Gate panels */}
      <div className={`absolute inset-y-0 left-1/2 w-1/2 bg-gradient-to-l from-${accent}-500/20 via-slate-900 to-slate-950 border-l border-${accent}-400/60 origin-left animate-[gateRight_1.6s_ease-in-out_forwards] shadow-[0_0_40px_rgba(34,211,238,0.3)]`} />
      <div className={`absolute inset-y-0 right-1/2 w-1/2 bg-gradient-to-r from-${accent}-500/20 via-slate-900 to-slate-950 border-r border-${accent}-400/60 origin-right animate-[gateLeft_1.6s_ease-in-out_forwards] shadow-[0_0_40px_rgba(34,211,238,0.3)]`} />

      {/* Center seal */}
      <div className="relative z-10 flex flex-col items-center">
        <div className={`relative h-28 w-28 rounded-full border-2 ${isGranted ? 'border-cyan-400' : 'border-rose-400'} flex items-center justify-center animate-[pulseGlow_1.2s_ease-out_infinite]`}>
          <div className={`absolute inset-2 rounded-full border ${isGranted ? 'border-cyan-400/40' : 'border-rose-400/40'} animate-spin-slow`} />
          {isGranted ? (
            <ShieldCheck className="h-12 w-12 text-cyan-300" />
          ) : (
            <ShieldAlert className="h-12 w-12 text-rose-300" />
          )}
        </div>
        <div className={`mt-4 font-mono text-lg tracking-[0.4em] ${isGranted ? 'text-cyan-300' : 'text-rose-300'}`}>
          {isGranted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">
          opening secure channel
        </div>
      </div>

      <style>{`
        @keyframes gateRight { 0% { transform: translateX(0); } 100% { transform: translateX(110%); } }
        @keyframes gateLeft  { 0% { transform: translateX(0); } 100% { transform: translateX(-110%); } }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.6); }
          50% { box-shadow: 0 0 40px 10px rgba(34,211,238,0.1); }
        }
        .animate-spin-slow { animation: spin 6s linear infinite; }
      `}</style>
    </div>
  );
};

export default function ProjectNeloPublicPage() {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Verdict | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setPhase('searching');
    setResult(null);
    const { data } = await supabase
      .from('project_nelo_applicants')
      .select('applicant_name,status,letter_title,letter_body,updated_at')
      .eq('normalized_name', normalize(query))
      .maybeSingle();
    if (!data) {
      setPhase('notfound');
      return;
    }
    setResult(data as any);
    setPhase('booting');
  };

  const reset = () => { setPhase('idle'); setResult(null); setQuery(''); };

  useEffect(() => {
    if (phase === 'letter' && result?.status === 'accepted') {
      fireConfetti();
    }
  }, [phase, result?.status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      {/* Ambient grid */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="max-w-3xl mx-auto px-6 py-16 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 text-xs uppercase tracking-widest text-cyan-200 mb-6 font-mono">
            <Sparkles className="h-3 w-3" /> Confidential Portal
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4">Project Nelo</h1>
          <p className="text-white/60 text-lg font-mono">// admissions decision portal</p>
        </div>

        {(phase === 'idle' || phase === 'searching') && (
          <form onSubmit={search} className="max-w-xl mx-auto">
            <p className="text-center text-white/70 mb-4">Enter your full name as submitted in your application.</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-300/60" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Your full name"
                  className="pl-10 bg-white/5 border-cyan-400/30 text-white placeholder:text-white/40 h-12 font-mono"
                />
              </div>
              <Button type="submit" disabled={phase === 'searching'} className="h-12 px-6 bg-cyan-400 text-slate-900 hover:bg-cyan-300 font-mono uppercase tracking-wider">
                {phase === 'searching' ? 'Querying...' : 'Authenticate'}
              </Button>
            </div>
            <p className="text-xs text-white/40 text-center mt-6 font-mono">// transmissions are end-to-end encrypted</p>
          </form>
        )}

        {phase === 'notfound' && (
          <div className="max-w-xl mx-auto bg-white/5 border border-rose-400/30 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-semibold mb-2 font-mono text-rose-300">NO_RECORD_FOUND</h2>
            <p className="text-white/60 mb-6">
              We could not locate an application under "{query}". Double-check the spelling, or contact the committee if you believe this is an error.
            </p>
            <Button onClick={reset} variant="outline" className="border-white/30 text-white hover:bg-white/10">Try again</Button>
          </div>
        )}

        {phase === 'booting' && result && (
          <BootTerminal name={result.applicant_name} status={result.status} onDone={() => setPhase('gate')} />
        )}

        {phase === 'gate' && result && (
          <GateReveal status={result.status} onDone={() => setPhase('letter')} />
        )}

        {phase === 'letter' && result && (
          <div className="bg-[#fdfaf3] text-slate-900 rounded-2xl shadow-2xl p-10 md:p-14 font-serif animate-in fade-in zoom-in-95 duration-700">
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
