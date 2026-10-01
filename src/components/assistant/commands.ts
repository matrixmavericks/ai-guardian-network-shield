export type Command = {
  name: string;
  /** Shown after the name, e.g. "<title>" */
  args?: string;
  description: string;
  group: "Chat" | "Learning" | "Teaching" | "Mode" | "Go to";
  /** Only offered to this role */
  for?: "teacher" | "student";
  /** Needs text after the command, so selecting it waits for typing */
  takesInput?: boolean;
};

export const COMMANDS: Command[] = [
  { name: "new", description: "Start a fresh chat", group: "Chat" },
  { name: "rename", args: "<title>", description: "Rename this chat", group: "Chat", takesInput: true },
  { name: "files", description: "Open this chat's files and context library", group: "Chat" },
  { name: "export", description: "Download this chat as a Markdown file", group: "Chat" },
  { name: "archive", description: "Archive this chat and start a new one", group: "Chat" },
  { name: "compact", description: "Summarise this chat so far to keep answers focused", group: "Chat" },
  { name: "notes", description: "Turn this chat into study notes, saved to your Notebook", group: "Learning" },
  { name: "quiz", args: "[topic]", description: "Quiz me on this chat, or on a topic", group: "Learning", takesInput: true },
  { name: "hint", description: "Just the next hint, nothing more", group: "Learning" },
  { name: "explain", args: "<topic>", description: "Explain a topic in plain words, step by step", group: "Learning", takesInput: true },
  { name: "flashcards", args: "[topic]", description: "Flip cards to memorise a topic, or this chat", group: "Learning", takesInput: true },
  { name: "graph", args: "<function or idea>", description: "An interactive graph you can trace and change with sliders", group: "Learning", takesInput: true },
  { name: "plan", args: "[goal]", description: "A dated study plan around your real deadlines, ready for your calendar", group: "Learning", takesInput: true, for: "student" },
  { name: "due", description: "What's due, what's late and what to do first", group: "Learning", for: "student" },
  { name: "skills", description: "Browse and install skills", group: "Learning" },
  { name: "livequiz", args: "<topic>", description: "A quiz you can play live with a class", group: "Teaching", takesInput: true, for: "teacher" },
  { name: "assign", args: "<task>", description: "Write and set an assignment for one of your classes", group: "Teaching", takesInput: true, for: "teacher" },
  { name: "marking", description: "What's waiting to be marked and who's missing work", group: "Teaching", for: "teacher" },
  { name: "message", args: "<who and what>", description: "Draft a message to a student, ready to send", group: "Teaching", takesInput: true, for: "teacher" },
  { name: "chart", args: "[what]", description: "Chart your classes' results", group: "Teaching", takesInput: true, for: "teacher" },
  { name: "notebook", description: "Open your saved notes and plans", group: "Learning" },
  { name: "guided", description: "Guided mode: help me work it out", group: "Mode" },
  { name: "direct", description: "Direct mode: clear, detailed explanations", group: "Mode" },
  { name: "subject", args: "<general|math|writing|languages|science>", description: "Switch the subject", group: "Mode", takesInput: true },
  { name: "model", args: "<swift|core|sage|apex|name|low|medium|high>", description: "Switch the AI model or reasoning level", group: "Mode", takesInput: true },
  { name: "help", description: "List every command", group: "Mode" },
  { name: "dashboard", description: "Go to your dashboard", group: "Go to" },
  { name: "paths", description: "Go to your learning paths", group: "Go to" },
  { name: "portfolio", description: "Go to your portfolio", group: "Go to" },
  { name: "grades", description: "Go to your grades", group: "Go to" },
  { name: "messages", description: "Go to your messages", group: "Go to" },
];

/** The commands this person can use. */
export const commandsFor = (teacher: boolean) => COMMANDS.filter((c) => !c.for || c.for === (teacher ? "teacher" : "student"));

export const findCommand = (name: string, teacher = false) => commandsFor(teacher).find((c) => c.name === name.toLowerCase());

/** "/rename My chat" -> { cmd, arg: "My chat" } */
export const parseCommand = (text: string, teacher = false) => {
  const m = text.trim().match(/^\/([a-z-]+)\s*([\s\S]*)$/i);
  if (!m) return null;
  const cmd = findCommand(m[1], teacher);
  return cmd ? { cmd, arg: m[2].trim() } : null;
};
