/**
 * Anonymous pilot student IDs ("MIS-7K2QX9P4"). Students type the ID where
 * others type an email; it maps to a private address that never receives mail.
 */
export const STUDENT_ID_DOMAIN = "mahindra-pilot.refyntech.us";
export const STUDENT_ID_RE = /^MIS-[A-Z0-9]{3,24}$/i;

export const isStudentId = (v: string) => STUDENT_ID_RE.test(v.trim());

/** Turns what someone typed in the sign-in box into the email Supabase expects. */
export const toLoginEmail = (identifier: string) => {
  const v = identifier.trim();
  return isStudentId(v) ? `${v.toLowerCase()}@${STUDENT_ID_DOMAIN}` : v;
};

/** Names that are just a pilot ID shouldn't be used in greetings. */
export const friendlyFirstName = (name: string | null | undefined, fallback = "there") => {
  const n = (name ?? "").trim();
  if (!n || isStudentId(n) || n.includes("@")) return fallback;
  return n.split(/\s+/)[0];
};
