// The live demo: a full Refyn portal running on made-up data in this tab only.
// Nothing here talks to the real backend; see ./install for the mocks.
// Kept tiny on purpose, since the auth context imports it on every page load.

export type DemoRole = "student" | "teacher";

const FLAG = "refyn-demo";
const TOUR = "refyn-demo-tour";

export const DEMO_USERS = {
  student: { id: "demo-student", email: "aanya.demo@example.com", role: "student", fullName: "Aanya Sharma" },
  teacher: { id: "demo-teacher", email: "maya.demo@example.com", role: "teacher", fullName: "Maya Rao" },
} as const;

export const DEMO_HOME: Record<DemoRole, string> = { student: "/student-dashboard", teacher: "/dashboard" };

// A mini demo embedded in the help centre (?embed=student&mini=<question id>).
// Kept in memory only: an embedded frame shares this tab's session storage.
const EMBED = (() => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const role = q.get("embed");
  return role === "student" || role === "teacher" ? { role: role as DemoRole, mini: q.get("mini") } : null;
})();

/** The help question a mini demo is showing, when this page is one. */
export const demoEmbed = () => EMBED;

/** Ask the help centre to close this mini demo. */
export const closeEmbed = () => window.parent?.postMessage({ type: "refyn-mini-close" }, window.location.origin);

const read = (store: "session" | "local", key: string) => {
  try {
    return (store === "session" ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
};

/** The role being demoed in this tab, or null outside the demo. */
export const demoRole = (): DemoRole | null => {
  if (EMBED) return EMBED.role;
  const v = read("session", FLAG);
  return v === "student" || v === "teacher" ? v : null;
};

export const demoUser = () => {
  const role = demoRole();
  return role ? { ...DEMO_USERS[role] } : null;
};

/** The tour step to resume after a reload, if a tour is running. */
export const demoTourStep = (): number | null => {
  if (EMBED) return null;
  const v = read("session", TOUR);
  return v === null ? null : Number(v) || 0;
};

export const setDemoTourStep = (step: number | null) => {
  if (EMBED) return;
  try {
    if (step === null) sessionStorage.removeItem(TOUR);
    else sessionStorage.setItem(TOUR, String(step));
  } catch {
    /* private mode: the tour still runs, it just won't survive a reload */
  }
};

const clearDemoStorage = () => {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("refyn:demo-")) localStorage.removeItem(k);
  } catch {
    /* nothing stored */
  }
};

/** Start (or switch) the demo. A full page load, so the mocks are in place before anything renders. */
export const startDemo = (role: DemoRole, opts: { tour?: boolean; path?: string } = {}) => {
  if (EMBED) {
    // From inside a mini demo, open the real thing in the whole tab
    try {
      window.top!.sessionStorage.setItem(FLAG, role);
      if (opts.tour) window.top!.sessionStorage.setItem(TOUR, "0");
      window.top!.location.assign(opts.path ?? DEMO_HOME[role]);
    } catch {
      window.open("/demo", "_top");
    }
    return;
  }
  try {
    if (demoRole() !== role) clearDemoStorage();
    sessionStorage.setItem(FLAG, role);
  } catch {
    // Without session storage the demo can't run; send them to the tour page instead
    window.location.assign("/tour");
    return;
  }
  setDemoTourStep(opts.tour ? 0 : null);
  window.location.assign(opts.path ?? DEMO_HOME[role]);
};

/** Drop the demo flags without going anywhere (e.g. if the demo couldn't start). */
export const abandonDemo = () => {
  if (EMBED) return;
  try {
    sessionStorage.removeItem(FLAG);
    sessionStorage.removeItem(TOUR);
  } catch {
    /* already gone */
  }
  clearDemoStorage();
};

/** Leave the demo and drop everything it stored. */
export const exitDemo = (to = "/demo") => {
  if (EMBED) {
    if (to === "/demo") closeEmbed();
    else window.open(to, "_top");
    return;
  }
  abandonDemo();
  window.location.assign(to);
};
