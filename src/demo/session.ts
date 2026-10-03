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

const read = (store: "session" | "local", key: string) => {
  try {
    return (store === "session" ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
};

/** The role being demoed in this tab, or null outside the demo. */
export const demoRole = (): DemoRole | null => {
  const v = read("session", FLAG);
  return v === "student" || v === "teacher" ? v : null;
};

export const demoUser = () => {
  const role = demoRole();
  return role ? { ...DEMO_USERS[role] } : null;
};

/** The tour step to resume after a reload, if a tour is running. */
export const demoTourStep = (): number | null => {
  const v = read("session", TOUR);
  return v === null ? null : Number(v) || 0;
};

export const setDemoTourStep = (step: number | null) => {
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
  abandonDemo();
  window.location.assign(to);
};
