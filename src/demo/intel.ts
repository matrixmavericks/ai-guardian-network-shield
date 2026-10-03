/* eslint-disable @typescript-eslint/no-explicit-any -- reads the loose demo rows */
import type { Tables } from "./query";

// Pre-written results for the "Refyn Intelligence" tools and the lesson
// planner in the live demo, built from the demo's own classes and marks so
// they match what's on screen.

const pct = (s: any) => (s.grade == null ? null : (Number(s.grade) / Number(s.max_grade || 100)) * 100);
const first = (name: string) => name.split(" ")[0];

const roster = (t: Tables, classId: string) =>
  t.class_members
    .filter((m) => m.class_id === classId)
    .map((m) => {
      const name = t.profiles.find((p) => p.user_id === m.student_id)?.full_name ?? "Student";
      const marks = t.assignment_submissions.filter((s) => s.student_id === m.student_id).map(pct).filter((x): x is number => x !== null);
      const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null;
      return { id: m.student_id, name, avg };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

function autoIep(t: Tables, classId: string, topic: string) {
  const what = topic && topic !== "current lesson" ? topic : "today's lesson";
  return roster(t, classId)
    .slice(0, 8)
    .map(({ name, avg }) => {
      const n = first(name);
      if (avg !== null && avg < 65)
        return `### ${name}\n- **Reading:** a one-page summary of ${what} with the key words in bold and a labelled diagram.\n- **Example:** start from something ${n} has seen: a bike slowing down, a kettle boiling. Then name the science.\n- **Scaffold:** a fill-the-gaps worked example, then two near-identical questions to try alone.\n- **Watch for:** stopping after the first step; ask ${n} to say what the next step is before writing it.`;
      if (avg !== null && avg >= 80)
        return `### ${name}\n- **Reading:** the standard notes, plus one short extract from a real-world source on ${what}.\n- **Example:** an unusual case that breaks the simple rule, to explain in their own words.\n- **Stretch:** design a quick test of the idea and predict the result with numbers.\n- **Watch for:** rushing the explanation; ask for one sentence that would convince a sceptic.`;
      return `### ${name}\n- **Reading:** the class notes on ${what}, with two check questions in the margin.\n- **Example:** one worked example, then a similar question with different numbers.\n- **Scaffold:** sentence starters for the explanation (“This happens because…”).\n- **Stretch:** a final question that links ${what} to the previous topic.`;
    })
    .join("\n\n");
}

function parentBrief(t: Tables, classId: string) {
  const cls = t.classes.find((c) => c.id === classId)?.name ?? "class";
  return roster(t, classId)
    .slice(0, 6)
    .map(({ id, name }) => {
      const n = first(name);
      const recent = t.assignment_submissions.filter((s) => s.student_id === id).sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1))[0];
      const win = recent ? `${n} handed in their latest piece of work on time, and it shows real care.` : `${n} has settled into the new unit well this week.`;
      return `### ${name}\nHello! A quick note from ${cls} this week.\n\n**One win:** ${win}\n\n**One thing to grow:** showing every step of their working, so marks aren't lost on the way to a right answer.\n\n**One way to help at home:** ask ${n} to explain one idea from this week to you in two minutes, as if you'd never heard of it.\n\nThank you for your support,\nMaya Rao`;
    })
    .join("\n\n");
}

function futureSelf(career: string) {
  return `## Your future self
In three years you're a confident first-year student on the way to becoming a **${career}**, known for clear thinking and finished projects.

## Year 1
- Keep your science and maths averages above 80%: they open the most doors.
- Finish one personal project you can show someone.
- Read one article a month about the work a ${career.toLowerCase()} really does.

## Year 2
- Choose courses that lead towards ${career.toLowerCase()} and talk to someone who does the job.
- Enter one competition or challenge in the field.
- Start a portfolio piece that shows your process, not just the result.

## Year 3
- Lead a project with others and write up what you learned.
- Get feedback from a mentor on your portfolio.
- Apply with a clear story: what you've made and why it matters to you.

## Skill gaps
- **Explaining your reasoning** in writing, step by step.
- **Working to deadlines** on longer projects.

## This month's actions
- Pick one topic in your weakest subject and master it in Refyn this week.
- Spend 20 minutes on a small project linked to ${career.toLowerCase()}.
- Ask a teacher which skill would help you most, and add it to your plan.`;
}

const PEER = `## Where you stand
- **English:** well above the class average, one of your strongest subjects.
- **Physics:** above average, with your recent test a big step up.
- **Mathematics:** close to the class average.
- **History:** a little below average on source analysis.

## Your superpowers
- **Clear writing:** your explanations are easy to follow.
- **Bouncing back:** your marks rise after feedback.

## Growth edges
- **Source evaluation:** say what an author's purpose means for reliability.
- **Showing working:** in maths, write the step before the answer.

## Your next smart move
- Spend two short sessions on source evaluation this week, then ask Refyn to quiz you.`;

const RADAR = `## Trends
- Hand-ins across your classes are **up 6%** on last month.
- MYP 4 Sciences marks dip on **practical write-ups**, mostly in the evaluation section.
- Two students have gone quiet in the last ten days.

## High-risk students
### Dhruv Pillai
- Three pieces missing across two classes, and no hand-in for 12 days.
### Kabir Rao
- Asked for an extension; averaging 62% with a downward trend.

## Recommended this week
- A two-minute check-in with **Dhruv** before Friday's lesson.
- Give **Kabir** the extension with a mid-point check on Wednesday.
- Run a short evaluation workshop for MYP 4 Sciences: one model paragraph, then redraft.`;

const REPLAY = `## Your thinking journey
Over the last two weeks you moved from asking for definitions to asking *why* things happen, especially in physics and biology.

## Questions you asked
- What is the difference between osmosis and diffusion?
- How do I use the quadratic formula?
- Why does a heavier trolley accelerate less?

## Dead ends
- You tried to memorise F = ma without the units, then got stuck on a mass in grams.

## Breakthroughs
- You explained osmosis in your own words and got the potato question right first time.

## Your pattern
- You learn fastest when you try a question **before** reading the answer.

## Recommended next
- Try three quadratic questions without hints, then ask Refyn to check your working.`;

const CONFLICT = `## High-workload weeks
- **Next week:** three deadlines on Thursday (Physics lab report, Maths investigation, English draft).

## Topic overlaps
- Sciences and Maths both teach **graph gradients** in the same fortnight; agree on one method.

## Coverage gaps
- No practical work is planned in MYP 3 Sciences for the next four weeks.

## Recommended moves
- Move the Maths investigation deadline to the following Monday.
- Share one gradient worked example between Sciences and Maths.`;

/** The reply for a refyn-intelligence request in the demo. */
export function demoIntel(t: Tables, feature: string, params: Record<string, any> = {}): string {
  switch (feature) {
    case "auto_iep":
      return autoIep(t, String(params.classId ?? ""), String(params.topic ?? ""));
    case "parent_brief":
      return parentBrief(t, String(params.classId ?? ""));
    case "future_self":
      return futureSelf(String(params.career || "Software Engineer"));
    case "peer_compare":
      return PEER;
    case "at_risk_radar":
      return RADAR;
    case "thinking_replay":
      return REPLAY;
    case "curriculum_conflict":
      return CONFLICT;
    default:
      return "";
  }
}

/** A teaching plan for the planner page. */
export function demoPlan(body: Record<string, any>): string {
  const subject = body.subject || "Physics";
  const duration = body.duration || "1 week";
  return `# ${subject}: ${duration} plan

**Big question:** why does a moving object keep moving?
**Objectives:** state Newton's three laws; use F = ma; explain everyday motion with balanced and unbalanced forces.

## Lesson 1: Forces in balance
- **Starter (5 min):** a book on a table: which forces act on it?
- **Teach (15 min):** balanced and unbalanced forces, free-body diagrams.
- **Activity (20 min):** draw free-body diagrams for six everyday situations.
- **Exit ticket:** one diagram, one sentence.

## Lesson 2: F = ma
- **Starter:** push an empty and a full trolley: what's different?
- **Practical (25 min):** trolley, ramp and light gates; vary the force.
- **Practice:** five F = ma questions with rearranging.

## Lesson 3: Action and reaction
- **Demo:** balloon rocket.
- **Discussion:** why doesn't a book fall through the table?
- **Assessment:** short quiz, marked in class.

**Differentiation:** sentence starters and worked examples for support; a projectile challenge for stretch.
**Resources:** trolleys, light gates, balloons, string, the Forces simulation in Refyn.`;
}
