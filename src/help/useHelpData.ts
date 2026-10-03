import React, { useEffect, useState } from "react";
import type { HelpData } from "./types";

let cached: Promise<HelpData> | null = null;

/** The help centre's questions (public/help/faq.json), loaded once per visit. */
export const loadHelp = () =>
  (cached ??= fetch("/help/faq.json")
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<HelpData>;
    })
    .catch((e) => {
      cached = null;
      throw e;
    }));

export function useHelpData() {
  const [data, setData] = useState<HelpData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadHelp()
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { data, failed };
}

/** **bold** in help answers. */
export const Rich: React.FC<{ text: string }> = ({ text }) =>
  React.createElement(
    React.Fragment,
    null,
    ...text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") ? React.createElement("strong", { key: i, className: "font-semibold text-white" }, p.slice(2, -2)) : p,
    ),
  );
