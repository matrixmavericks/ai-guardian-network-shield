import type { DemoRole } from "./session";

/** How each side of the demo is described on the /demo and /tour pages. */
export const ROLE_INFO: Record<DemoRole, { label: string; who: string; image: string; blurb: string; points: string[] }> = {
  student: {
    label: "Student",
    who: "You'll be Aanya, an MYP 5 student",
    image: "/media/demo/student.webp",
    blurb: "A tutor that helps you think, every subject in one place, and a world that grows as you learn.",
    points: [
      "Ask the AI for an answer and see how it teaches you instead",
      "Watch your subject world grow as you master topics",
      "Play with simulations, revise in the focus room, read your feedback",
    ],
  },
  teacher: {
    label: "Teacher",
    who: "You'll be Maya, an MYP science teacher",
    image: "/media/demo/teacher.webp",
    blurb: "Your classes at a glance, marking that takes minutes, and a planning partner that knows your students.",
    points: [
      "See every class as a galaxy, with who needs a check-in",
      "Mark a queue of hand-ins with AI-drafted feedback",
      "Have Refyn write an exit ticket, a rubric or a lesson plan",
    ],
  },
};
