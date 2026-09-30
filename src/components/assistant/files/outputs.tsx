import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { splitSheets, toCsv, writeXlsx, type Sheet } from "./office";

// Files the assistant makes. The model writes each one as
//   <<<FILE name="Worksheet.docx">>> … <<<END FILE>>>
// with markdown (documents) or CSV (spreadsheets) inside, and the chat turns it
// into a card with downloads and Google Drive export.

export type FileFormat = "docx" | "pdf" | "md" | "xlsx" | "csv";
export type OutputFile = { name: string; base: string; format: FileFormat; kind: "document" | "sheet"; content: string };
export type DeckSpec = { title: string; slides: number; audience?: string; brief: string };
export type Segment = { type: "text"; text: string } | { type: "file"; file: OutputFile; complete: boolean } | { type: "deck"; deck: DeckSpec };

const FORMATS: FileFormat[] = ["docx", "pdf", "md", "xlsx", "csv"];

export const fileFrom = (rawName: string, content: string): OutputFile => {
  const name = rawName.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "Refyn file.docx";
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  const format: FileFormat = (FORMATS as string[]).includes(ext) ? (ext as FileFormat) : ext === "xls" || ext === "gsheet" ? "xlsx" : ext === "doc" || ext === "gdoc" || ext === "txt" ? "docx" : "docx";
  const base = name.replace(/\.[a-z0-9]+$/i, "") || "Refyn file";
  return { name: `${base}.${format}`, base, format, kind: format === "xlsx" || format === "csv" ? "sheet" : "document", content: content.replace(/^\n+|\n+$/g, "") };
};

/** Split an assistant reply into prose and file blocks. */
export const splitReply = (reply: string): Segment[] => {
  const out: Segment[] = [];
  const re = /<<<\s*(FILE|DECK)\s+([^>]*?)>>>\n?([\s\S]*?)(?:<<<\s*END\s*(?:FILE|DECK)\s*>>>|$)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply))) {
    if (m.index > last) out.push({ type: "text", text: reply.slice(last, m.index) });
    const attrs = m[2];
    const attr = (k: string) => attrs.match(new RegExp(`${k}\\s*=\\s*"([^"]*)"`, "i"))?.[1];
    if (m[1].toUpperCase() === "DECK") {
      out.push({ type: "deck", deck: { title: (attr("title") || "Presentation").slice(0, 120), slides: Math.min(20, Math.max(4, Number(attr("slides")) || 10)), audience: attr("audience"), brief: m[3].trim() } });
    } else {
      out.push({ type: "file", file: fileFrom(attr("name") || "Refyn file.docx", m[3]), complete: /<<<\s*END\s*FILE\s*>>>$/i.test(m[0]) });
    }
    last = re.lastIndex;
    if (m[0].length === 0) break;
  }
  if (last < reply.length) out.push({ type: "text", text: reply.slice(last) });
  return out.filter((s) => s.type !== "text" || s.text.trim());
};

export const hasFiles = (reply: string) => /<<<\s*(FILE|DECK)\s/i.test(reply);

/** A reply with file blocks shortened to a mention, for history and copying. */
export const replyForHistory = (reply: string) =>
  reply
    .replace(/<<<\s*FILE\s+name\s*=\s*"([^"]+)"\s*>>>[\s\S]*?(?:<<<\s*END\s*FILE\s*>>>|$)/gi, (_, n) => `[File: ${n}]`)
    .replace(/<<<\s*DECK\s+title\s*=\s*"([^"]+)"[^>]*>>>[\s\S]*?(?:<<<\s*END\s*DECK\s*>>>|$)/gi, (_, n) => `[Presentation: ${n}]`);

/* ---------- markdown → HTML ---------- */

export const markdownToHtml = (md: string) => renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>);

const PRINT_CSS = `
  @page { margin: 16mm 15mm; }
  body { font-family: "Inter Tight", "Segoe UI", Arial, sans-serif; color: #111827; font-size: 11.5pt; line-height: 1.55; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 10pt; letter-spacing: -0.01em; }
  h2 { font-size: 15pt; margin: 16pt 0 6pt; border-bottom: 1px solid #E5E7EB; padding-bottom: 3pt; }
  h3 { font-size: 12.5pt; margin: 12pt 0 4pt; }
  p, li { margin: 0 0 6pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0 12pt; font-size: 10.5pt; }
  th, td { border: 1px solid #CBD5E1; padding: 5pt 7pt; text-align: left; vertical-align: top; }
  th { background: #EEF2F8; }
  blockquote { margin: 8pt 0; padding: 4pt 12pt; border-left: 3px solid #3B82F6; color: #374151; }
  code, pre { font-family: "JetBrains Mono", Consolas, monospace; font-size: 10pt; }
  pre { background: #F3F4F6; padding: 8pt; border-radius: 4pt; white-space: pre-wrap; }
  hr { border: 0; border-top: 1px solid #E5E7EB; margin: 12pt 0; }
`;

export const htmlDocument = (title: string, bodyHtml: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`;

/** Open the print dialog (Save as PDF) for a document. */
export const printAsPdf = (file: OutputFile) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) return;
  const body = file.kind === "sheet" ? sheetsToHtml(splitSheets(file.content)) : markdownToHtml(file.content);
  doc.open();
  doc.write(htmlDocument(file.base, body));
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 250);
};

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const sheetsToHtml = (sheets: Sheet[]) =>
  sheets
    .map((s) => `${sheets.length > 1 ? `<h2>${escHtml(s.name)}</h2>` : ""}<table><thead><tr>${(s.rows[0] ?? []).map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr></thead><tbody>${s.rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${escHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`)
    .join("");

/* ---------- HTML → docx ---------- */

async function htmlToDocx(title: string, html: string): Promise<Blob> {
  const d = await import("docx");
  const dom = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html").body.firstElementChild!;
  type Run = InstanceType<typeof d.TextRun>;
  const runs = (el: Node, style: { bold?: boolean; italics?: boolean; code?: boolean; strike?: boolean } = {}): Run[] => {
    const out: Run[] = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const text = (n.textContent ?? "").replace(/\s+/g, " ");
        if (text) out.push(new d.TextRun({ text, bold: style.bold, italics: style.italics, strike: style.strike, font: style.code ? "Consolas" : undefined }));
      } else if (n instanceof HTMLElement) {
        const tag = n.tagName.toLowerCase();
        if (tag === "br") out.push(new d.TextRun({ text: "", break: 1 }));
        else out.push(...runs(n, { ...style, bold: style.bold || tag === "strong" || tag === "b" || tag === "th", italics: style.italics || tag === "em" || tag === "i", code: style.code || tag === "code", strike: style.strike || tag === "del" }));
      }
    });
    return out;
  };
  const blocks: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [];
  const HEAD = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4, d.HeadingLevel.HEADING_5, d.HeadingLevel.HEADING_6];
  let listId = 0;
  const walkList = (list: HTMLElement, level: number, ordered: boolean, ref: string) => {
    for (const li of Array.from(list.children)) {
      if (li.tagName.toLowerCase() !== "li") continue;
      const inline = document.createElement("span");
      li.childNodes.forEach((c) => {
        if (!(c instanceof HTMLElement && /^(ul|ol)$/i.test(c.tagName))) inline.appendChild(c.cloneNode(true));
      });
      blocks.push(new d.Paragraph({ children: runs(inline), ...(ordered ? { numbering: { reference: ref, level } } : { bullet: { level } }), spacing: { after: 60 } }));
      for (const sub of Array.from(li.children)) {
        if (/^(ul|ol)$/i.test(sub.tagName)) walkList(sub as HTMLElement, Math.min(level + 1, 5), sub.tagName.toLowerCase() === "ol", ref);
      }
    }
  };
  const numberingConfigs: { reference: string; levels: { level: number; format: (typeof d.LevelFormat)[keyof typeof d.LevelFormat]; text: string; alignment: (typeof d.AlignmentType)[keyof typeof d.AlignmentType]; style: { paragraph: { indent: { left: number; hanging: number } } } }[] }[] = [];
  for (const el of Array.from(dom.children) as HTMLElement[]) {
    const tag = el.tagName.toLowerCase();
    const h = tag.match(/^h([1-6])$/);
    if (h) blocks.push(new d.Paragraph({ heading: HEAD[Number(h[1]) - 1], children: runs(el), spacing: { before: 200, after: 100 } }));
    else if (tag === "p") blocks.push(new d.Paragraph({ children: runs(el), spacing: { after: 120 } }));
    else if (tag === "ul" || tag === "ol") {
      const ref = `list-${listId++}`;
      numberingConfigs.push({
        reference: ref,
        levels: [0, 1, 2, 3, 4, 5].map((level) => ({ level, format: d.LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: d.AlignmentType.START, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })),
      });
      walkList(el, 0, tag === "ol", ref);
    } else if (tag === "blockquote") blocks.push(new d.Paragraph({ children: runs(el, { italics: true }), indent: { left: 567 }, spacing: { after: 120 } }));
    else if (tag === "pre") {
      for (const line of (el.textContent ?? "").split("\n")) blocks.push(new d.Paragraph({ children: [new d.TextRun({ text: line, font: "Consolas", size: 20 })] }));
    } else if (tag === "hr") blocks.push(new d.Paragraph({ children: [], border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: "CBD5E1", space: 1 } } }));
    else if (tag === "table") {
      const rows = Array.from(el.querySelectorAll("tr"));
      const cols = Math.max(1, ...rows.map((r) => r.children.length));
      blocks.push(
        new d.Table({
          width: { size: 100, type: d.WidthType.PERCENTAGE },
          rows: rows.map((tr, ri) =>
            new d.TableRow({
              tableHeader: ri === 0,
              children: Array.from({ length: cols }, (_, ci) => {
                const cell = tr.children[ci] as HTMLElement | undefined;
                return new d.TableCell({
                  children: [new d.Paragraph({ children: cell ? runs(cell, { bold: ri === 0 }) : [] })],
                  shading: ri === 0 ? { fill: "EEF2F8", type: d.ShadingType.CLEAR, color: "auto" } : undefined,
                  margins: { top: 60, bottom: 60, left: 100, right: 100 },
                });
              }),
            }),
          ),
        }),
      );
      blocks.push(new d.Paragraph({ children: [] }));
    } else if (el.textContent?.trim()) blocks.push(new d.Paragraph({ children: runs(el) }));
  }
  const doc = new d.Document({
    creator: "Refyn",
    title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    numbering: { config: numberingConfigs },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: blocks.length ? blocks : [new d.Paragraph(title)] }],
  });
  return d.Packer.toBlob(doc);
}

/* ---------- build + download ---------- */

export const MIME: Record<FileFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  md: "text/markdown",
  pdf: "application/pdf",
};

export async function buildFile(file: OutputFile, format: FileFormat = file.format): Promise<Blob> {
  if (format === "docx") {
    const html = file.kind === "sheet" ? sheetsToHtml(splitSheets(file.content)) : markdownToHtml(file.content);
    return htmlToDocx(file.base, html);
  }
  if (format === "xlsx") return writeXlsx(file.kind === "sheet" ? splitSheets(file.content, file.base.slice(0, 31)) : markdownTables(file.content));
  if (format === "csv") return new Blob(["﻿" + (file.kind === "sheet" ? toCsv(splitSheets(file.content)[0]?.rows ?? []) : toCsv(markdownTables(file.content)[0]?.rows ?? []))], { type: MIME.csv });
  return new Blob([file.content], { type: `${MIME.md};charset=utf-8` });
}

/** Tables inside a markdown document, as sheets (for "download as Excel"). */
export const markdownTables = (md: string): Sheet[] => {
  const dom = new DOMParser().parseFromString(markdownToHtml(md), "text/html");
  const tables = Array.from(dom.querySelectorAll("table"));
  return tables.map((t, i) => ({ name: `Table ${i + 1}`, rows: Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => (c.textContent ?? "").trim())) }));
};

export const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export async function downloadFile(file: OutputFile, format: FileFormat = file.format) {
  if (format === "pdf") return printAsPdf(file);
  saveBlob(await buildFile(file, format), `${file.base}.${format}`);
}

/** The download formats that make sense for a file. */
export const formatsFor = (file: OutputFile): FileFormat[] =>
  file.kind === "sheet" ? ["xlsx", "csv", "pdf", "docx"] : markdownTables(file.content).length ? ["docx", "pdf", "md", "xlsx"] : ["docx", "pdf", "md"];

export const FORMAT_LABEL: Record<FileFormat, string> = { docx: "Word", pdf: "PDF", md: "Markdown", xlsx: "Excel", csv: "CSV" };
