// Refyn Slides: the deck model. The AI streams slides as JSON lines; every
// line goes through sanitizeSlide so the editor only ever sees valid slides.

export type LayoutId =
  | "title" | "section" | "bullets" | "split" | "cards" | "stats" | "quote"
  | "steps" | "compare" | "table" | "question" | "image" | "closing";

export type ImageState = "none" | "pending" | "generating" | "done" | "error";
export type SlideImage = { prompt: string; alt?: string; path?: string; url?: string; state: ImageState; error?: string };

export type Slide = {
  id: string;
  layout: LayoutId;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  cards?: { icon?: string; title: string; body: string }[];
  stats?: { value: string; label: string }[];
  quote?: string;
  by?: string;
  steps?: { title: string; body: string }[];
  left?: { heading: string; points: string[] };
  right?: { heading: string; points: string[] };
  columns?: string[];
  rows?: string[][];
  question?: string;
  options?: string[];
  answer?: string;
  image?: SlideImage;
  imageSide?: "left" | "right";
  background?: "default" | "accent" | "image";
  notes?: string;
};

export type DeckDesign = { theme: string; accent?: string; font?: string; imageStyle: string; images: boolean };
export type DeckBrief = { topic: string; slides: number; audience?: string; tone?: string; extra?: string; sessionId?: string | null };
export type Deck = { version: 1; title: string; subtitle?: string; design: DeckDesign; slides: Slide[]; brief?: DeckBrief };

export const LAYOUTS: { id: LayoutId; label: string; hint: string }[] = [
  { id: "title", label: "Cover", hint: "Title, subtitle and a hero image" },
  { id: "section", label: "Section", hint: "A big divider between parts" },
  { id: "bullets", label: "Points", hint: "A heading with key points" },
  { id: "split", label: "Image + text", hint: "Explanation beside an image" },
  { id: "cards", label: "Cards", hint: "Three or four ideas side by side" },
  { id: "stats", label: "Numbers", hint: "Big figures with labels" },
  { id: "quote", label: "Quote", hint: "A quotation to discuss" },
  { id: "steps", label: "Timeline", hint: "A process or sequence" },
  { id: "compare", label: "Compare", hint: "Two sides, point by point" },
  { id: "table", label: "Table", hint: "Rows and columns" },
  { id: "question", label: "Question", hint: "Quiz or discussion prompt" },
  { id: "image", label: "Full image", hint: "One image with a caption" },
  { id: "closing", label: "Closing", hint: "Summary or exit ticket" },
];

export const ICONS = [
  "lightbulb", "target", "book", "flask", "leaf", "globe", "users", "brain", "calculator", "clock", "map", "heart",
  "zap", "sun", "droplet", "star", "shield", "compass", "puzzle", "pencil", "message", "chart", "rocket", "music",
] as const;

export const IMAGE_STYLES = [
  { id: "photo", label: "Photo", prompt: "high-quality editorial photograph, natural light, shallow depth of field" },
  { id: "illustration", label: "Illustration", prompt: "clean modern editorial illustration, soft shading, cohesive palette" },
  { id: "watercolour", label: "Watercolour", prompt: "delicate watercolour painting, paper texture, gentle colours" },
  { id: "3d", label: "3D", prompt: "soft 3D render, clay style, studio lighting, pastel background" },
  { id: "flat", label: "Flat", prompt: "flat vector illustration, bold simple shapes, limited colour palette" },
  { id: "diagram", label: "Diagram", prompt: "clear scientific textbook diagram style, labelled parts drawn as shapes, white background" },
] as const;

export const newId = () => Math.random().toString(36).slice(2, 10);

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : typeof v === "number" ? String(v) : undefined);
const list = (v: unknown, max = 8, len = 220) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter((x): x is string => !!x).slice(0, max) : undefined);
const isLayout = (v: unknown): v is LayoutId => LAYOUTS.some((l) => l.id === v);

/** Coerce whatever the model produced into a valid slide. */
export function sanitizeSlide(raw: Record<string, unknown>, keep?: Slide): Slide {
  const r = raw ?? {};
  const layout: LayoutId = isLayout(r.layout) ? r.layout : keep?.layout ?? "bullets";
  const img = r.image as Record<string, unknown> | null | undefined;
  let image: SlideImage | undefined = keep?.image;
  if (img === null) image = undefined;
  else if (img && typeof img === "object" && str(img.prompt)) {
    const prompt = str(img.prompt, 600)!;
    image = keep?.image && keep.image.prompt === prompt ? keep.image : { prompt, alt: str(img.alt, 200), state: "pending" };
  }
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
  const slide: Slide = {
    id: keep?.id ?? (str(r.id, 40) || newId()),
    layout,
    eyebrow: str(r.eyebrow, 60),
    title: str(r.title, 140),
    subtitle: str(r.subtitle, 260),
    body: str(r.body, 700),
    bullets: list(r.bullets, 7, 220),
    cards: Array.isArray(r.cards)
      ? r.cards.map(obj).filter(Boolean).slice(0, 4).map((c) => ({ icon: str(c!.icon, 20), title: str(c!.title, 60) ?? "", body: str(c!.body, 220) ?? "" }))
      : undefined,
    stats: Array.isArray(r.stats) ? r.stats.map(obj).filter(Boolean).slice(0, 4).map((s) => ({ value: str(s!.value, 16) ?? "", label: str(s!.label, 90) ?? "" })) : undefined,
    quote: str(r.quote, 360),
    by: str(r.by, 90),
    steps: Array.isArray(r.steps) ? r.steps.map(obj).filter(Boolean).slice(0, 6).map((s) => ({ title: str(s!.title, 60) ?? "", body: str(s!.body, 200) ?? "" })) : undefined,
    left: obj(r.left) ? { heading: str(obj(r.left)!.heading, 60) ?? "", points: list(obj(r.left)!.points, 6, 160) ?? [] } : undefined,
    right: obj(r.right) ? { heading: str(obj(r.right)!.heading, 60) ?? "", points: list(obj(r.right)!.points, 6, 160) ?? [] } : undefined,
    columns: list(r.columns, 5, 40),
    rows: Array.isArray(r.rows) ? r.rows.filter(Array.isArray).slice(0, 7).map((row) => (row as unknown[]).slice(0, 5).map((c) => str(c, 90) ?? "")) : undefined,
    question: str(r.question, 300),
    options: list(r.options, 4, 120),
    answer: str(r.answer, 200),
    image,
    imageSide: r.imageSide === "left" || r.imageSide === "right" ? r.imageSide : keep?.imageSide,
    background: r.background === "accent" || r.background === "image" || r.background === "default" ? r.background : keep?.background,
    notes: str(r.notes, 1500),
  };
  for (const k of Object.keys(slide) as (keyof Slide)[]) if (slide[k] === undefined) delete slide[k];
  return slide;
}

export const blankSlide = (layout: LayoutId): Slide => {
  const base: Slide = { id: newId(), layout, title: "New slide" };
  switch (layout) {
    case "title": return { ...base, title: "Presentation title", subtitle: "Subtitle" };
    case "section": return { ...base, eyebrow: "Part 2", title: "Section title" };
    case "bullets": return { ...base, bullets: ["First point", "Second point", "Third point"] };
    case "split": return { ...base, body: "Explain the idea in a sentence or two.", image: { prompt: "", state: "none" } };
    case "cards": return { ...base, cards: [1, 2, 3].map((i) => ({ icon: ICONS[i], title: `Idea ${i}`, body: "One sentence about it." })) };
    case "stats": return { ...base, stats: [{ value: "72%", label: "Label" }, { value: "3×", label: "Label" }, { value: "1.5 m", label: "Label" }] };
    case "quote": return { ...base, title: undefined, quote: "A quotation worth discussing.", by: "Author" };
    case "steps": return { ...base, steps: [1, 2, 3, 4].map((i) => ({ title: `Step ${i}`, body: "What happens." })) };
    case "compare": return { ...base, left: { heading: "Option A", points: ["Point", "Point"] }, right: { heading: "Option B", points: ["Point", "Point"] } };
    case "table": return { ...base, columns: ["Column", "Column", "Column"], rows: [["", "", ""], ["", "", ""]] };
    case "question": return { ...base, eyebrow: "Check for understanding", title: undefined, question: "Your question here?", options: ["Option A", "Option B", "Option C", "Option D"] };
    case "image": return { ...base, subtitle: "Caption", image: { prompt: "", state: "none" } };
    case "closing": return { ...base, title: "Key takeaways", bullets: ["Takeaway one", "Takeaway two"] };
  }
};

/** Move shared content across when a slide changes layout. */
export const switchLayout = (s: Slide, layout: LayoutId): Slide => {
  const points = s.bullets ?? s.cards?.map((c) => `${c.title}: ${c.body}`) ?? s.steps?.map((x) => `${x.title}: ${x.body}`) ?? s.options ?? [];
  const next: Slide = { ...s, layout };
  if (["bullets", "closing"].includes(layout) && !next.bullets?.length) next.bullets = points.length ? points : blankSlide(layout).bullets;
  if (layout === "cards" && !next.cards?.length) next.cards = (points.length ? points : ["Idea one", "Idea two", "Idea three"]).slice(0, 4).map((p, i) => ({ icon: ICONS[i % ICONS.length], title: p.split(":")[0].slice(0, 40), body: p.includes(":") ? p.split(":").slice(1).join(":").trim() : "" }));
  if (layout === "steps" && !next.steps?.length) next.steps = (points.length ? points : ["First", "Then", "Finally"]).slice(0, 6).map((p) => ({ title: p.split(":")[0].slice(0, 40), body: p.includes(":") ? p.split(":").slice(1).join(":").trim() : "" }));
  if (["split", "image", "title"].includes(layout) && !next.image) next.image = { prompt: s.title ?? "", state: "none" };
  const blank = blankSlide(layout);
  for (const k of Object.keys(blank) as (keyof Slide)[]) if (next[k] === undefined && k !== "id") (next as Record<string, unknown>)[k] = blank[k];
  return next;
};
