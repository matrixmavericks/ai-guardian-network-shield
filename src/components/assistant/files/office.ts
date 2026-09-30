import JSZip from "jszip";

// Minimal Office Open XML readers (xlsx, docx, pptx) and an xlsx writer,
// built on JSZip so no spreadsheet or Word library is needed.

const parseXml = (text: string) => new DOMParser().parseFromString(text, "application/xml");
/** Elements by local name, ignoring XML namespaces. */
const all = (root: Document | Element, local: string) => Array.from(root.getElementsByTagNameNS("*", local));

/* ---------- CSV ---------- */

export type Sheet = { name: string; rows: string[][] };

export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
};

export const toCsv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\r\n");

/** "## Sheet: Name" lines split one CSV text into several sheets. */
export const splitSheets = (text: string, fallback = "Sheet1"): Sheet[] => {
  const parts = text.split(/^\s*#{1,3}\s*Sheet:\s*(.+)$/im);
  if (parts.length === 1) return [{ name: fallback, rows: parseCsv(text.trim()) }];
  const sheets: Sheet[] = [];
  if (parts[0].trim()) sheets.push({ name: fallback, rows: parseCsv(parts[0].trim()) });
  for (let i = 1; i < parts.length; i += 2) sheets.push({ name: parts[i].trim().slice(0, 31) || `Sheet${sheets.length + 1}`, rows: parseCsv((parts[i + 1] ?? "").trim()) });
  return sheets.filter((s) => s.rows.length);
};

/* ---------- xlsx read ---------- */

const colIndex = (ref: string) => {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export async function readXlsx(data: ArrayBuffer, maxRows = 5000): Promise<Sheet[]> {
  const zip = await JSZip.loadAsync(data);
  const text = async (p: string) => (await zip.file(p)?.async("string")) ?? "";
  const shared = all(parseXml(await text("xl/sharedStrings.xml")), "si").map((si) => all(si, "t").map((t) => t.textContent ?? "").join(""));
  const wb = parseXml(await text("xl/workbook.xml"));
  const rels = parseXml(await text("xl/_rels/workbook.xml.rels"));
  const target = new Map(all(rels, "Relationship").map((r) => [r.getAttribute("Id"), r.getAttribute("Target") ?? ""]));
  const sheets: Sheet[] = [];
  for (const s of all(wb, "sheet")) {
    const rid = s.getAttribute("r:id") ?? s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    let path = target.get(rid) ?? "";
    path = path.startsWith("/") ? path.slice(1) : `xl/${path.replace(/^\.\//, "")}`;
    const doc = parseXml(await text(path));
    const rows: string[][] = [];
    for (const r of all(doc, "row").slice(0, maxRows)) {
      const row: string[] = [];
      for (const c of all(r, "c")) {
        const idx = colIndex(c.getAttribute("r") ?? "A1");
        const t = c.getAttribute("t");
        const v = all(c, "v")[0]?.textContent ?? "";
        const val = t === "s" ? shared[Number(v)] ?? "" : t === "inlineStr" ? all(c, "t").map((x) => x.textContent ?? "").join("") : t === "b" ? (v === "1" ? "TRUE" : "FALSE") : v;
        row[idx] = val;
      }
      rows.push(Array.from(row, (x) => x ?? ""));
    }
    sheets.push({ name: s.getAttribute("name") ?? `Sheet${sheets.length + 1}`, rows: rows.filter((r) => r.some((x) => x !== "")) });
  }
  return sheets;
}

export const sheetsToText = (sheets: Sheet[]) =>
  sheets.map((s) => `## Sheet: ${s.name}\n${toCsv(s.rows)}`).join("\n\n");

/* ---------- xlsx write ---------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i: number) => {
  let s = "";
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};
const isNumber = (v: string) => /^-?\d+(\.\d+)?$/.test(v.trim()) && v.trim().length < 16 && !/^0\d/.test(v.trim());

export async function writeXlsx(sheets: Sheet[]): Promise<Blob> {
  const zip = new JSZip();
  // Excel rejects duplicate sheet names (case-insensitive)
  const seen = new Set<string>();
  const names = sheets.map((s, i) => {
    const base = (s.name || `Sheet${i + 1}`).replace(/[[\]*?/\\:]/g, " ").trim().slice(0, 26) || `Sheet${i + 1}`;
    let n = base;
    for (let k = 2; seen.has(n.toLowerCase()); k++) n = `${base} (${k})`;
    seen.add(n.toLowerCase());
    return n;
  });
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
  );
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  // Style 1: bold header on a light fill
  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`,
  );
  sheets.forEach((s, i) => {
    const widths = (s.rows[0] ?? []).map((_, c) => Math.min(60, Math.max(8, ...s.rows.slice(0, 200).map((r) => (r[c] ?? "").length + 2))));
    const rows = s.rows
      .map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
        const ref = `${colName(ci)}${ri + 1}`;
        const style = ri === 0 ? ' s="1"' : "";
        return ri > 0 && isNumber(v) ? `<c r="${ref}"${style}><v>${v.trim()}</v></c>` : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      }).join("")}</row>`)
      .join("");
    zip.file(
      `xl/worksheets/sheet${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${widths.length ? `<cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : ""}<sheetData>${rows}</sheetData></worksheet>`,
    );
  });
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ---------- docx read ---------- */

export async function readDocx(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const doc = parseXml((await zip.file("word/document.xml")?.async("string")) ?? "");
  const body = all(doc, "body")[0];
  if (!body) return "";
  const runText = (el: Element) => {
    let out = "";
    const walk = (n: Element) => {
      for (const c of Array.from(n.children)) {
        const ln = c.localName;
        if (ln === "t") out += c.textContent ?? "";
        else if (ln === "tab") out += "\t";
        else if (ln === "br" || ln === "cr") out += "\n";
        else if (ln !== "rPr" && ln !== "pPr") walk(c);
      }
    };
    walk(el);
    return out;
  };
  const lines: string[] = [];
  for (const block of Array.from(body.children)) {
    if (block.localName === "p") {
      const style = all(block, "pStyle")[0]?.getAttribute("w:val") ?? "";
      const text = runText(block).trim();
      if (!text) { lines.push(""); continue; }
      const h = style.match(/Heading(\d)/i) ?? (style === "Title" ? ["", "1"] : null);
      const list = all(block, "numPr").length > 0;
      lines.push(h ? `${"#".repeat(Math.min(6, Number(h[1])))} ${text}` : list ? `- ${text}` : text);
    } else if (block.localName === "tbl") {
      const rows = all(block, "tr").map((tr) => all(tr, "tc").map((tc) => runText(tc).replace(/\s+/g, " ").trim().replace(/\|/g, "/")));
      if (rows.length) {
        lines.push("", `| ${rows[0].join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map((r) => `| ${r.join(" | ")} |`), "");
      }
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------- pptx read ---------- */

export async function readPptx(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const slides = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => Number(a.match(/(\d+)\.xml/)![1]) - Number(b.match(/(\d+)\.xml/)![1]));
  const out: string[] = [];
  for (const [i, p] of slides.entries()) {
    const doc = parseXml((await zip.file(p)?.async("string")) ?? "");
    const paras = all(doc, "p").map((para) => all(para, "t").map((t) => t.textContent ?? "").join("")).filter((t) => t.trim());
    const n = p.match(/(\d+)\.xml/)![1];
    const notes = zip.file(`ppt/notesSlides/notesSlide${n}.xml`);
    let noteText = "";
    if (notes) {
      const nd = parseXml(await notes.async("string"));
      noteText = all(nd, "p").map((para) => all(para, "t").map((t) => t.textContent ?? "").join("")).filter((t) => t.trim() && !/^\d+$/.test(t.trim())).join("\n");
    }
    out.push(`## Slide ${i + 1}\n${paras.join("\n")}${noteText ? `\nSpeaker notes: ${noteText}` : ""}`);
  }
  return out.join("\n\n");
}
