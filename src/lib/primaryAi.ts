import { supabase } from "@/integrations/supabase/client";

type Mode = "text" | "json";

interface CallArgs {
  prompt: string;
  gradeBand: string;
  theme?: string;
}

async function invokePlayground(args: CallArgs & { mode: Mode }) {
  const { data, error } = await supabase.functions.invoke("primary-playground", {
    body: {
      prompt: args.prompt,
      mode: args.mode,
      gradeBand: args.gradeBand,
      theme: args.theme || null,
    },
  });

  if (error) {
    // Supabase wraps non-2xx as FunctionsHttpError; try to surface the real message.
    let message = error.message || "The AI service is unavailable.";
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || "The AI service is unavailable.");
  return data;
}

/** Long-form teacher-facing text, guaranteed non-empty. */
export async function runPrimaryText(args: CallArgs): Promise<string> {
  const data = await invokePlayground({ ...args, mode: "text" });
  const reply = (data.reply || "").trim();
  if (!reply) throw new Error("The AI returned an empty response. Please try again.");
  return reply;
}

/**
 * Structured output. `validate` should throw (or return false) when the shape is
 * unusable — we then retry once with a stricter nudge before failing.
 */
export async function runPrimaryJson<T = any>(
  args: CallArgs & { validate?: (value: any) => T },
): Promise<T> {
  const attempt = async (extra: string): Promise<T> => {
    const data = await invokePlayground({
      ...args,
      prompt: args.prompt + extra,
      mode: "json",
    });
    const raw = data.data;
    if (raw == null) throw new Error("The AI response was empty. Please try again.");
    return args.validate ? args.validate(raw) : (raw as T);
  };

  try {
    return await attempt("");
  } catch (first) {
    try {
      return await attempt(
        "\n\nIMPORTANT: your previous attempt was invalid. Return ONLY the complete JSON object with every required key present and fully populated.",
      );
    } catch {
      throw first instanceof Error ? first : new Error("Could not generate this. Please try again.");
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Game payload normalizers — every game renders or we retry.                  */
/* -------------------------------------------------------------------------- */

const str = (v: any): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const strArray = (v: any): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : [];

/** Some models nest the payload one level deep — unwrap it. */
function unwrap(data: any, keys: string[]): any {
  if (!data || typeof data !== "object") return data;
  if (keys.some((k) => k in data)) return data;
  const nested = Object.values(data).find(
    (v) => v && typeof v === "object" && !Array.isArray(v) && keys.some((k) => k in (v as any)),
  );
  return nested ?? data;
}

export function normalizeGameData(gameId: string, input: any): any {
  const fail = (why: string) => {
    throw new Error(`This round came back incomplete (${why}). Try a new round.`);
  };

  switch (gameId) {
    case "word-wizard": {
      const d = unwrap(input, ["letters", "targetWords"]);
      const letters = strArray(d?.letters).map((l) => l.toUpperCase().slice(0, 2));
      const buildable = (word: string) => {
        const pool: Record<string, number> = {};
        letters.forEach((l) => (pool[l] = (pool[l] || 0) + 1));
        for (const ch of word.toUpperCase()) {
          if (!pool[ch]) return false;
          pool[ch]--;
        }
        return true;
      };
      const all = strArray(d?.targetWords ?? d?.words).map((w) => w.toUpperCase());
      // Drop words the letter pool can't actually spell — kids notice.
      const valid = all.filter(buildable);
      const targetWords = valid.length >= 3 ? valid : all;
      if (letters.length < 4 || targetWords.length < 3) fail("not enough letters or words");
      return {
        letters,
        targetWords,
        bonusWord: str(d?.bonusWord).toUpperCase() || undefined,
        theme: str(d?.theme) || undefined,
      };
    }

    case "number-ninja": {
      const d = unwrap(input, ["missions"]);
      const missions = (Array.isArray(d?.missions) ? d.missions : [])
        .map((m: any) => ({
          level: str(m?.level) || "Mission",
          question: str(m?.question ?? m?.prompt),
          answer: str(m?.answer),
          hint: str(m?.hint) || "Think about what you already know.",
        }))
        .filter((m: any) => m.question && m.answer);
      if (missions.length < 2) fail("too few missions");
      return { missions };
    }
    case "would-you-rather": {
      const d = unwrap(input, ["prompts"]);
      const prompts = (Array.isArray(d?.prompts) ? d.prompts : [])
        .map((p: any) => ({
          a: str(p?.a ?? p?.optionA),
          b: str(p?.b ?? p?.optionB),
          discussion: str(p?.discussion ?? p?.followUp) || "Why did you choose that? Convince a friend.",
        }))
        .filter((p: any) => p.a && p.b);
      if (prompts.length < 2) fail("too few prompts");
      return { prompts };
    }
    case "mystery-box": {
      const d = unwrap(input, ["clues", "answer"]);
      const clues = strArray(d?.clues);
      const answer = str(d?.answer);
      if (clues.length < 3 || !answer) fail("missing clues or answer");
      return { clues, answer, celebration: str(d?.celebration) || undefined };
    }
    case "kindness-quest": {
      const d = unwrap(input, ["missions"]);
      const missions = (Array.isArray(d?.missions) ? d.missions : [])
        .map((m: any) => ({
          title: str(m?.title),
          do: str(m?.do ?? m?.action),
          learnerProfile: str(
            Array.isArray(m?.learnerProfile) ? m.learnerProfile[0] : m?.learnerProfile,
          ) || "Caring",
          reflect: str(m?.reflect ?? m?.reflection) || "How did that make someone else feel?",
        }))
        .filter((m: any) => m.title && m.do);
      if (missions.length < 2) fail("too few missions");
      return { missions };
    }
    case "story-cubes": {
      const d = unwrap(input, ["character", "setting"]);
      const out = {
        character: str(d?.character),
        setting: str(d?.setting),
        object: str(d?.object),
        problem: str(d?.problem),
        twist: str(d?.twist),
        feeling: str(d?.feeling),
        challenge: str(d?.challenge) || "Tell the whole story to your partner in 60 seconds!",
      };
      const filled = [out.character, out.setting, out.object, out.problem, out.twist, out.feeling].filter(Boolean);
      if (filled.length < 5) fail("missing story cubes");
      return out;
    }
    default:
      return input;
  }
}

export interface WeekPlanShape {
  title: string;
  centralIdea: string;
  days: Array<Record<string, string>>;
  assessment: string;
  parentNote: string;
}

export function normalizeWeekPlan(input: any): WeekPlanShape {
  const d = unwrap(input, ["days", "centralIdea"]);
  const days = (Array.isArray(d?.days) ? d.days : [])
    .map((x: any, i: number) => ({
      day: str(x?.day) || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][i] || `Day ${i + 1}`,
      provocation: str(x?.provocation),
      focus: str(x?.focus),
      game: str(x?.game),
      gentle: str(x?.gentle),
      onLevel: str(x?.onLevel ?? x?.on_level),
      stretch: str(x?.stretch),
      materials: str(x?.materials),
    }))
    .filter((x: any) => x.focus || x.provocation);
  if (days.length < 3) throw new Error("The week plan came back incomplete. Try again.");
  return {
    title: str(d?.title) || "Week plan",
    centralIdea: str(d?.centralIdea ?? d?.central_idea),
    days,
    assessment: str(d?.assessment),
    parentNote: str(d?.parentNote ?? d?.parent_note),
  };
}

export function normalizeObservation(input: any) {
  const d = unwrap(input, ["evidence", "learnerProfile"]);
  const evidence = str(d?.evidence);
  if (!evidence) throw new Error("The observation came back empty. Try again.");
  return {
    evidence,
    learnerProfile: strArray(d?.learnerProfile ?? d?.learner_profile).slice(0, 3),
    nextStep: str(d?.nextStep ?? d?.next_step),
  };
}
