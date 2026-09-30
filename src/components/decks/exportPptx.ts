import { onColor, resolveTheme, type Theme } from "./themes";
import type { Deck, Slide } from "./types";

// Editable PowerPoint export (pptxgenjs, loaded on demand). Every text is a
// real text box; images are embedded; speaker notes (and quiz answers) go into
// the notes pane. Gradient backgrounds are painted to an image with canvas.

const W = 13.333;
const H = 7.5;
const px = (v: number) => (v / 1280) * W; // design px → inches
const pt = (v: number) => Math.round(v * 0.75); // design px → points

const parse = (css: string): { hex: string; alpha: number } => {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = "1"] = m[1].split(",").map((x) => x.trim());
    return { hex: [r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase(), alpha: Number(a) };
  }
  const h = css.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { hex: full.toUpperCase(), alpha };
};
const col = (css: string) => parse(css).hex;
const fill = (css: string) => {
  const { hex, alpha } = parse(css);
  return { color: hex, transparency: Math.round((1 - alpha) * 100) };
};

/** Paint the slide background (theme gradient, motif, or accent) to a JPEG (a lossless gradient runs to ~1 MB a slide). */
function paintBackground(t: Theme, accentSlide: boolean, index: number): string {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 720;
  const g = c.getContext("2d")!;
  if (accentSlide) {
    const lg = g.createLinearGradient(0, 0, 1280, 720);
    lg.addColorStop(0, t.accent);
    lg.addColorStop(1, t.accent2);
    g.fillStyle = lg;
    g.fillRect(0, 0, 1280, 720);
    return c.toDataURL("image/jpeg", 0.92);
  }
  g.fillStyle = t.bg;
  g.fillRect(0, 0, 1280, 720);
  const stops = t.bgCss.match(/#[0-9a-fA-F]{6}/g) ?? [];
  if (t.bgCss.startsWith("linear") && stops.length > 1) {
    const lg = g.createLinearGradient(0, 0, t.bgCss.includes("180deg") ? 0 : 1280, 720);
    stops.forEach((s, i) => lg.addColorStop(i / (stops.length - 1), s));
    g.fillStyle = lg;
    g.fillRect(0, 0, 1280, 720);
  } else if (t.bgCss.startsWith("radial") && stops.length > 1) {
    const at = t.bgCss.match(/at (\d+)% (\d+)%/);
    const cx = at ? (Number(at[1]) / 100) * 1280 : 1088, cy = at ? (Number(at[2]) / 100) * 720 : 72;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 900);
    rg.addColorStop(0, stops[0]);
    rg.addColorStop(0.6, stops[1]);
    rg.addColorStop(1, stops[1]);
    g.fillStyle = rg;
    g.fillRect(0, 0, 1280, 720);
  }
  const glow = (x: number, y: number, r: number, color: string, a: number) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `${color}${Math.round(a * 255).toString(16).padStart(2, "0")}`);
    rg.addColorStop(1, `${color}00`);
    g.fillStyle = rg;
    g.fillRect(0, 0, 1280, 720);
  };
  if (t.motif === "glow") glow(index % 2 ? 1170 : 50, 50, 330, t.accent, 0.33);
  if (t.motif === "blob") {
    glow(1180, 780, 280, t.accent2, 0.27);
    glow(1000 - (index % 3) * 40, -10, 230, t.accent, 0.25);
  }
  return c.toDataURL("image/jpeg", 0.92);
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const blob = await (await fetch(url)).blob();
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => res(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function buildPptx(deck: Deck) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;
  pptx.company = "Refyn";
  const t = resolveTheme(deck.design);
  const images = new Map<string, string | null>();
  await Promise.all(deck.slides.map(async (s) => { if (s.image?.url) images.set(s.id, await toDataUrl(s.image.url)); }));

  deck.slides.forEach((s: Slide, index) => {
    const slide = pptx.addSlide();
    const accentSlide = s.background === "accent";
    const img = images.get(s.id) ?? null;
    const imageBg = s.background === "image" && img && s.layout !== "image";
    const fg = accentSlide ? col(onColor(t.accent)) : imageBg ? "FFFFFF" : col(t.text);
    const muted = accentSlide ? col(onColor(t.accent)) : imageBg ? "E5E7EB" : col(t.muted);
    const accent = accentSlide ? fg : col(t.accent);
    const accent2 = accentSlide ? fg : col(t.accent2);
    const head = { fontFace: t.pptHeading, color: fg, bold: t.headingWeight >= 600 && !t.pptHeading.includes("Black") };
    const body = { fontFace: t.pptBody, color: fg };
    const surface = accentSlide ? { color: "FFFFFF", transparency: 84 } : fill(t.surface);
    const line = t.dark ? { color: "FFFFFF", transparency: 88, width: 0.75 } : { color: "0F172A", transparency: 90, width: 0.75 };

    if (imageBg && img) {
      slide.background = { data: img };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: "000000", transparency: 45 }, line: { type: "none" } });
    } else slide.background = { data: paintBackground(t, accentSlide, index) };
    if (t.motif === "rule" && !accentSlide && !imageBg && s.layout !== "image") slide.addShape(pptx.ShapeType.rect, { x: px(72), y: px(48), w: px(1136), h: px(3), fill: { color: col(t.accent) }, line: { type: "none" } });

    const title = (size: number, x: number, y: number, w: number, h: number, extra: Record<string, unknown> = {}) =>
      s.title && slide.addText(t.headingCase === "uppercase" ? s.title.toUpperCase() : s.title, { x: px(x), y: px(y), w: px(w), h: px(h), fontSize: pt(size), ...head, valign: "top", fit: "shrink", margin: 0, ...extra });
    const eyebrow = (x: number, y: number) =>
      s.eyebrow && slide.addText(s.eyebrow.toUpperCase(), { x: px(x), y: px(y), w: px(600), h: px(40), fontSize: 12, ...body, color: accent, bold: true, charSpacing: 2, margin: 0 });
    const picture = (x: number, y: number, w: number, h: number) =>
      img && slide.addImage({ data: img, x: px(x), y: px(y), w: px(w), h: px(h), sizing: { type: "cover", w: px(w), h: px(h) } });
    const bullets = (items: string[] | undefined, x: number, y: number, w: number, h: number, size: number, numbered = false) =>
      items?.length &&
      slide.addText(
        items.map((b) => ({ text: b, options: { bullet: numbered ? { type: "number" as const } : { code: "25C6" }, paraSpaceAfter: 10, color: fg } })),
        { x: px(x), y: px(y), w: px(w), h: px(h), fontSize: pt(size), ...body, valign: "top", margin: 0, fit: "shrink" },
      );

    switch (s.layout) {
      case "title":
        eyebrow(88, 150);
        title(s.image ? 72 : 92, 88, 200, s.image && !imageBg ? 620 : 1000, 260);
        if (s.subtitle) slide.addText(s.subtitle, { x: px(88), y: px(470), w: px(s.image && !imageBg ? 620 : 900), h: px(110), fontSize: pt(28), ...body, color: muted, valign: "top", margin: 0 });
        slide.addShape(pptx.ShapeType.rect, { x: px(88), y: px(600), w: px(96), h: px(6), fill: { color: accent }, line: { type: "none" } });
        if (!imageBg) picture(740, 80, 470, 560);
        break;
      case "section":
        slide.addShape(pptx.ShapeType.rect, { x: px(72), y: px(200), w: px(8), h: px(320), fill: { color: accent }, line: { type: "none" } });
        eyebrow(120, 210);
        title(96, 120, 260, 1000, 220);
        if (s.subtitle) slide.addText(s.subtitle, { x: px(120), y: px(480), w: px(820), h: px(90), fontSize: pt(30), ...body, color: muted, valign: "top", margin: 0 });
        break;
      case "bullets":
      case "closing": {
        const wText = s.image && !imageBg ? 620 : 1100;
        eyebrow(80, 50);
        title(s.layout === "closing" ? 62 : 52, 80, 84, wText, 140);
        bullets(s.bullets, 80, 250, wText, 380, s.image ? 26 : 29, s.layout === "bullets");
        if (!imageBg) picture(740, 84, 460, 546);
        break;
      }
      case "split": {
        const left = s.imageSide === "left";
        const tx = left ? 704 : 88;
        title(50, tx, 150, 490, 150);
        if (s.body) slide.addText(s.body, { x: px(tx), y: px(310), w: px(490), h: px(170), fontSize: pt(25), ...body, color: muted, valign: "top", margin: 0, fit: "shrink" });
        bullets(s.bullets, tx, 490, 490, 170, 23);
        if (!imageBg) picture(left ? 28 : 668, 28, 584, 664);
        break;
      }
      case "cards": {
        title(50, 72, 80, 1136, 110);
        const cards = s.cards ?? [];
        const gap = 24, cw = (1136 - gap * (cards.length - 1)) / Math.max(1, cards.length);
        cards.forEach((cd, i) => {
          const x = 72 + i * (cw + gap);
          slide.addShape(pptx.ShapeType.roundRect, { x: px(x), y: px(230), w: px(cw), h: px(400), fill: surface, line, rectRadius: 0.2 });
          slide.addShape(pptx.ShapeType.roundRect, { x: px(x + 32), y: px(262), w: px(60), h: px(60), fill: { color: i % 2 ? col(t.accent2) : col(t.accent), transparency: 80 }, line: { type: "none" }, rectRadius: 0.3 });
          slide.addText(String(i + 1), { x: px(x + 32), y: px(262), w: px(60), h: px(60), align: "center", valign: "middle", fontSize: 18, ...head, color: i % 2 ? accent2 : accent });
          slide.addText(cd.title, { x: px(x + 32), y: px(345), w: px(cw - 64), h: px(80), fontSize: pt(28), ...head, valign: "top", margin: 0, fit: "shrink" });
          slide.addText(cd.body, { x: px(x + 32), y: px(430), w: px(cw - 64), h: px(180), fontSize: pt(21), ...body, color: muted, valign: "top", margin: 0, fit: "shrink" });
        });
        break;
      }
      case "stats": {
        title(50, 80, 84, 1120, 110);
        const st = s.stats ?? [];
        const gap = 28, w = (1120 - gap * (st.length - 1)) / Math.max(1, st.length);
        st.forEach((x, i) => {
          const sx = 80 + i * (w + gap);
          slide.addShape(pptx.ShapeType.rect, { x: px(sx), y: px(260), w: px(w), h: px(4), fill: { color: i % 2 ? accent2 : accent }, line: { type: "none" } });
          slide.addText(x.value, { x: px(sx), y: px(284), w: px(w), h: px(120), fontSize: pt(st.length > 3 ? 76 : 96), ...head, color: i % 2 ? accent2 : accent, margin: 0, valign: "top", fit: "shrink" });
          slide.addText(x.label, { x: px(sx), y: px(410), w: px(w), h: px(110), fontSize: pt(23), ...body, color: muted, margin: 0, valign: "top" });
        });
        if (s.body) slide.addText(s.body, { x: px(80), y: px(560), w: px(1000), h: px(90), fontSize: pt(23), ...body, color: muted, margin: 0, valign: "top" });
        break;
      }
      case "quote":
        slide.addText("“", { x: px(130), y: px(90), w: px(200), h: px(180), fontSize: 150, ...head, color: accent, margin: 0 });
        if (s.quote) slide.addText(s.quote, { x: px(140), y: px(250), w: px(1000), h: px(240), fontSize: pt(50), ...head, bold: false, italic: t.pptHeading === "Georgia", valign: "top", margin: 0, fit: "shrink" });
        slide.addShape(pptx.ShapeType.rect, { x: px(140), y: px(528), w: px(44), h: px(3), fill: { color: accent }, line: { type: "none" } });
        if (s.by) slide.addText(s.by, { x: px(200), y: px(508), w: px(800), h: px(44), fontSize: pt(24), ...body, bold: true, margin: 0 });
        if (s.subtitle) slide.addText(s.subtitle, { x: px(200), y: px(556), w: px(800), h: px(60), fontSize: pt(20), ...body, color: muted, margin: 0 });
        break;
      case "steps": {
        title(50, 72, 80, 1136, 110);
        const steps = s.steps ?? [];
        const vertical = steps.length > 4;
        if (!vertical && steps.length) slide.addShape(pptx.ShapeType.line, { x: px(102), y: px(261), w: px(1076), h: 0, line: { color: accent, width: 2, transparency: 40 } });
        steps.forEach((x, i) => {
          const colw = vertical ? 544 : (1136 - 28 * (steps.length - 1)) / steps.length;
          const sx = vertical ? 72 + (i % 2) * (colw + 48) : 72 + i * (colw + 28);
          const sy = vertical ? 230 + Math.floor(i / 2) * 140 : 230;
          slide.addShape(pptx.ShapeType.ellipse, { x: px(sx), y: px(sy), w: px(60), h: px(60), fill: { color: col(t.accent) }, line: { type: "none" } });
          slide.addText(String(i + 1), { x: px(sx), y: px(sy), w: px(60), h: px(60), align: "center", valign: "middle", fontSize: 20, ...head, color: col(onColor(t.accent)) });
          const tx = vertical ? sx + 80 : sx, ty = vertical ? sy : sy + 84;
          slide.addText(x.title, { x: px(tx), y: px(ty), w: px(vertical ? colw - 80 : colw), h: px(44), fontSize: pt(26), ...head, margin: 0, valign: "top", fit: "shrink" });
          slide.addText(x.body, { x: px(tx), y: px(ty + 48), w: px(vertical ? colw - 80 : colw), h: px(vertical ? 80 : 200), fontSize: pt(20), ...body, color: muted, margin: 0, valign: "top", fit: "shrink" });
        });
        break;
      }
      case "compare": {
        title(50, 72, 80, 1136, 110);
        ([["left", accent, 72], ["right", accent2, 666]] as const).forEach(([k, c, x]) => {
          const v = s[k];
          slide.addShape(pptx.ShapeType.roundRect, { x: px(x), y: px(224), w: px(546), h: px(420), fill: surface, line, rectRadius: 0.15 });
          slide.addShape(pptx.ShapeType.rect, { x: px(x), y: px(224), w: px(546), h: px(6), fill: { color: c }, line: { type: "none" } });
          if (v?.heading) slide.addText(v.heading, { x: px(x + 36), y: px(254), w: px(474), h: px(56), fontSize: pt(32), ...head, color: c, margin: 0 });
          if (v?.points.length) slide.addText(v.points.map((p) => ({ text: p, options: { bullet: { code: "25CF" }, paraSpaceAfter: 8 } })), { x: px(x + 36), y: px(326), w: px(474), h: px(300), fontSize: pt(23), ...body, valign: "top", margin: 0, fit: "shrink" });
        });
        slide.addShape(pptx.ShapeType.ellipse, { x: px(608), y: px(402), w: px(64), h: px(64), fill: { color: t.dark ? col(t.bg) : "FFFFFF" }, line });
        slide.addText("VS", { x: px(608), y: px(402), w: px(64), h: px(64), align: "center", valign: "middle", fontSize: 14, ...head });
        break;
      }
      case "table": {
        title(48, 72, 80, 1136, 100);
        const cols = s.columns ?? [];
        const rows = [cols.map((h) => ({ text: h, options: { bold: true, color: accent, fill: { color: col(t.accent), transparency: 88 } } })), ...(s.rows ?? []).map((r) => cols.map((_, i) => ({ text: r[i] ?? "" })))];
        if (cols.length) slide.addTable(rows, { x: px(72), y: px(210), w: px(1136), fontFace: t.pptBody, fontSize: pt(20), color: fg, border: { type: "solid", pt: 0.5, color: t.dark ? "3A3F55" : "D5DAE3" }, fill: surface, margin: 0.12, autoPage: false });
        break;
      }
      case "question": {
        eyebrow(96, 84);
        const opts = s.options ?? [];
        if (s.question) slide.addText(s.question, { x: px(96), y: px(130), w: px(1088), h: px(opts.length ? 170 : 300), fontSize: pt(opts.length ? 50 : 64), ...head, valign: "top", margin: 0, fit: "shrink" });
        opts.forEach((o, i) => {
          const x = 96 + (i % 2) * 554, y = 340 + Math.floor(i / 2) * 120;
          slide.addShape(pptx.ShapeType.roundRect, { x: px(x), y: px(y), w: px(534), h: px(96), fill: surface, line, rectRadius: 0.2 });
          slide.addShape(pptx.ShapeType.roundRect, { x: px(x + 24), y: px(y + 25), w: px(46), h: px(46), fill: { color: col(t.accent) }, line: { type: "none" }, rectRadius: 0.25 });
          slide.addText(String.fromCharCode(65 + i), { x: px(x + 24), y: px(y + 25), w: px(46), h: px(46), align: "center", valign: "middle", fontSize: 16, ...head, color: col(onColor(t.accent)) });
          slide.addText(o, { x: px(x + 88), y: px(y + 10), w: px(420), h: px(76), fontSize: pt(24), ...body, valign: "middle", margin: 0, fit: "shrink" });
        });
        break;
      }
      case "image":
        if (img) slide.addImage({ data: img, x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H } });
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: px(520), w: W, h: px(200), fill: { color: "000000", transparency: 40 }, line: { type: "none" } });
        if (s.title) slide.addText(s.title, { x: px(80), y: px(548), w: px(1100), h: px(70), fontSize: pt(52), ...head, color: "FFFFFF", margin: 0 });
        if (s.subtitle) slide.addText(s.subtitle, { x: px(80), y: px(622), w: px(1100), h: px(50), fontSize: pt(24), ...body, color: "E5E7EB", margin: 0 });
        break;
    }

    if (s.layout !== "image" && s.layout !== "title") {
      // On split slides the footer stays in the text column, clear of the image
      const [fl, fr] = s.layout === "split" ? (s.imageSide === "left" ? [704, 1200] : [80, 576]) : [80, 1200];
      slide.addText(deck.title, { x: px(fl), y: px(678), w: px(Math.min(700, fr - fl - 90)), h: px(24), fontSize: 11, ...body, color: muted, margin: 0 });
      slide.addText(`${index + 1} / ${deck.slides.length}`, { x: px(fr - 200), y: px(678), w: px(200), h: px(24), fontSize: 11, ...body, color: muted, align: "right", margin: 0 });
    }
    const notes = [s.notes, s.layout === "question" && s.answer ? `Answer: ${s.answer}` : ""].filter(Boolean).join("\n\n");
    if (notes) slide.addNotes(notes);
  });

  return pptx;
}

export async function exportPptx(deck: Deck, fileName: string) {
  const pptx = await buildPptx(deck);
  await pptx.writeFile({ fileName: `${fileName}.pptx` });
}

/** The .pptx as a Blob (for Google Slides). */
export async function pptxBlob(deck: Deck): Promise<Blob> {
  const pptx = await buildPptx(deck);
  return (await pptx.write({ outputType: "blob" })) as Blob;
}
