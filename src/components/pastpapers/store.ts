import { supabase } from "@/integrations/supabase/client";
import { extractFile, kindOf } from "@/components/assistant/files/extract";
import { MYP, type MypGroup } from "@/lib/myp";

// A school's own copies of past IB papers (past_papers table + private
// past-papers bucket). Text is extracted here so the AI can quote real questions.

// The table is newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const BUCKET = "past-papers";
const MAX_CONTENT = 600_000;

export type PaperGroup = MypGroup | "interdisciplinary" | "dp" | "other";
export type PaperKind = "paper" | "markscheme" | "specimen" | "report" | "other";

export type PastPaper = {
  id: string;
  uploaded_by: string;
  school_id: string | null;
  subject_group: PaperGroup;
  subject: string;
  session: string;
  kind: PaperKind;
  title: string;
  char_count: number;
  pages: number | null;
  file_path: string | null;
  file_name: string | null;
  created_at: string;
};

export type PaperMeta = { subject_group: PaperGroup; subject: string; session: string; kind: PaperKind; title: string };

export const GROUPS: { id: PaperGroup; label: string }[] = [
  ...(Object.keys(MYP) as MypGroup[]).map((g) => ({ id: g as PaperGroup, label: `MYP ${MYP[g].name}` })),
  { id: "interdisciplinary", label: "MYP Interdisciplinary" },
  { id: "dp", label: "DP (Diploma Programme)" },
  { id: "other", label: "Other" },
];

export const KINDS: { id: PaperKind; label: string }[] = [
  { id: "paper", label: "Question paper" },
  { id: "markscheme", label: "Markscheme" },
  { id: "specimen", label: "Specimen paper" },
  { id: "report", label: "Subject report" },
  { id: "other", label: "Other" },
];

export const groupLabel = (g: string) => GROUPS.find((x) => x.id === g)?.label ?? g;
export const kindLabel = (k: string) => KINDS.find((x) => x.id === k)?.label ?? k;

const SUBJECTS: [RegExp, PaperGroup, string][] = [
  [/integrated[ _-]?sciences?/i, "sciences", "Integrated sciences"],
  [/biology/i, "sciences", "Biology"],
  [/chemistry/i, "sciences", "Chemistry"],
  [/physics/i, "sciences", "Physics"],
  [/extended[ _-]?math/i, "mathematics", "Extended mathematics"],
  [/\bmath(s|ematics)?\b|mathematics/i, "mathematics", "Mathematics"],
  [/lang(uage)?[ _-]?(and|&)?[ _-]?lit|english/i, "language-literature", "English language and literature"],
  [/integrated[ _-]?humanities/i, "individuals-societies", "Integrated humanities"],
  [/history/i, "individuals-societies", "History"],
  [/geography/i, "individuals-societies", "Geography"],
  [/economics/i, "individuals-societies", "Economics"],
  [/interdisciplinary/i, "interdisciplinary", "Interdisciplinary"],
  [/french|spanish|german|hindi|mandarin|chinese|japanese|arabic/i, "language-acquisition", ""],
];

/** A best guess at a paper's details from its file name, e.g. "Biology_May_2023_markscheme.pdf". */
export function guessMeta(fileName: string): PaperMeta {
  const name = fileName.replace(/\.[a-z0-9]+$/i, "");
  const plain = name.replace(/[_-]+/g, " ");
  const hit = SUBJECTS.find(([re]) => re.test(plain));
  const lang = hit?.[1] === "language-acquisition" ? plain.match(/french|spanish|german|hindi|mandarin|chinese|japanese|arabic/i)?.[0] : undefined;
  const month = plain.match(/\b(may|nov(ember)?)\b[^0-9]{0,3}(20\d\d)/i);
  const specimen = /specimen/i.test(plain);
  const dp = /\b(DP|HL|SL|paper ?[123])\b/.test(plain) && !/\bMYP\b/i.test(plain);
  const kind: PaperKind = /mark ?scheme|markscheme|\bMS\b/i.test(plain) ? "markscheme" : /subject ?report/i.test(plain) ? "report" : specimen ? "specimen" : "paper";
  return {
    subject_group: dp ? "dp" : hit?.[1] ?? "other",
    subject: lang ? lang[0].toUpperCase() + lang.slice(1).toLowerCase() : hit?.[2] ?? "",
    session: month ? `${/^may/i.test(month[1]) ? "May" : "November"} ${month[3]}` : specimen ? "Specimen" : "",
    kind,
    title: plain.trim().slice(0, 200),
  };
}

/** The school this teacher belongs to (papers are shared with its teachers), if any. */
export async function mySchoolId(userId: string): Promise<string | null> {
  const { data } = await db.from("school_members").select("school_id").eq("user_id", userId).limit(1);
  return (data?.[0]?.school_id as string | undefined) ?? null;
}

export async function listPapers(): Promise<PastPaper[]> {
  const { data, error } = await db
    .from("past_papers")
    .select("id, uploaded_by, school_id, subject_group, subject, session, kind, title, char_count, pages, file_path, file_name, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Couldn't load past papers.");
  return (data ?? []) as PastPaper[];
}

export async function uploadPaper(
  userId: string,
  schoolId: string | null,
  file: File,
  meta: PaperMeta,
  onStatus?: (s: string) => void,
): Promise<{ paper: PastPaper; note?: string }> {
  if (kindOf(file) === "unsupported") throw new Error("Use a PDF, Word document, image or text file.");
  onStatus?.("Reading");
  const extracted = await extractFile(file, null, onStatus);
  const content = extracted.text.slice(0, MAX_CONTENT);
  const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "pdf").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  onStatus?.("Uploading");
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (up.error) throw new Error("Upload failed.");
  const { data, error } = await db
    .from("past_papers")
    .insert({
      uploaded_by: userId,
      school_id: schoolId,
      subject_group: meta.subject_group,
      subject: meta.subject.trim().slice(0, 80),
      session: meta.session.trim().slice(0, 40),
      kind: meta.kind,
      title: meta.title.trim().slice(0, 200) || file.name.slice(0, 200),
      content,
      pages: extracted.pages ?? null,
      file_path: path,
      file_name: file.name.slice(0, 200),
    })
    .select("id, uploaded_by, school_id, subject_group, subject, session, kind, title, char_count, pages, file_path, file_name, created_at")
    .single();
  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error("Couldn't save the paper.");
  }
  const note = [extracted.note, extracted.text.length > MAX_CONTENT ? "Very long: the first 600,000 characters were kept." : ""].filter(Boolean).join(" ") || undefined;
  return { paper: data as PastPaper, note };
}

export async function deletePaper(p: PastPaper) {
  const { error } = await db.from("past_papers").delete().eq("id", p.id);
  if (error) throw new Error("Couldn't delete it.");
  if (p.file_path) await supabase.storage.from(BUCKET).remove([p.file_path]);
}

export async function paperUrl(p: PastPaper): Promise<string | null> {
  if (!p.file_path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.file_path, 60 * 10);
  return data?.signedUrl ?? null;
}
