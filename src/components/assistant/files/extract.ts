import { supabase } from "@/integrations/supabase/client";
import { readDocx, readPptx, readXlsx, sheetsToText, parseCsv, toCsv } from "./office";

// Turns an uploaded file into text the assistant can read. Office files and
// PDFs are read in the browser; images and scanned PDF pages are transcribed
// once by the AI (the `describe` action) and kept as text in the library.

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TEXT_CHARS = 2_000_000;

export type Extracted = { text: string; pages?: number; note?: string; image?: string };

export type FileKind = "pdf" | "docx" | "xlsx" | "pptx" | "csv" | "image" | "text" | "unsupported";

const TEXT_EXT = /\.(txt|md|markdown|json|html?|xml|csv|tsv|rtf|tex|py|js|ts|tsx|jsx|java|c|cpp|cs|rb|go|rs|sql|yaml|yml|ini|log)$/i;

export const kindOf = (file: { name: string; type: string }): FileKind => {
  const n = file.name.toLowerCase();
  if (file.type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (/\.(xlsx|xlsm)$/.test(n)) return "xlsx";
  if (n.endsWith(".pptx")) return "pptx";
  if (/\.(csv|tsv)$/.test(n)) return "csv";
  if (/^image\/(png|jpe?g|webp|gif)$/.test(file.type) || /\.(png|jpe?g|webp|gif)$/.test(n)) return "image";
  if (file.type.startsWith("text/") || TEXT_EXT.test(n)) return "text";
  return "unsupported";
};

export const ACCEPT = ".pdf,.docx,.xlsx,.xlsm,.pptx,.csv,.tsv,.txt,.md,.json,.html,.htm,.xml,.rtf,.png,.jpg,.jpeg,.webp,.gif,.py,.js,.ts,.java,.c,.cpp,.sql,.yaml,.yml";

/** Downscale an image to a JPEG data URL the model can read cheaply. */
export async function imageToDataUrl(blob: Blob, max = 1600, quality = 0.85): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

/** Ask the AI to transcribe images (a photo, a scanned page). */
export async function describeImages(images: string[], name: string, sessionId: string | null): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-chat", { body: { action: "describe", images, name, sessionId } });
  if (error || !data?.success) throw new Error(data?.error || error?.message || "Couldn't read the image");
  return String(data.text || "");
}

async function readPdf(file: File, sessionId: string | null, onStatus?: (s: string) => void): Promise<Extracted> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  let chars = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      line += item.str ?? "";
      if (item.hasEOL) { lines.push(line); line = ""; }
    }
    if (line) lines.push(line);
    const text = lines.join("\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    pages.push(`## Page ${i}\n${text}`);
    chars += text.length;
    if (chars > MAX_TEXT_CHARS) break;
    if (i % 10 === 0) onStatus?.(`Reading page ${i} of ${doc.numPages}`);
  }
  // A scanned PDF has (almost) no text layer: transcribe the first pages instead
  if (chars < 60 * Math.min(doc.numPages, 10)) {
    const limit = Math.min(doc.numPages, 8);
    onStatus?.(`Transcribing ${limit} scanned page${limit === 1 ? "" : "s"}`);
    const images: string[] = [];
    for (let i = 1; i <= limit; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.8));
    }
    const out: string[] = [];
    for (let i = 0; i < images.length; i += 4) out.push(await describeImages(images.slice(i, i + 4), file.name, sessionId));
    return {
      text: out.join("\n\n"),
      pages: doc.numPages,
      note: doc.numPages > limit ? `Scanned PDF: the first ${limit} of ${doc.numPages} pages were transcribed.` : "Scanned PDF, transcribed.",
    };
  }
  return { text: pages.join("\n\n"), pages: doc.numPages };
}

export async function extractFile(file: File, sessionId: string | null, onStatus?: (s: string) => void): Promise<Extracted> {
  const kind = kindOf(file);
  let out: Extracted;
  switch (kind) {
    case "pdf":
      out = await readPdf(file, sessionId, onStatus);
      break;
    case "docx":
      out = { text: await readDocx(await file.arrayBuffer()) };
      break;
    case "xlsx": {
      const sheets = await readXlsx(await file.arrayBuffer());
      out = { text: sheetsToText(sheets), note: `${sheets.length} sheet${sheets.length === 1 ? "" : "s"}` };
      break;
    }
    case "pptx":
      out = { text: await readPptx(await file.arrayBuffer()) };
      break;
    case "csv": {
      const raw = await file.text();
      out = { text: file.name.toLowerCase().endsWith(".tsv") ? toCsv(raw.split(/\r?\n/).filter(Boolean).map((l) => l.split("\t"))) : toCsv(parseCsv(raw)) };
      break;
    }
    case "image": {
      onStatus?.("Reading the image");
      const image = await imageToDataUrl(file);
      out = { text: await describeImages([image], file.name, sessionId), image };
      break;
    }
    case "text":
      out = { text: await file.text() };
      break;
    default:
      throw new Error("This file type isn't supported yet. Try PDF, Word, Excel, PowerPoint, CSV, text or an image.");
  }
  let text = out.text.split(String.fromCharCode(0)).join("").trim();
  if (text.length > MAX_TEXT_CHARS) {
    text = text.slice(0, MAX_TEXT_CHARS);
    out.note = `${out.note ? `${out.note} ` : ""}Very long: the first ${(MAX_TEXT_CHARS / 1_000_000).toFixed(0)}M characters were kept.`;
  }
  if (!text) throw new Error("No readable text was found in this file.");
  return { ...out, text };
}

export const words = (chars: number) => Math.round(chars / 5.8);
export const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
