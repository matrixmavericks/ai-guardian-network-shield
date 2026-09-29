import React from "react";
import { Markdown } from "@/components/subjects/kit";
import { DIAGRAM_SCHEMA, DiagramView } from "./diagrams";

/** Appended to tool prompts so answers can carry exact diagrams. */
export const DIAGRAM_FENCE_RULE = `When a figure would help, include it as a fenced code block whose language is "diagram" and whose body is ONLY the JSON object (no "diagram" key), for example:
\`\`\`diagram
{"kind":"triangle","a":5,"b":12,"c":13,"unit":"cm"}
\`\`\`
${DIAGRAM_SCHEMA.replace(/^DIAGRAMS:[^\n]*\n/, "Diagram shapes you can use:\n")}`;

/** Markdown with ```diagram blocks rendered as exact SVG figures. */
export const RichOutput: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const parts = text.split(/```diagram\s*\n?([\s\S]*?)```/g);
  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        if (i % 2 === 0) return part.trim() ? <Markdown key={i} source={part} /> : null;
        let spec: unknown = null;
        try {
          const raw = JSON.parse(part.trim());
          spec = raw && typeof raw === "object" && "diagram" in raw ? (raw as { diagram: unknown }).diagram : raw;
        } catch {
          spec = null;
        }
        return (
          <figure key={i} className="break-inside-avoid rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-4">
            <DiagramView spec={spec} accent={accent} className="mx-auto max-w-[480px]" />
          </figure>
        );
      })}
    </div>
  );
};
