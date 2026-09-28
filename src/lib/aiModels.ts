// Chat models the app can call through the Lovable AI gateway.
// KEEP IN SYNC with supabase/functions/_shared/aiModels.ts (the edge function's copy).
//
// Source: docs.lovable.dev/integrations/ai (Sep 2026). Claude models are only
// offered to TanStack Start apps and GPT-5.x Pro can't do plain chat, so
// neither is listed. Prices are rough USD per 1M tokens, used only to estimate
// usage against quotas.

export type Effort = "low" | "medium" | "high";
export type Provider = "google" | "openai";

export interface AiModel {
  /** Gateway model id */
  id: string;
  name: string;
  provider: Provider;
  blurb: string;
  /** 1–5, for the picker's meters */
  speed: number;
  depth: number;
  /** Reasoning levels the model accepts; empty = instant (no reasoning control) */
  efforts: Effort[];
  defaultEffort?: Effort;
  /** How many earlier messages are sent with each question */
  memory: number;
  premium?: boolean;
  preview?: boolean;
  isNew?: boolean;
  /** Deprecated by the provider but still callable */
  legacy?: boolean;
  price: { input: number; output: number };
}

const ALL: Effort[] = ["low", "medium", "high"];

export const AI_MODELS: AiModel[] = [
  // Google Gemini
  { id: "google/gemini-3.8-flash", name: "Gemini 3.8 Flash", provider: "google", blurb: "Latest Flash. Fast and sharp for everyday study.", speed: 5, depth: 3, efforts: ALL, defaultEffort: "low", memory: 20, isNew: true, price: { input: 0.3, output: 2.5 } },
  { id: "google/gemini-3.7-flash", name: "Gemini 3.7 Flash", provider: "google", blurb: "Fast reasoning for most questions.", speed: 5, depth: 3, efforts: ALL, defaultEffort: "low", memory: 20, price: { input: 0.3, output: 2.5 } },
  { id: "google/gemini-3.6-flash", name: "Gemini 3.6 Flash", provider: "google", blurb: "Quick, reliable all-rounder.", speed: 5, depth: 3, efforts: ALL, defaultEffort: "low", memory: 20, price: { input: 0.3, output: 2.5 } },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", provider: "google", blurb: "Long, careful reasoning for hard problems.", speed: 2, depth: 5, efforts: ALL, defaultEffort: "medium", memory: 30, premium: true, preview: true, price: { input: 2, output: 12 } },
  { id: "google/gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "google", blurb: "Instant answers to quick questions.", speed: 5, depth: 1, efforts: [], memory: 10, price: { input: 0.1, output: 0.4 } },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "google", blurb: "Responsive general-purpose chat.", speed: 5, depth: 2, efforts: ALL, defaultEffort: "low", memory: 20, preview: true, price: { input: 0.5, output: 3 } },
  { id: "google/gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "google", blurb: "Earlier 3.x Flash.", speed: 5, depth: 3, efforts: ALL, defaultEffort: "low", memory: 20, legacy: true, price: { input: 0.3, output: 2.5 } },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", blurb: "Deep reasoning, previous generation.", speed: 2, depth: 4, efforts: ALL, defaultEffort: "medium", memory: 30, premium: true, legacy: true, price: { input: 1.25, output: 10 } },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", blurb: "Balanced speed and quality, previous generation.", speed: 4, depth: 2, efforts: ALL, defaultEffort: "low", memory: 20, legacy: true, price: { input: 0.3, output: 2.5 } },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "google", blurb: "Lowest cost, previous generation.", speed: 5, depth: 1, efforts: [], memory: 10, legacy: true, price: { input: 0.1, output: 0.4 } },

  // OpenAI GPT
  { id: "openai/gpt-6-astra", name: "GPT-6 Astra", provider: "openai", blurb: "OpenAI's most capable model. Research-grade reasoning.", speed: 1, depth: 5, efforts: ALL, defaultEffort: "medium", memory: 40, premium: true, isNew: true, price: { input: 5, output: 40 } },
  { id: "openai/gpt-6-sol", name: "GPT-6 Sol", provider: "openai", blurb: "Deep analysis for tough, multi-step problems.", speed: 3, depth: 4, efforts: ALL, defaultEffort: "medium", memory: 30, isNew: true, price: { input: 1.5, output: 12 } },
  { id: "openai/gpt-6-luna", name: "GPT-6 Luna", provider: "openai", blurb: "Fast, low-cost GPT-6 for everyday help.", speed: 5, depth: 2, efforts: ALL, defaultEffort: "low", memory: 20, isNew: true, price: { input: 0.2, output: 1.6 } },
  { id: "openai/gpt-5.6-sol", name: "GPT-5.6 Sol", provider: "openai", blurb: "Flagship 5.6 for the hardest reasoning.", speed: 2, depth: 5, efforts: ALL, defaultEffort: "medium", memory: 30, premium: true, preview: true, price: { input: 3, output: 24 } },
  { id: "openai/gpt-5.6-terra", name: "GPT-5.6 Terra", provider: "openai", blurb: "Balanced 5.6 for everyday work.", speed: 4, depth: 3, efforts: ALL, defaultEffort: "low", memory: 20, preview: true, price: { input: 1, output: 8 } },
  { id: "openai/gpt-5.6-luna", name: "GPT-5.6 Luna", provider: "openai", blurb: "Fast, low-cost 5.6.", speed: 5, depth: 2, efforts: ALL, defaultEffort: "low", memory: 10, preview: true, price: { input: 0.15, output: 1.2 } },
  { id: "openai/gpt-5.5", name: "GPT-5.5", provider: "openai", blurb: "Complex reasoning over long material.", speed: 2, depth: 5, efforts: ALL, defaultEffort: "medium", memory: 30, premium: true, price: { input: 2, output: 16 } },
  { id: "openai/gpt-5.4", name: "GPT-5.4", provider: "openai", blurb: "Strong reasoning for detailed questions.", speed: 3, depth: 4, efforts: ALL, defaultEffort: "medium", memory: 30, price: { input: 1.25, output: 10 } },
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 Mini", provider: "openai", blurb: "Mid-level reasoning at lower cost.", speed: 4, depth: 3, efforts: ALL, defaultEffort: "low", memory: 20, price: { input: 0.25, output: 2 } },
  { id: "openai/gpt-5.4-nano", name: "GPT-5.4 Nano", provider: "openai", blurb: "Quick summaries and simple answers.", speed: 5, depth: 1, efforts: ["low"], defaultEffort: "low", memory: 10, price: { input: 0.05, output: 0.4 } },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", provider: "openai", blurb: "Cheapest, fastest GPT-5.", speed: 5, depth: 1, efforts: ["low"], defaultEffort: "low", memory: 10, price: { input: 0.05, output: 0.4 } },
  { id: "openai/chat-latest", name: "Chat Latest", provider: "openai", blurb: "ChatGPT's conversational model. Answers without reasoning first.", speed: 5, depth: 2, efforts: [], memory: 20, price: { input: 1.25, output: 10 } },
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "openai", blurb: "Analytical reasoning, previous generation.", speed: 3, depth: 4, efforts: ALL, defaultEffort: "medium", memory: 30, legacy: true, price: { input: 1.75, output: 14 } },
  { id: "openai/gpt-5", name: "GPT-5", provider: "openai", blurb: "High-quality reasoning, previous generation.", speed: 3, depth: 4, efforts: ALL, defaultEffort: "medium", memory: 30, legacy: true, price: { input: 1.25, output: 10 } },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "openai", blurb: "Balanced speed and cost, previous generation.", speed: 4, depth: 3, efforts: ALL, defaultEffort: "low", memory: 20, legacy: true, price: { input: 0.25, output: 2 } },
];

export const DEFAULT_MODEL = "google/gemini-3.8-flash";

/** Known-good models to fall back to if the chosen one isn't available on the gateway. */
export const FALLBACK_MODELS = ["google/gemini-3.8-flash", "google/gemini-3-flash-preview", "google/gemini-2.5-flash"];

/** Plans that can't use premium-priced models. */
export const BASIC_PLANS = ["starter", "standard"];

const ALIASES: Record<string, string> = {
  "google/gemini-3-flash": "google/gemini-3-flash-preview",
  "google/gemini-3.1-flash-lite-preview": "google/gemini-3.1-flash-lite",
};

export const normalizeModel = (id?: string | null) => (id ? ALIASES[id] ?? id : id) || "";

export const findModel = (id?: string | null) => AI_MODELS.find((m) => m.id === normalizeModel(id));

/** Refyn's own picks, shown first in the picker. */
export const REFYN_PICKS = [
  { key: "swift", name: "Refyn Swift", model: "google/gemini-3.1-flash-lite", tagline: "Instant replies for quick questions" },
  { key: "core", name: "Refyn Core", model: "google/gemini-3.8-flash", tagline: "Fast, balanced everyday tutoring" },
  { key: "sage", name: "Refyn Sage", model: "openai/gpt-6-sol", tagline: "Deeper analysis for tough calls" },
  { key: "apex", name: "Refyn Apex", model: "google/gemini-3.1-pro-preview", tagline: "Top reasoning for high-stakes work" },
];

export const EFFORT_LABELS: Record<Effort, { label: string; hint: string }> = {
  low: { label: "Low", hint: "Quick replies" },
  medium: { label: "Medium", hint: "Thinks it through" },
  high: { label: "High", hint: "Most thorough, slower and uses more tokens" },
};
