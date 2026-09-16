// Shared roster config for the Mahindra International School Pune pilot.
// Used by the bulk student import page, the CSV template, and the
// pilot-bulk-students edge function (duplicated there for Deno).

export const MISP_SUBDOMAIN = "mahindra-pune";

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

export type MispClassKey =
  | "rohit-is"
  | "vinod-science"
  | "vinod-physics-sl"
  | "vinod-physics-hl"
  | "vineet-math"
  | "vineet-ai-sl"
  | "vineet-ai-hl";

export type MispClassDef = {
  key: MispClassKey;
  teacherEmail: string;
  teacherName: string;
  /** Subject stored on the class row */
  subject: string;
  /** Human label used to build the class name */
  label: string;
  /** Which programme this class belongs to */
  stage: "MYP" | "DP";
  /** DP classes are one per grade; MYP classes are one per grade + section */
  perSection: boolean;
};

export const MISP_CLASSES: MispClassDef[] = [
  {
    key: "rohit-is",
    teacherEmail: "rohit.phalke@misp.org",
    teacherName: "Rohit Phalke",
    subject: "Individuals and Societies",
    label: "Individuals and Societies",
    stage: "MYP",
    perSection: true,
  },
  {
    key: "vinod-science",
    teacherEmail: "vinod.chacko@misp.org",
    teacherName: "Vinod Chacko",
    subject: "Integrated Science",
    label: "Integrated Science",
    stage: "MYP",
    perSection: true,
  },
  {
    key: "vinod-physics-sl",
    teacherEmail: "vinod.chacko@misp.org",
    teacherName: "Vinod Chacko",
    subject: "Physics SL",
    label: "Physics SL",
    stage: "DP",
    perSection: false,
  },
  {
    key: "vinod-physics-hl",
    teacherEmail: "vinod.chacko@misp.org",
    teacherName: "Vinod Chacko",
    subject: "Physics HL",
    label: "Physics HL",
    stage: "DP",
    perSection: false,
  },
  {
    key: "vineet-math",
    teacherEmail: "vineet.sharma@misp.org",
    teacherName: "Vineet Sharma",
    subject: "Mathematics",
    label: "Mathematics",
    stage: "MYP",
    perSection: true,
  },
  {
    key: "vineet-ai-sl",
    teacherEmail: "vineet.sharma@misp.org",
    teacherName: "Vineet Sharma",
    subject: "Mathematics AI SL",
    label: "Math AI SL",
    stage: "DP",
    perSection: false,
  },
  {
    key: "vineet-ai-hl",
    teacherEmail: "vineet.sharma@misp.org",
    teacherName: "Vineet Sharma",
    subject: "Mathematics AI HL",
    label: "Math AI HL",
    stage: "DP",
    perSection: false,
  },
];

export const findMispClass = (key: string) =>
  MISP_CLASSES.find((c) => c.key === key.trim().toLowerCase());

/** "Integrated Science — MYP 4A" or "Physics HL — DP 1" */
export function mispClassName(def: MispClassDef, grade: string, section: string) {
  if (def.perSection) return `${def.label} — ${grade}${section.trim().toUpperCase()}`;
  return `${def.label} — ${grade}`;
}

/** Rohit teaches I&S across MYP and DP; DP rows get one class per grade, no section. */
export function resolveClassShape(def: MispClassDef, grade: string): MispClassDef {
  if (def.key === "rohit-is" && isDpGrade(grade)) {
    return { ...def, perSection: false, stage: "DP" };
  }
  return def;
}

export function classAppliesToGrade(def: MispClassDef, grade: string): boolean {
  if (def.key === "rohit-is") return true;
  return def.stage === (isDpGrade(grade) ? "DP" : "MYP");
}

export type StudentImportRow = {
  full_name: string;
  email: string;
  grade_level: string;
  section: string;
  classes: string[];
};

export const CSV_TEMPLATE = [
  "full_name,email,grade_level,section,classes",
  'Aarav Shah,aarav.shah@misp.org,MYP 4,A,"vinod-science;vineet-math;rohit-is"',
  'Diya Rao,diya.rao@misp.org,DP 1,A,"vinod-physics-hl;vineet-ai-sl;rohit-is"',
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
  const required = ["full_name", "email", "grade_level", "section", "classes"];
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], fatal: `Missing column(s): ${missing.join(", ")}` };
  const idx = (c: string) => header.indexOf(c);

  const seen = new Set<string>();
  const rows: ParsedRow[] = table.slice(1).map((cols) => {
    const get = (c: string) => (cols[idx(c)] ?? "").trim();
    const full_name = get("full_name");
    const email = get("email").toLowerCase();
    const grade_level = get("grade_level");
    const section = get("section").toUpperCase();
    const classes = get("classes")
      .split(/[;|]/)
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const errors: string[] = [];
    if (!full_name) errors.push("Name is empty");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email looks invalid");
    if (seen.has(email)) errors.push("Duplicate email in this file");
    seen.add(email);
    if (!MISP_GRADE_LEVELS.includes(grade_level as MispGradeLevel))
      errors.push(`Grade level must be one of ${MISP_GRADE_LEVELS.join(", ")}`);
    if (!classes.length) errors.push("At least one class is required");

    for (const key of classes) {
      const def = findMispClass(key);
      if (!def) {
        errors.push(`Unknown class "${key}"`);
        continue;
      }
      if (!classAppliesToGrade(def, grade_level))
        errors.push(`"${key}" is not offered for ${grade_level}`);
      const shaped = resolveClassShape(def, grade_level);
      if (shaped.perSection && !section) errors.push(`"${key}" needs a section letter`);
    }

    return { full_name, email, grade_level, section, classes, errors };
  });

  return { rows };
}

export function toCredentialsCsv(
  results: { email: string; full_name: string; password?: string; status: string }[],
) {
  return [
    "full_name,email,password,status",
    ...results.map(
      (r) => `${r.full_name},${r.email},${r.password ?? ""},${r.status}`,
    ),
  ].join("\n");
}
