import React, { useEffect, useMemo, useRef, useState } from "react";
import { Aperture, Check, ChevronDown, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_MODELS, DEFAULT_MODEL, EFFORT_LABELS, REFYN_PICKS, findModel, type AiModel, type Effort, type Provider } from "@/lib/aiModels";

export type ModelChoice = { model: string; effort: Effort | null };

/** What the signed-in user may pick (from the ai-chat "models" action). */
export type ModelAccess = {
  default: string;
  schoolRestricted: boolean;
  models: Record<string, { available: boolean; reason?: "school" | "plan" | "unavailable" | null }>;
};

const PROVIDERS: Record<Provider, { label: string }> = {
  google: { label: "Google Gemini" },
  openai: { label: "OpenAI GPT" },
  anthropic: { label: "Anthropic Claude" },
};

/** Small provider marks: a sparkle for Gemini, an aperture for GPT, a starburst for Claude. */
export const ProviderGlyph: React.FC<{ provider?: string; className?: string }> = ({ provider, className }) => {
  const id = useRef(`g${Math.random().toString(36).slice(2, 8)}`).current;
  if (provider === "openai") return <Aperture className={cn("text-[#E8EEF8]", className)} strokeWidth={1.8} aria-hidden />;
  if (provider === "anthropic")
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <g stroke="#E0876A" strokeWidth="2.4" strokeLinecap="round">
          {[0, 30, 60, 90, 120, 150].map((a) => (
            <line key={a} x1="12" y1="3" x2="12" y2="21" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7CB4FF" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <path d="M12 1.5c.5 5.6 4.9 10 10.5 10.5-5.6.5-10 4.9-10.5 10.5C11.5 16.9 7.1 12.5 1.5 12 7.1 11.5 11.5 7.1 12 1.5z" fill={`url(#${id})`} />
    </svg>
  );
};

const Meter: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className="inline-flex items-center gap-1" title={`${label}: ${value}/5`}>
    <span className="text-lp-mute">{label}</span>
    <span className="flex gap-[2px]" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("h-[5px] w-[5px] rounded-full", n <= value ? "bg-lp-sky" : "bg-lp-line")} />
      ))}
    </span>
  </span>
);

const Badge: React.FC<{ tone: "new" | "preview" | "premium" | "legacy" | "default"; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={cn(
      "rounded-full px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.12em]",
      tone === "new" && "bg-lp-green/15 text-lp-green",
      tone === "preview" && "bg-[#A78BFA]/15 text-[#C4B5FD]",
      tone === "premium" && "bg-[#FBBF24]/15 text-[#FCD34D]",
      tone === "legacy" && "bg-white/[0.06] text-lp-mute",
      tone === "default" && "bg-lp-blue/20 text-lp-sky",
    )}
  >
    {children}
  </span>
);

const lockLabel = (reason?: string | null) =>
  reason === "school" ? "Not enabled by your school" : reason === "unavailable" ? "Not live on Refyn yet" : "Premium plan";
const lockShort = (reason?: string | null) => (reason === "school" ? "School" : reason === "unavailable" ? "Not live" : "Premium");

export const pickFor = (modelId: string) => REFYN_PICKS.find((p) => p.model === modelId);

/** Label for the composer button: the Refyn pick name when there is one. */
export const choiceLabel = (modelId: string) => pickFor(modelId)?.name ?? findModel(modelId)?.name ?? modelId;

export const ModelPicker: React.FC<{
  value: ModelChoice;
  onChange: (v: ModelChoice) => void;
  access: ModelAccess | null;
  onLocked?: (m: AiModel, reason?: string | null) => void;
}> = ({ value, onChange, access, onLocked }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const model = findModel(value.model) ?? findModel(DEFAULT_MODEL)!;
  const effort = model.efforts.length ? (value.effort && model.efforts.includes(value.effort) ? value.effort : model.defaultEffort ?? model.efforts[0]) : null;
  const status = (id: string) => access?.models[id] ?? { available: true, reason: null };

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (m: AiModel) => {
    const s = status(m.id);
    if (!s.available) {
      onLocked?.(m, s.reason);
      return;
    }
    onChange({ model: m.id, effort: value.effort && m.efforts.includes(value.effort) ? value.effort : null });
  };

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => AI_MODELS.filter((m) => !q || `${m.name} ${m.blurb} ${m.provider} ${pickFor(m.id)?.name ?? ""}`.toLowerCase().includes(q)),
    [q],
  );
  const offline = (id: string) => access?.models[id]?.reason === "unavailable";
  const legacyCount = AI_MODELS.filter((m) => m.legacy && !offline(m.id)).length;
  const offlineModels = AI_MODELS.filter((m) => offline(m.id));

  const row = (m: AiModel, pick?: (typeof REFYN_PICKS)[number]) => {
    const s = status(m.id);
    const selected = m.id === model.id;
    return (
      <button
        key={`${pick?.key ?? "m"}-${m.id}`}
        type="button"
        role="menuitemradio"
        aria-checked={selected}
        aria-disabled={!s.available}
        onClick={() => choose(m)}
        className={cn(
          "group flex w-full items-start gap-3 rounded-2xl px-3 text-left transition-colors",
          pick ? "py-3" : "py-2.5",
          selected ? "bg-lp-blue/[0.12]" : "hover:bg-white/[0.045]",
          !s.available && "opacity-60",
        )}
      >
        <ProviderGlyph provider={m.provider} className={cn("mt-0.5 shrink-0", pick ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]")} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={cn("font-medium text-white", pick ? "text-[15px]" : "text-[13.5px]")}>{pick ? pick.name : m.name}</span>
            {pick && <span className="text-[13.5px] text-lp-mute">{m.name}</span>}
            {!pick && m.id === (access?.default ?? DEFAULT_MODEL) && <Badge tone="default">Default</Badge>}
            {!pick && m.isNew && <Badge tone="new">New</Badge>}
            {!pick && m.preview && <Badge tone="preview">Preview</Badge>}
            {m.premium && <Badge tone="premium">Premium</Badge>}
            {!pick && m.legacy && <Badge tone="legacy">Older</Badge>}
          </span>
          <span className={cn("block text-lp-soft", pick ? "mt-0.5 text-[12.5px]" : "text-[12px]")}>{pick ? pick.tagline : m.blurb}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <Meter label="Speed" value={m.speed} />
            <Meter label="Depth" value={m.depth} />
            <span className="text-lp-mute" title={`Remembers the last ${m.memory} messages`}>{m.memory}-msg memory</span>
            {!m.efforts.length && <span className="text-lp-cyan">Instant</span>}
          </span>
        </span>
        {selected ? (
          <Check className="mt-1 h-4 w-4 shrink-0 text-lp-sky" />
        ) : !s.available ? (
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10.5px] text-lp-mute" title={lockLabel(s.reason)}>
            <Lock className="h-3 w-3" /> {lockShort(s.reason)}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${model.name}${effort ? ` · ${EFFORT_LABELS[effort].label} reasoning` : ""}`}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
          open ? "border-lp-blue/50 bg-lp-blue/15 text-white" : "border-transparent text-lp-soft hover:bg-white/[0.06] hover:text-white",
        )}
      >
        <ProviderGlyph provider={model.provider} className="h-4 w-4" />
        <span className="hidden max-w-[140px] truncate sm:inline">{choiceLabel(model.id)}</span>
        {effort && effort !== "low" && <span className="hidden rounded-full bg-white/[0.07] px-1.5 text-[11px] text-lp-sky md:inline">{EFFORT_LABELS[effort].label}</span>}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Choose a model"
            className="lp-fade absolute bottom-12 left-0 z-40 flex max-h-[min(640px,72vh)] w-[430px] flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-deep shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(124,180,255,0.06)] max-sm:fixed max-sm:inset-x-3 max-sm:bottom-28 max-sm:w-auto"
          >
            <div className="flex items-center gap-3 border-b border-lp-line px-4 pb-3 pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lp-mute">Model</p>
              <label className="relative ml-auto flex-1">
                <span className="sr-only">Search models</span>
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-lp-mute" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${AI_MODELS.length} models`}
                  className="h-8 w-full rounded-xl border border-lp-line bg-lp-surface pl-8 pr-2 text-[12.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/50 focus:outline-none"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!q && (
                <div className="mb-1">
                  <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">Refyn picks</p>
                  {REFYN_PICKS.filter((p) => !offline(p.model)).map((p) => {
                    const m = findModel(p.model);
                    return m ? row(m, p) : null;
                  })}
                </div>
              )}
              {(Object.keys(PROVIDERS) as Provider[]).map((prov) => {
                const list = matches.filter((m) => m.provider === prov && (q || (!offline(m.id) && (showLegacy || !m.legacy))));
                if (!list.length) return null;
                return (
                  <div key={prov} className="mt-1">
                    <p className="flex items-center gap-2 px-3 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">
                      <ProviderGlyph provider={prov} className="h-3 w-3" /> {PROVIDERS[prov].label}
                    </p>
                    {list.map((m) => row(m))}
                  </div>
                );
              })}
              {!q && (
                <button type="button" onClick={() => setShowLegacy((v) => !v)} className="mx-3 my-2 text-[12px] text-lp-sky hover:underline">
                  {showLegacy ? "Hide older models" : `Show ${legacyCount} older models`}
                </button>
              )}
              {!q && offlineModels.length > 0 && (
                <div className="mx-1 mb-2 rounded-2xl border border-dashed border-lp-line">
                  <button type="button" onClick={() => setShowOffline((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[12px] text-lp-mute hover:text-white">
                    <span>
                      <span className="font-medium text-lp-soft">Not live yet</span> · {offlineModels.length} model{offlineModels.length === 1 ? "" : "s"} the gateway doesn&apos;t serve for Refyn right now
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showOffline && "rotate-180")} />
                  </button>
                  {showOffline && <div className="pb-1">{offlineModels.map((m) => row(m))}</div>}
                </div>
              )}
              {q && matches.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-lp-mute">No models match "{query}"</p>}
              {access?.schoolRestricted && (
                <p className="mx-3 mb-2 mt-1 rounded-xl border border-lp-line bg-lp-surface/60 px-3 py-2 text-[11.5px] leading-snug text-lp-mute">
                  Your school chooses which models students can use. Ask your school admin to enable more.
                </p>
              )}
            </div>

            <div className="border-t border-lp-line bg-lp-surface/50 px-4 pb-4 pt-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">
                Reasoning <span className="text-lp-line">·</span> <span className="text-lp-soft">{effort ? EFFORT_LABELS[effort].label : "Instant"}</span>
              </p>
              {model.efforts.length ? (
                <>
                  <div role="radiogroup" aria-label="Reasoning level" className="mt-2 grid gap-1 rounded-2xl border border-lp-line bg-lp-deep/70 p-1" style={{ gridTemplateColumns: `repeat(${model.efforts.length}, minmax(0, 1fr))` }}>
                    {model.efforts.map((e) => (
                      <button
                        key={e}
                        type="button"
                        role="radio"
                        aria-checked={effort === e}
                        onClick={() => onChange({ model: model.id, effort: e })}
                        className={cn(
                          "h-9 rounded-xl text-[13px] font-medium transition-all",
                          effort === e ? "bg-lp-raised text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(124,180,255,0.3)]" : "text-lp-mute hover:text-white",
                        )}
                      >
                        {EFFORT_LABELS[e].label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-lp-mute">{effort ? EFFORT_LABELS[effort].hint : ""}</p>
                </>
              ) : (
                <p className="mt-2 rounded-xl border border-lp-line bg-lp-deep/70 px-3 py-2 text-[12px] text-lp-mute">
                  {model.name} answers straight away, without a reasoning step.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/** "Powered by ✦ Gemini 3.8 Flash · Low reasoning" under a reply. */
export const PoweredBy: React.FC<{ model: string; effort?: string | null; className?: string }> = ({ model, effort, className }) => {
  const m = findModel(model);
  const pick = pickFor(model);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-lp-mute", className)}>
      Powered by
      <ProviderGlyph provider={m?.provider ?? model.split("/")[0]} className="h-3.5 w-3.5" />
      <span className="text-lp-soft">{m?.name ?? model}</span>
      {pick && <span className="hidden sm:inline">({pick.name})</span>}
      {effort && EFFORT_LABELS[effort as Effort] && <span>· {EFFORT_LABELS[effort as Effort].label} reasoning</span>}
    </span>
  );
};
