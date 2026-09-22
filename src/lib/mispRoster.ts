// Shared roster config for the Mahindra International School Pune pilot.
// Used by the bulk student import page, the CSV template, and the
// pilot-bulk-students edge function (duplicated there for Deno).

export const MISP_SUBDOMAIN = "mahindra-pune";

/** Domain used to build the generated student usernames. */
export const MISP_STUDENT_DOMAIN = "mahindra-pilot.refyntech.us";

export const MISP_GRADE_LEVELS = [
  "MYP 1",
  "MYP 2",
  "MYP 3",
  "MYP 4",
  "MYP 5",
  "DP 1",
  "DP 2",
] as const;

export type MispGradeLevel = (typeof MISP_GRADE_LEVELS)[number];

export const isDpGrade = (g: string) => g.trim().toUpperCase().startsWith("DP");

const letters = (s: string, n: number) =>
  s.toLowerCase().replace(/[^a-z]/g, "").slice(0, n);

/** "MYP 4" -> "myp4" */
export const gradeToken = (grade: string) =>
  grade.toLowerCase().replace(/[^a-z0-9]/g, "");

/** first 2 letters . last 2 letters . grade  →  "aa.sh.myp4" */
export function buildUsername(firstName: string, lastName: string, grade: string) {
  return `${letters(firstName, 2)}.${letters(lastName, 2)}.${gradeToken(grade)}`;
}

export const usernameToEmail = (username: string) =>
  `${username}@${MISP_STUDENT_DOMAIN}`;

export type StudentImportRow = {
  first_name: string;
  last_name: string;
  grade_level: string;
  username: string;
  email: string;
};

export const CSV_TEMPLATE = [
  "first_name,last_name,grade",
  "Aarav,Shah,MYP 4",
  "Diya,Rao,DP 1",
].join("\n");

/** Minimal CSV parser supporting quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const push = () => {
    row.push(field);
    field = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") push();
    else if (ch === "\n") {
      push();
      rows.push(row);
      row = [];
    } else if (ch !== "\r") field += ch;
  }
  push();
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type ParsedRow = StudentImportRow & { errors: string[] };

export function validateImportCsv(text: string): { rows: ParsedRow[]; fatal?: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], fatal: "The file has no data rows." };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const norm = (h: string) => (h === "grade_level" ? "grade" : h);
  const cols = header.map(norm);
  const required = ["first_name", "last_name", "grade"];
  const missing = required.filter((c) => !cols.includes(c));
  if (missing.length) return { rows: [], fatal: `Missing column(s): ${missing.join(", ")}` };
  const idx = (c: string) => cols.indexOf(c);

  const used = new Map<string, number>();
  const rows: ParsedRow[] = table.slice(1).map((c) => {
    const get = (col: string) => (c[idx(col)] ?? "").trim();
    const first_name = get("first_name");
    const last_name = get("last_name");
    const grade_level = get("grade");

    const errors: string[] = [];
    if (letters(first_name, 2).length < 2) errors.push("First name needs at least 2 letters");
    if (letters(last_name, 2).length < 2) errors.push("Last name needs at least 2 letters");
    if (!MISP_GRADE_LEVELS.includes(grade_level as MispGradeLevel))
      errors.push(`Grade must be one of ${MISP_GRADE_LEVELS.join(", ")}`);

    let username = "";
    if (!errors.length) {
      const base = buildUsername(first_name, last_name, grade_level);
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      username = seen === 0 ? base : `${base}${seen + 1}`;
    }

    return {
      first_name,
      last_name,
      grade_level,
      username,
      email: username ? usernameToEmail(username) : "",
      errors,
    };
  });

  return { rows };
}

export function toCredentialsCsv(
  results: {
    full_name?: string;
    username?: string;
    email: string;
    grade_level?: string;
    password?: string;
    status: string;
  }[],
) {
  return [
    "full_name,grade,username,email,password,status",
    ...results.map(
      (r) =>
        `${r.full_name ?? ""},${r.grade_level ?? ""},${r.username ?? ""},${r.email},${r.password ?? ""},${r.status}`,
    ),
  ].join("\n");
}
