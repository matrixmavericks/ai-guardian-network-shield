import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, GraduationCap, Link2, MousePointerClick, PlayCircle, School, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Container, Eyebrow, GlowButton, QuietLink, useReveal } from "@/components/landing/primitives";
import { useSmoothScroll } from "@/components/landing/useSmoothScroll";
import HelpAssistant from "@/components/help/HelpAssistant";
import { ClipModal, MiniDemoModal } from "@/components/help/HelpModals";
import { Rich, useHelpData } from "@/help/useHelpData";
import { matchHelp } from "@/help/match";
import type { HelpItem } from "@/help/types";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const WHO: Record<HelpItem["who"], { label: string; icon: React.ElementType } | null> = {
  student: { label: "Students", icon: GraduationCap },
  teacher: { label: "Teachers", icon: School },
  everyone: null,
};
type Audience = "all" | "student" | "teacher";

const Question: React.FC<{
  item: HelpItem;
  open: boolean;
  onToggle: () => void;
  onWatch: () => void;
  onShow: () => void;
}> = ({ item, open, onToggle, onWatch, onShow }) => {
  const who = WHO[item.who];
  const [copied, setCopied] = useState(false);
  return (
    <li id={item.id} className="scroll-mt-28">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 py-4 text-left">
        <span className="flex-1 text-[15.5px] font-medium text-white">{item.q}</span>
        {who && (
          <span className="hidden shrink-0 items-center gap-1 rounded-full border border-lp-line px-2 py-0.5 text-[11.5px] text-lp-mute sm:inline-flex">
            <who.icon className="h-3 w-3" /> {who.label}
          </span>
        )}
        <span className="flex shrink-0 items-center gap-1 text-lp-mute">
          {item.video && <PlayCircle className="h-4 w-4" aria-label="Has a video" />}
          {item.demo && <MousePointerClick className="h-4 w-4" aria-label="Has a demo" />}
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="lp-fade -mt-1 pb-5">
          <p className="max-w-[60ch] text-[15px] leading-relaxed text-lp-soft">
            <Rich text={item.a} />
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {item.video && (
              <button type="button" onClick={onWatch} className="inline-flex h-9 items-center gap-2 rounded-xl border border-lp-line bg-lp-surface/70 px-3 text-[13.5px] text-white transition-colors hover:border-lp-sky/50">
                <PlayCircle className="h-4 w-4 text-lp-cyan" /> Watch <span className="text-lp-mute">{clock(item.video.to - item.video.from)}</span>
              </button>
            )}
            {item.demo && (
              <button type="button" onClick={onShow} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#3b82f6] px-3 text-[13.5px] font-medium text-white transition-colors hover:bg-[#2f6fe0]">
                <MousePointerClick className="h-4 w-4" /> Show me in the demo
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/help#${item.id}`;
                void navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] text-lp-mute transition-colors hover:text-white"
            >
              <Link2 className="h-3.5 w-3.5" /> {copied ? "Link copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

const HelpPage = () => {
  useReveal();
  useSmoothScroll();
  const { hash } = useLocation();
  const { data, failed } = useHelpData();
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [clip, setClip] = useState<HelpItem | null>(null);
  const [mini, setMini] = useState<HelpItem | null>(null);

  useEffect(() => {
    document.title = "Help centre · Refyn";
  }, []);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Open a question in the list and bring it into view. */
  const reveal = useCallback((id: string) => {
    setQuery("");
    setAudience("all");
    setOpen((prev) => new Set(prev).add(id));
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);

  // /help#join-class opens that question
  useEffect(() => {
    if (data && hash) reveal(decodeURIComponent(hash.slice(1)));
  }, [data, hash, reveal]);

  const fits = (i: HelpItem) => audience === "all" || i.who === "everyone" || i.who === audience;
  const results = useMemo(() => {
    if (!data || !query.trim()) return null;
    const found = matchHelp(data, query, 12);
    // Keep the strong matches only, so a search reads like an answer, not a list
    const best = found[0]?.score ?? 0;
    return found.filter((m) => m.score >= best * 0.45).map((m) => m.item).filter(fits);
  }, [data, query, audience]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = data?.categories.reduce((n, c) => n + c.items.length, 0) ?? 0;

  const row = (item: HelpItem) => (
    <Question key={item.id} item={item} open={open.has(item.id) || (!!results && results.length <= 3)} onToggle={() => toggle(item.id)} onWatch={() => setClip(item)} onShow={() => setMini(item)} />
  );

  return (
    <div className="relative z-[1] min-h-screen overflow-x-clip bg-lp-bg font-ui text-lp-text antialiased selection:bg-lp-blue/40 selection:text-white">
      <LandingNav />
      <main>
        <section aria-labelledby="help-title" className="relative pb-10 pt-36 sm:pt-44">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-24 h-[480px] w-[1000px] -translate-x-1/2 rounded-full opacity-70 blur-[130px]"
            style={{ background: "radial-gradient(closest-side, rgba(29,78,216,0.5), rgba(63,233,255,0.12), transparent)" }}
          />
          <Container className="relative text-center">
            <Eyebrow>Help centre</Eyebrow>
            <h1 id="help-title" className="mx-auto mt-6 max-w-[14ch] text-balance text-[44px] font-normal leading-[0.96] tracking-[-0.045em] text-white sm:text-[64px] lg:text-[76px]">
              How can we{" "}
              <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">help?</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[34rem] text-balance text-[16.5px] leading-[1.65] text-lp-soft">
              Short answers to {count || "all the"} questions, most with a clip from the walkthroughs or a quick look at the real thing.
            </p>
            <div className="mx-auto mt-8 flex max-w-[620px] items-center gap-2 rounded-2xl border border-lp-line bg-lp-surface/80 p-2 pl-4 shadow-[0_20px_60px_-30px_rgba(29,78,216,0.7)] focus-within:border-lp-sky/60">
              <Search className="h-5 w-5 shrink-0 text-lp-mute" />
              <label htmlFor="help-search" className="sr-only">
                Search the help centre
              </label>
              <input
                id="help-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search, e.g. join a class, marking, guided mode"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15.5px] text-white outline-none placeholder:text-lp-mute"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-mute hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div role="radiogroup" aria-label="Show questions for" className="mt-4 inline-flex rounded-full border border-lp-line bg-lp-surface/60 p-1">
              {(
                [
                  ["all", "Everyone", Users],
                  ["student", "Students", GraduationCap],
                  ["teacher", "Teachers", School],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={audience === id}
                  onClick={() => setAudience(id)}
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium transition-colors", audience === id ? "bg-[#ffffff] text-[#0b1226]" : "text-lp-soft hover:text-white")}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </Container>
        </section>

        <section className="pb-24">
          <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
            <div className="order-2 min-w-0 lg:order-1">
              {failed && <p className="rounded-2xl border border-lp-line p-5 text-[14.5px] text-lp-soft">The help centre didn't load. Check your connection and refresh the page.</p>}
              {!data && !failed && (
                <div className="space-y-3" aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-lp-surface/50" />
                  ))}
                </div>
              )}
              {results && (
                <div>
                  <p className="mb-2 text-[13px] text-lp-mute">
                    {results.length ? `${results.length} ${results.length === 1 ? "answer" : "answers"} for “${query.trim()}”` : `Nothing in the help centre matches “${query.trim()}”. Try asking on the right.`}
                  </p>
                  <ul className="divide-y divide-lp-line rounded-[24px] border border-lp-line bg-lp-surface/40 px-5 sm:px-6">{results.map(row)}</ul>
                </div>
              )}
              {data && !results && (
                <div className="space-y-10">
                  {data.categories.map((c) => {
                    const items = c.items.filter(fits);
                    if (!items.length) return null;
                    return (
                      <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                        <h2 id={`cat-${c.id}`} className="text-[22px] font-medium tracking-[-0.025em] text-white">
                          {c.title}
                        </h2>
                        <p className="mt-1 text-[14px] text-lp-mute">{c.blurb}</p>
                        <ul className="mt-4 divide-y divide-lp-line rounded-[24px] border border-lp-line bg-lp-surface/40 px-5 sm:px-6">{items.map(row)}</ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
            <aside className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
              <HelpAssistant data={data} onWatch={setClip} onShow={setMini} onOpen={(i) => reveal(i.id)} />
            </aside>
          </Container>
        </section>

        <section className="border-t border-lp-line">
          <Container className="lp-reveal flex flex-col items-center gap-6 py-20 text-center">
            <h2 className="max-w-[18ch] text-balance text-[36px] font-normal leading-[1] tracking-[-0.04em] text-white sm:text-[48px]">
              Easier to{" "}
              <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">see it?</span>
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
              <GlowButton to="/demo">
                Try the live demo
                <ArrowRight aria-hidden className="h-4 w-4" />
              </GlowButton>
              <QuietLink to="/tour#videos">
                Watch the walkthroughs
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </QuietLink>
            </div>
          </Container>
        </section>
      </main>
      <LandingFooter />
      {clip && <ClipModal item={clip} onClose={() => setClip(null)} />}
      {mini && <MiniDemoModal item={mini} onClose={() => setMini(null)} />}
    </div>
  );
};

export default HelpPage;
