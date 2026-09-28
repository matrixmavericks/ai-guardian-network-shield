export type Command = {
  name: string;
  /** Shown after the name, e.g. "<title>" */
  args?: string;
  description: string;
  group: "Chat" | "Learning" | "Mode" | "Go to";
  /** Needs text after the command, so selecting it waits for typing */
  takesInput?: boolean;
};

export const COMMANDS: Command[] = [
  { name: "new", description: "Start a fresh chat", group: "Chat" },
  { name: "rename", args: "<title>", description: "Rename this chat", group: "Chat", takesInput: true },
  { name: "export", description: "Download this chat as a Markdown file", group: "Chat" },
  { name: "archive", description: "Archive this chat and start a new one", group: "Chat" },
  { name: "compact", description: "Summarise this chat so far to keep answers focused", group: "Chat" },
  { name: "notes", description: "Turn this chat into study notes, saved to your Notebook", group: "Learning" },
  { name: "quiz", args: "[topic]", description: "Quiz me on this chat, or on a topic", group: "Learning", takesInput: true },
  { name: "hint", description: "Just the next hint, nothing more", group: "Learning" },
  { name: "explain", args: "<topic>", description: "Explain a topic in plain words, step by step", group: "Learning", takesInput: true },
  { name: "skills", description: "Browse and install skills", group: "Learning" },
  { name: "notebook", description: "Open your saved notes and plans", group: "Learning" },
  { name: "guided", description: "Guided mode: help me work it out", group: "Mode" },
  { name: "direct", description: "Direct mode: clear, detailed explanations", group: "Mode" },
  { name: "subject", args: "<general|math|writing|languages|science>", description: "Switch the subject", group: "Mode", takesInput: true },
  { name: "help", description: "List every command", group: "Mode" },
  { name: "dashboard", description: "Go to your dashboard", group: "Go to" },
  { name: "paths", description: "Go to your learning paths", group: "Go to" },
  { name: "portfolio", description: "Go to your portfolio", group: "Go to" },
  { name: "grades", description: "Go to your grades", group: "Go to" },
  { name: "messages", description: "Go to your messages", group: "Go to" },
];

export const findCommand = (name: string) => COMMANDS.find((c) => c.name === name.toLowerCase());

/** "/rename My chat" -> { cmd, arg: "My chat" } */
export const parseCommand = (text: string) => {
  const m = text.trim().match(/^\/([a-z-]+)\s*([\s\S]*)$/i);
  if (!m) return null;
  const cmd = findCommand(m[1]);
  return cmd ? { cmd, arg: m[2].trim() } : null;
};
