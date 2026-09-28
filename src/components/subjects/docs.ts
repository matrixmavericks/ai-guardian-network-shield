import type { Subject, Topic, Unit } from "@/content/myp";

/** A topic's guide as a standalone Markdown document. */
export const topicMarkdown = (subject: Subject, unit: Unit, topic: Topic) =>
  [
    `# ${topic.title}`,
    `_${subject.name} (IB MYP) · ${unit.title}_`,
    topic.summary,
    topic.guide,
    "## Key terms",
    ...topic.keyTerms.map((k) => `- **${k.term}**: ${k.def}`),
  ].join("\n\n");

/** A unit cheatsheet: every topic's summary, key terms and quick facts. */
export const cheatsheetMarkdown = (subject: Subject, unit: Unit) =>
  [
    `# ${unit.title}: cheatsheet`,
    `_${subject.name} (IB MYP)_`,
    ...unit.topics.map((t) =>
      [
        `## ${t.title}`,
        t.summary,
        "**Key terms**",
        ...t.keyTerms.map((k) => `- **${k.term}**: ${k.def}`),
        "**Quick facts**",
        ...t.flashcards.map((f) => `- ${f.front} ${f.back}`),
      ].join("\n"),
    ),
  ].join("\n\n");

/**
 * Print an element on its own, with the app's styles, via a hidden iframe.
 * The browser's print dialog also offers "Save as PDF".
 */
export const printElement = (el: HTMLElement, title: string) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) return;
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join("");
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title>${styles}<style>@page{margin:14mm}html,body{background:#fff!important}body::before,body::after{display:none!important}</style></head><body>${el.outerHTML}</body></html>`,
  );
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
  // Give linked stylesheets a moment to load before printing.
  setTimeout(go, 400);
};
