import type { TourStep } from "@/demo/tours";
import type { DemoRole } from "@/demo/session";
import type { WalkthroughId } from "@/components/demo/useWalkthrough";

// The help centre's questions live in public/help/faq.json, so the page, the
// mini demos and the help assistant (an edge function) all read one copy.

export type HelpItem = {
  id: string;
  q: string;
  /** A short answer: plain text, with **bold** allowed. */
  a: string;
  who: "student" | "teacher" | "everyone";
  /** Extra words people might search with. */
  keywords?: string[];
  /** A clip from one of the walkthrough videos (seconds). */
  video?: { id: WalkthroughId; from: number; to: number };
  /** A mini demo: the page to open and a few steps to point things out. */
  demo?: { role: DemoRole; path: string; steps: TourStep[] };
};

export type HelpCategory = { id: string; title: string; blurb: string; items: HelpItem[] };
export type HelpData = { categories: HelpCategory[] };
