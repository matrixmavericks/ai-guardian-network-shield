import type { DemoRole } from "./session";

// The guided tours through the live demo. Each step opens a real page and
// points at a real part of it (elements marked with data-tour="…").

export type TourStep = {
  /** Page to open for this step (only if they aren't already on it). */
  path?: string;
  /** A data-tour name on that page. Without one the card sits on its own. */
  target?: string;
  title: string;
  body: string;
  /** Something to try, shown under the body. */
  hint?: string;
  /** Keep the card in the bottom-left corner (e.g. so it doesn't cover a chat reply). */
  dock?: "left";
};

const ask = (q: string) => `/ai-learning-assistant?prompt=${encodeURIComponent(q)}`;

export const TOURS: Record<DemoRole, TourStep[]> = {
  student: [
    {
      path: "/student-dashboard",
      target: "hero",
      title: "Your home base",
      body: "Hi, you're Aanya, an MYP 5 student. Your home page shows what's due, your streak and what to do next. The sky follows the time of day where you are.",
    },
    {
      path: "/student-dashboard",
      target: "world",
      title: "A world that grows as you learn",
      body: "Each building is one of your subjects. It's built up as far as you've mastered it, with a glowing blueprint for the rest. Practise, and you'll see it grow.",
      hint: "Try it: drag to turn the island, or click the observatory to open Physics.",
    },
    {
      path: "/student-dashboard",
      target: "search",
      title: "Jump anywhere",
      body: "Press Ctrl K (⌘K on a Mac) on any page to find a topic, a simulation or a tool in a couple of keystrokes.",
    },
    {
      path: ask("Can you just give me the answer to 3x + 7 = 22?"),
      target: "composer",
      dock: "left",
      title: "A tutor that teaches instead of telling",
      body: "We've typed a question for you. Press send and see what Refyn does when you ask it for the answer.",
      hint: "Then reply with your next step, like 3x = 15, or just type hint.",
    },
    {
      path: "/subjects/physics",
      target: "subject",
      title: "Every subject, ready to study",
      body: "Notes, practice questions with worked answers, flashcards and exam-style questions for each topic. Everything you get right here builds your world.",
    },
    {
      path: "/sims/projectile",
      target: "sim-controls",
      title: "See the idea move",
      body: "Change the angle, the speed or even the planet, and watch the path change. There are nearly 30 simulations across the sciences, maths and humanities.",
      hint: "Try it: find the angle that throws the furthest.",
    },
    {
      path: "/grades",
      target: "grades",
      title: "Feedback that tells you what's next",
      body: "Marks by subject, with your teachers' comments and a clear next step for every piece of work.",
    },
    {
      path: "/focus",
      title: "A focus room for revision",
      body: "Pick a length and a soundscape, and the timer keeps you on track. Every finished session counts towards your streak.",
    },
  ],
  teacher: [
    {
      path: "/dashboard",
      target: "hero",
      title: "Your teaching day at a glance",
      body: "Hi, you're Maya, an MYP science teacher with three classes. This page shows what's due, what's waiting to be marked and who needs a check-in.",
    },
    {
      path: "/dashboard",
      target: "ask",
      title: "Ask Refyn for anything",
      body: "Plan a lesson, differentiate a task, write a rubric or draft feedback. Refyn knows your classes, so you don't have to explain them.",
    },
    {
      path: "/dashboard",
      target: "galaxy",
      title: "Every student, at a glance",
      body: "Each planet is a class and each moon a student, coloured by who's on track. The ring shows the class's hand-in rate.",
      hint: "Try it: hover a red moon to see why, or click it to open that student.",
    },
    {
      path: "/marking",
      target: "draft",
      dock: "left",
      title: "Mark faster, in your own words",
      body: "Hand-ins arrive in one queue. Choose a tone and Refyn drafts feedback and a suggested mark from the student's own work. You edit it, then return it.",
      hint: "Try it: click a tone. J and K move between students, Ctrl Enter returns.",
    },
    {
      path: ask("Make a 3-question exit ticket on Newton's second law"),
      target: "composer",
      dock: "left",
      title: "Complete materials, answers included",
      body: "In teacher mode, Refyn writes the whole resource for you. We've typed a request; press send.",
    },
    {
      path: "/sims",
      target: "sims",
      title: "Show it, don't just say it",
      body: "Put a simulation on the board and change one thing at a time while the class predicts what will happen.",
    },
    {
      path: "/focus",
      title: "A calm timer for the board",
      body: "A full-screen countdown with gentle visuals for silent work, tests or tidy-up time.",
    },
  ],
};
