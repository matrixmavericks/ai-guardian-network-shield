import type { DemoRole } from "./session";

// The guided tours through the live demo, in chapters. Each step opens a real
// page and can point at a real part of it.
//
// `target` is one of:
//   "name"               an element marked data-tour="name"
//   "text:Heading"       the element whose text is exactly "Heading"
//   "text:Heading|card"  ...or the card around it ("|item" for the list item)
//   "css:selector"       the first visible match
// Steps without a target leave the whole page visible.

export type TourStep = {
  /** Page to open for this step (only if they aren't already on it). */
  path?: string;
  target?: string;
  title: string;
  body: string;
  /** Something to try, shown under the body. */
  hint?: string;
  /** Keep the card in the bottom-left corner (e.g. so it doesn't cover a chat reply). */
  dock?: "left";
};
export type TourChapter = { title: string; steps: TourStep[] };

const ask = (q: string) => `/ai-learning-assistant?prompt=${encodeURIComponent(q)}`;

export const TOURS: Record<DemoRole, TourChapter[]> = {
  student: [
    {
      title: "Your home",
      steps: [
        {
          path: "/student-dashboard",
          target: "hero",
          title: "Your home base",
          body: "Hi, you're Aanya, an MYP 5 student. Your home page shows what's due, your streak and what to do next. The sky follows the time of day where you are.",
          hint: "Use the chapter list (top right of this card) to skip ahead at any time.",
        },
        {
          path: "/student-dashboard",
          target: "world",
          title: "A world that grows as you learn",
          body: "Each building is one of your subjects. It's built up as far as you've mastered it, with a glowing blueprint for the rest.",
          hint: "Drag to turn the island, or click the observatory to open Physics.",
        },
        {
          path: "/student-dashboard",
          target: "next-floor",
          title: "Your next floor",
          body: "Refyn picks the subject closest to its next level, so a few minutes of practice always moves something forward.",
        },
        {
          path: "/student-dashboard",
          target: "dash-tabs",
          title: "Everything a tab away",
          body: "Your plan, assignments, progress, messages and quizzes all live here, without leaving the page.",
        },
        {
          path: "/student-dashboard",
          target: "search",
          title: "Jump anywhere",
          body: "Press Ctrl K (⌘K on a Mac) on any page to find a topic, a simulation or a tool in a couple of keystrokes. It even does quick sums.",
        },
      ],
    },
    {
      title: "Your AI tutor",
      steps: [
        {
          path: ask("Can you just give me the answer to 3x + 7 = 22?"),
          target: "composer",
          dock: "left",
          title: "A tutor that teaches instead of telling",
          body: "We've typed a question for you. Press send and see what Refyn does when you ask it for the answer.",
          hint: "Then reply with your next step, like 3x = 15, or just type hint.",
        },
        {
          target: "guided",
          dock: "left",
          title: "Guided or direct",
          body: "Guided mode is on by default: Refyn helps you work it out. Switch it off when you just want a clear explanation.",
        },
        {
          target: "context",
          dock: "left",
          title: "It knows your week",
          body: "With My Refyn on, the tutor can see your classes, deadlines and grades, so “what should I do first?” gets a real answer.",
        },
      ],
    },
    {
      title: "Study",
      steps: [
        {
          path: "/my-courses",
          target: "text:Change subjects",
          title: "Your subjects",
          body: "Every MYP subject you take, with how far you've got in each. Pick the ones you study and the rest stay out of the way.",
        },
        {
          path: "/subjects/physics",
          target: "subject",
          title: "One place per subject",
          body: "Notes, practice, flashcards, exam questions and your mistakes log, with your mastery at the top.",
        },
        {
          path: "/subjects/physics/topic/phy-newton",
          target: "topic-steps",
          title: "Learn a topic step by step",
          body: "Read it, see a worked example, learn the key terms, try a quick check, then exam practice. Each step ticks off as you go.",
        },
        {
          path: "/subjects/physics/flashcards",
          target: "css:button[aria-label='Show answer']",
          title: "Flashcards that remember",
          body: "Flip a card, then say honestly whether you knew it. The cards you're still learning keep coming back.",
          hint: "Try it: click the card.",
        },
        {
          path: "/subjects/physics/exam",
          target: "text:Start exam|card",
          title: "Build a practice exam",
          body: "Pick topics, how many questions and a time limit. Refyn marks it when you submit and adds what you got wrong to your mistakes log.",
        },
      ],
    },
    {
      title: "Classes and work",
      steps: [
        {
          path: "/classes",
          target: "text:Join a class|card",
          title: "Join a class in seconds",
          body: "Type the six-character code from your teacher. Each class card shows what's due next.",
        },
        {
          path: "/task/demo-a1",
          target: "text:Hand in",
          title: "Every assignment in one place",
          body: "The task, your teacher's instructions, resources and how it's marked. Hand in a file or write straight into Refyn.",
        },
        {
          path: "/grades",
          target: "grades",
          title: "Feedback that tells you what's next",
          body: "Marks by subject, with your teachers' comments and a clear next step for every piece of work.",
        },
        {
          path: "/progress",
          title: "How you're moving, criterion by criterion",
          body: "Your levels on each MYP criterion over time, so you can see exactly which skill to work on next.",
        },
      ],
    },
    {
      title: "Explore and create",
      steps: [
        {
          path: "/sims/projectile",
          target: "sim-controls",
          title: "See the idea move",
          body: "Change the angle, the speed or even the planet, and watch the path change. There are nearly 30 simulations across the sciences, maths and humanities.",
          hint: "Try it: find the angle that throws the furthest.",
        },
        {
          path: "/brain",
          title: "Your brain, mapped",
          body: "Everything you've studied, asked and made, linked by idea. Click a star to see what it connects to.",
        },
        {
          path: "/gems",
          target: "css:.sp-cover",
          title: "Gems: your own helpers",
          body: "Make a mini assistant for one job, like a quiz master or an essay coach, or use one your teacher shared.",
        },
        {
          path: "/worlds",
          target: "css:.sp-cover",
          title: "A world for every unit",
          body: "Notes, flashcards and tasks in one place, with role-play scenes: interview a scientist or argue in a treaty room.",
        },
        {
          path: "/portfolio",
          target: "text:New project",
          title: "Show what you can do",
          body: "Build projects with your process, reflections and media, and share a link when you're proud of it.",
        },
        {
          path: "/assessment-coach",
          target: "text:Drop your lab report, essay or task|card",
          title: "Feedback before you hand in",
          body: "Upload a draft and get notes on your own document, strand by strand against the real MYP criteria.",
        },
      ],
    },
    {
      title: "Look ahead",
      steps: [
        {
          path: "/intel/future-self",
          target: "run",
          title: "Meet your future self",
          body: "Pick a career and Refyn builds a three-year roadmap from your subjects and marks: what to do each year and this month.",
          hint: "Try it: pick a career, then press Build my roadmap.",
        },
        {
          path: "/intel/peer-compare",
          target: "run",
          title: "Where you stand",
          body: "An anonymous comparison with your class: your superpowers, your growth edges and one smart next move. No names, no rankings.",
          hint: "Try it: press Show my benchmark.",
        },
        {
          path: "/messages",
          target: "text:Maya Rao|item",
          title: "Message your teachers",
          body: "Ask a quick question without waiting for the next lesson. Your teacher's reply is waiting.",
          hint: "Try it: open the conversation and reply.",
        },
        {
          path: "/focus",
          title: "A focus room for revision",
          body: "Pick a length and a soundscape, and the timer keeps you on track. Every finished session counts towards your streak.",
        },
      ],
    },
  ],
  teacher: [
    {
      title: "Your day",
      steps: [
        {
          path: "/dashboard",
          target: "hero",
          title: "Your teaching day at a glance",
          body: "Hi, you're Maya, an MYP science teacher with three classes. This page shows what's due, what's waiting to be marked and who needs a check-in.",
          hint: "Use the chapter list (top right of this card) to skip ahead at any time.",
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
          path: "/dashboard",
          target: "text:Marking queue|card",
          title: "Your marking queue",
          body: "Everything handed in and waiting, oldest first. Start marking straight from here.",
        },
        {
          path: "/dashboard",
          target: "text:Students to check on|card",
          title: "Who needs a check-in",
          body: "Students with missing work, falling marks or a quiet spell, with the reason spelled out and a one-click message.",
        },
      ],
    },
    {
      title: "Classes",
      steps: [
        {
          path: "/classes",
          target: "text:Create class",
          title: "Set up a class in a minute",
          body: "Create a class and share its six-character join code. Students join themselves, so there are no lists to upload.",
        },
        {
          path: "/class/demo-c1",
          target: "class-tabs",
          title: "Everything about one class",
          body: "Students, assignments, analytics, resources, linked courses and live quizzes, all on one page.",
        },
      ],
    },
    {
      title: "Assignments and marking",
      steps: [
        {
          path: "/task/new",
          target: "text:The basics|card",
          title: "Set a task",
          body: "Instructions, the task itself, resources and how it's marked, including MYP criteria with your own clarifications.",
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
          path: "/marking-copilot",
          target: "text:New marking set",
          title: "Mark a whole class set",
          body: "Drop in a stack of PDFs or Word files. Refyn pre-marks them against the MYP criteria; you moderate, approve and send.",
        },
        {
          path: "/grades",
          target: "css:table",
          title: "A gradebook that fills itself",
          body: "Every student and every piece of work in one grid, with averages, hand-in rates and missing work flagged. Export to CSV any time.",
        },
        {
          path: "/progress",
          title: "Class progress by criterion",
          body: "See which MYP criteria a class is moving on, and who's slipping, before the report card does.",
        },
      ],
    },
    {
      title: "Planning and resources",
      steps: [
        {
          path: "/teacher-plan-generator",
          target: "text:Plan Parameters|card",
          title: "Plan a week in one go",
          body: "Describe the unit and Refyn drafts a full plan: objectives, lessons, activities and checks.",
          hint: "Try it: pick a subject and press Generate plan.",
        },
        {
          path: ask("Make a 3-question exit ticket on Newton's second law"),
          target: "composer",
          dock: "left",
          title: "Complete materials, answers included",
          body: "In teacher mode, Refyn writes the whole resource for you. We've typed a request; press send.",
        },
        {
          path: "/decks",
          target: "css:textarea",
          title: "Presentations from a sentence",
          body: "Describe a lesson and get designed slides with images and speaker notes, ready to edit or export to PowerPoint.",
        },
        {
          path: "/past-papers",
          title: "Your past papers, put to work",
          body: "Add your school's past papers and mark schemes, and Refyn cites them when it writes tests, worksheets and revision.",
        },
        {
          path: "/my-courses",
          title: "Courses for every MYP subject",
          body: "Study guides, worked examples and exam practice for each subject. Link a class to a course to follow each student topic by topic.",
        },
      ],
    },
    {
      title: "Insights",
      steps: [
        {
          path: "/intel/at-risk-radar",
          target: "run",
          title: "Spot who's slipping",
          body: "Refyn reads missing work, averages and recent drops across your classes and tells you who to see this week.",
          hint: "Try it: press Scan the cohort.",
        },
        {
          path: "/intel/auto-iep",
          target: "run",
          title: "Differentiate a lesson",
          body: "Choose a class and a topic, and Refyn writes support, core and stretch versions for every student from their marks.",
          hint: "Try it: choose MYP 4 Sciences, add a topic, then press Differentiate.",
        },
        {
          path: "/intel/parent-brief",
          target: "run",
          title: "Notes home, written for you",
          body: "A short, warm note for each family: one win, one thing to grow, one way to help at home. You check it before it goes.",
          hint: "Try it: choose a class and press Draft this week's notes.",
        },
        {
          path: "/intel/curriculum-conflict",
          target: "run",
          title: "No more deadline pile-ups",
          body: "See where deadlines bunch up across the school and get suggested moves before students are swamped.",
        },
      ],
    },
    {
      title: "In the classroom",
      steps: [
        {
          path: "/sims",
          target: "sims",
          title: "Show it, don't just say it",
          body: "Put a simulation on the board and change one thing at a time while the class predicts what will happen.",
        },
        {
          path: "/messages",
          target: "text:Kabir Rao|item",
          title: "Messages with students",
          body: "Quick questions get quick answers. Kabir is asking for an extension.",
        },
        {
          path: "/focus",
          title: "A calm timer for the board",
          body: "A full-screen countdown with gentle visuals for silent work, tests or tidy-up time.",
        },
      ],
    },
  ],
};

/** All of a role's steps in order, each with its chapter. */
export const tourSteps = (role: DemoRole) => TOURS[role].flatMap((c, ci) => c.steps.map((s) => ({ ...s, chapter: ci })));
