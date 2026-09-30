import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DECK_FONT_URL, resolveTheme } from "./themes";
import { DECK_CSS, SLIDE_H, SLIDE_W, SlideView } from "./SlideView";
import type { Deck } from "./types";

/** Pixel-perfect PDF: every slide at full size, one per page, via the print dialog. */
export async function exportPdf(deck: Deck) {
  const t = resolveTheme(deck.design);
  const pages = deck.slides
    .map((s, i) => `<section class="page">${renderToStaticMarkup(<SlideView slide={s} theme={t} index={i} total={deck.slides.length} deckTitle={deck.title} />)}</section>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${deck.title.replace(/</g, "&lt;")}</title>
<link rel="stylesheet" href="${DECK_FONT_URL}">
<style>
@page { size: ${SLIDE_W}px ${SLIDE_H}px; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
.page { width: ${SLIDE_W}px; height: ${SLIDE_H}px; overflow: hidden; page-break-after: always; break-after: page; }
.page:last-child { page-break-after: auto; break-after: auto; }
${DECK_CSS}
</style></head><body>${pages}</body></html>`;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: `${SLIDE_W}px`, height: `${SLIDE_H}px`, border: "0", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  // Wait for fonts and images before printing
  await new Promise((r) => setTimeout(r, 300));
  await Promise.race([
    Promise.all([doc.fonts?.ready, ...Array.from(doc.images).map((img) => (img.complete ? null : new Promise((res) => { img.onload = img.onerror = res; })))]),
    new Promise((r) => setTimeout(r, 8000)),
  ]);
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  setTimeout(() => frame.remove(), 2000);
}
