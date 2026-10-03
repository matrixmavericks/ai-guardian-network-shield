import type { WalkthroughId } from "./useWalkthrough";

// The two recorded walkthroughs and their chapters (seconds from the start).

export type Chapter = { at: number; title: string; sub: string };
export type Video = { id: WalkthroughId; label: string; length: string; chapters: Chapter[] };

export const VIDEOS: Video[] = [
  {
    id: "students",
    label: "For students",
    length: "4 min 40 s",
    chapters: [
      { at: 0, title: "Getting started", sub: "Signing in, your overview and search" },
      { at: 36, title: "Your AI tutor", sub: "Guided help that makes you think" },
      { at: 84, title: "My subjects", sub: "Choose your subjects and study by topic" },
      { at: 144, title: "Learning paths", sub: "Step-by-step routes through a topic" },
      { at: 176, title: "Classes and assignments", sub: "Join a class and see what's due" },
      { at: 192, title: "Grades", sub: "Marks and goals for every subject" },
      { at: 210, title: "Portfolio", sub: "Projects that show what you can do" },
      { at: 226, title: "Messages", sub: "Chat with your teachers and classmates" },
      { at: 236, title: "Refyn Intelligence", sub: "Replay your thinking and plan ahead" },
      { at: 266, title: "Your way", sub: "Light or dark, and your settings" },
    ],
  },
  {
    id: "teachers",
    label: "For teachers",
    length: "7 min",
    chapters: [
      { at: 0, title: "Your Studio", sub: "Where you land every morning" },
      { at: 32, title: "Printables", sub: "Worksheets, tests and exit tickets, ready to print" },
      { at: 122, title: "Diagram lab", sub: "Accurate diagrams from a description" },
      { at: 156, title: "Your toolkit", sub: "Subject tools like the lab procedure designer" },
      { at: 188, title: "Library", sub: "Everything you've made, searchable" },
      { at: 202, title: "Every subject", sub: "Ideas and tools for each subject" },
      { at: 254, title: "Your classes", sub: "Hand-in queue, check-ins and class pulse" },
      { at: 292, title: "Marking", sub: "Keyboard-fast marking with saved comments" },
      { at: 316, title: "Planning", sub: "A full week's plan in one go" },
      { at: 338, title: "Your students", sub: "Messages with students and colleagues" },
      { at: 350, title: "AI and insights", sub: "Ask Refyn anything" },
      { at: 406, title: "Tell us", sub: "Send feedback straight from your Studio" },
    ],
  },
];

/** Where a chapter ends (the next chapter's start, or the end of the video). */
export const chapterEnd = (v: Video, i: number) => v.chapters[i + 1]?.at ?? (v.id === "students" ? 280 : 420);
