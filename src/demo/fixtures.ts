/* eslint-disable @typescript-eslint/no-explicit-any -- loose rows, like the database returns */
import type { Tables } from "./query";
import { DEMO_USERS } from "./session";

// Made-up classes, students and work for the live demo. Every name here is fictional.

const ME = DEMO_USERS.student.id;
const T = DEMO_USERS.teacher.id;

const STUDENTS = [
  "Aarav Shah", "Meera Iyer", "Kabir Rao", "Anaya Kulkarni", "Vihaan Mehta", "Diya Patel", "Arjun Nair", "Ira Desai",
  "Reyansh Gupta", "Saanvi Joshi", "Advik Menon", "Myra Kapoor", "Ishaan Bose", "Anika Reddy", "Dhruv Pillai",
  "Kiara Sen", "Rohan Das", "Tara Singh", "Zoya Khan", "Neel Banerjee",
];
const sid = (i: number) => `demo-s${i + 1}`;

const OTHER_TEACHERS = [
  { user_id: "demo-t-kapoor", full_name: "Rhea Kapoor" },
  { user_id: "demo-t-iyer", full_name: "Neil Iyer" },
  { user_id: "demo-t-thomas", full_name: "Sara Thomas" },
];

const day = (n: number, hour = 9) => {
  const d = new Date(Date.now() + n * 86_400_000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const WORK = {
  cells: [
    "Aim: to find out how the concentration of salt solution affects the mass of potato cylinders.\n\nMethod: I cut 5 cylinders of the same length, weighed them, and left each in a different salt solution (0, 0.2, 0.4, 0.6, 0.8 M) for 30 minutes, then dried and re-weighed them.\n\nResults: the cylinder in pure water gained 8% mass; the 0.8 M one lost 14%. Mass change crossed zero at about 0.3 M.\n\nConclusion: water moves by osmosis from a dilute to a more concentrated solution, so cylinders in strong salt solution lost water. I think the potato cells' water potential matches roughly 0.3 M salt. I would repeat each concentration three times next time.",
    "The potatoes in salty water got smaller and floppy and the ones in water got bigger. This is because of osmosis. Osmosis is when water moves across a membrane. My results table is attached. I think my experiment was fair because I used the same potato.",
    "Hypothesis: as salt concentration increases, the percentage change in mass will decrease, because water will leave the cells by osmosis.\n\nI controlled cylinder length (3 cm), temperature (room) and time (30 min). Each concentration was repeated 3 times and I took the mean.\n\nResults show a clear negative trend: +9.1%, +3.4%, -2.8%, -8.9%, -13.2%. One anomaly at 0.4 M (trial 2) was excluded.\n\nEvaluation: blotting the cylinders was inconsistent, which may explain the anomaly. A digital balance to 0.01 g would improve precision.",
  ],
  matter: [
    "My poster shows the three states of matter with particle diagrams. In solids particles vibrate in fixed positions, in liquids they slide past each other and in gases they move fast in all directions. I added arrows for melting, freezing, evaporating, condensing and sublimation, with an example of each from everyday life.",
    "Solid liquid gas. Ice melts into water and water boils into steam. Particles get more energy when you heat them.",
  ],
  forces: [
    "I pulled a trolley with 1 N, 2 N and 3 N using a newton meter and timed it over 1 m with light gates. Acceleration went up as force went up: 0.42, 0.85 and 1.31 m/s². My graph is a straight line through the origin, so acceleration is proportional to force, which supports Newton's second law (F = ma). The mass of the trolley stayed at 2.3 kg.",
  ],
};

export function buildTables(): Tables {
  const profiles = [
    { user_id: ME, full_name: DEMO_USERS.student.fullName, email: DEMO_USERS.student.email, avatar_url: null },
    { user_id: T, full_name: DEMO_USERS.teacher.fullName, email: DEMO_USERS.teacher.email, avatar_url: null },
    ...OTHER_TEACHERS.map((t) => ({ ...t, email: null, avatar_url: null })),
    ...STUDENTS.map((n, i) => ({ user_id: sid(i), full_name: n, email: null, avatar_url: null })),
  ];

  const classes = [
    { id: "demo-c1", teacher_id: T, name: "MYP 5 Physics", subject: "Physics", curriculum_type: "IB MYP", join_code: "PHY5RA", grading_system_id: null, description: "Forces, energy and waves", created_at: day(-70) },
    { id: "demo-c2", teacher_id: T, name: "MYP 4 Sciences", subject: "Biology", curriculum_type: "IB MYP", join_code: "SCI4RA", grading_system_id: null, description: "Cells, transport and ecosystems", created_at: day(-64) },
    { id: "demo-c3", teacher_id: T, name: "MYP 3 Sciences", subject: "Chemistry", curriculum_type: "IB MYP", join_code: "SCI3RA", grading_system_id: null, description: "Particles, matter and reactions", created_at: day(-60) },
    { id: "demo-c4", teacher_id: "demo-t-kapoor", name: "MYP 5 Mathematics", subject: "Mathematics", curriculum_type: "IB MYP", join_code: "MAT5RK", grading_system_id: null, description: "Extended mathematics", created_at: day(-70) },
    { id: "demo-c5", teacher_id: "demo-t-iyer", name: "MYP 5 English", subject: "English", curriculum_type: "IB MYP", join_code: "ENG5NI", grading_system_id: null, description: "Language and literature", created_at: day(-70) },
    { id: "demo-c6", teacher_id: "demo-t-thomas", name: "MYP 5 History", subject: "History", curriculum_type: "IB MYP", join_code: "HIS5ST", grading_system_id: null, description: "Individuals and societies", created_at: day(-70) },
  ];

  const roster: Record<string, string[]> = {
    "demo-c1": [ME, ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sid)],
    "demo-c2": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(sid),
    "demo-c3": [2, 3, 12, 13, 14, 15, 16, 17, 18, 19].map(sid),
    "demo-c4": [ME, ...[0, 1, 2].map(sid)],
    "demo-c5": [ME, ...[3, 4, 5].map(sid)],
    "demo-c6": [ME, ...[6, 7, 8].map(sid)],
  };
  const class_members = Object.entries(roster).flatMap(([class_id, ids]) => ids.map((student_id) => ({ id: `${class_id}-${student_id}`, class_id, student_id, joined_at: day(-60) })));

  const A = (id: string, class_id: string, title: string, subject: string, due: number, description: string, extra: Record<string, unknown> = {}) => ({
    id, class_id, teacher_id: classes.find((c) => c.id === class_id)!.teacher_id, title, subject, description, instructions: null, due_date: day(due, 17), created_at: day(due - 10),
    updated_at: day(due - 10), grading_type: "points", group_formation: "teacher", is_group_assignment: false, max_group_size: 4, min_group_size: 2, resources: [], rubric: null, worksheet: null, ...extra,
  });
  const class_assignments = [
    A("demo-a1", "demo-c1", "Forces lab report", "Physics", 2, "Investigate how the resultant force on a trolley affects its acceleration. Assessed on criteria B (inquiring and designing) and C (processing and evaluating)."),
    A("demo-a2", "demo-c1", "Energy transfers test", "Physics", -6, "Sankey diagrams, efficiency and the conservation of energy."),
    A("demo-a3", "demo-c1", "Waves worksheet", "Physics", -13, "Wave speed, frequency and wavelength problems."),
    A("demo-a7", "demo-c1", "Projectile motion investigation", "Physics", 6, "Use the projectile simulation to find the launch angle that gives the longest range, then explain why."),
    A("demo-a4", "demo-c2", "Osmosis practical write-up", "Biology", -3, "Potato cylinders in salt solutions: method, results and a conclusion about water potential."),
    A("demo-a5", "demo-c2", "Ecosystems quiz", "Biology", 3, "Food webs, energy flow and decomposers."),
    A("demo-a6", "demo-c3", "States of matter poster", "Chemistry", -2, "A poster showing particle arrangement and the changes of state, with everyday examples."),
    A("demo-a8", "demo-c4", "Quadratics investigation", "Mathematics", 4, "Explore how changing a, b and c moves the graph of y = ax² + bx + c."),
    A("demo-a9", "demo-c4", "Sequences test", "Mathematics", -5, "Arithmetic and geometric sequences."),
    A("demo-a10", "demo-c5", "Macbeth essay: ambition", "English", 8, "How does Shakespeare present ambition as destructive? Plan, draft and redraft."),
    A("demo-a11", "demo-c5", "Persuasive speech", "English", -10, "A two-minute speech on a local issue."),
    A("demo-a12", "demo-c6", "Causes of WW1 source analysis", "History", -9, "Evaluate two sources on the role of alliances."),
  ];

  const sub = (id: string, assignment_id: string, student_id: string, s: Partial<Record<string, any>>) => ({
    id, assignment_id, student_id, content: "", file_url: null, file_name: null, grade: null, max_grade: 100, feedback: null, status: "submitted",
    submitted_at: day(-1), graded_at: null, assessment: null, ...s,
  });
  const myp = (group: string, levels: Record<string, number>, comments: Record<string, string>, targets: string[], grade: number, at: string) => {
    const criteria = Object.keys(levels);
    const total = Object.values(levels).reduce((a, b) => a + b, 0);
    return { kind: "myp", group, year: 5, criteria, levels, comments, targets, total, max: criteria.length * 8, grade, at };
  };

  const assignment_submissions: any[] = [
    // Aanya's own marked work
    sub("demo-x1", "demo-a2", ME, {
      status: "graded", grade: 82, submitted_at: day(-7), graded_at: day(-4),
      content: "Sankey diagrams for the kettle and the LED bulb, efficiency calculations and an explanation of where the wasted energy goes.",
      feedback: "A big step up, Aanya. Your Sankey diagrams are accurate and clearly scaled. Next: always state the useful output before calculating efficiency, and give efficiency as a decimal and a percentage.",
      assessment: myp("sciences", { A: 6, D: 5 }, { A: "Accurate use of energy stores and pathways.", D: "Good link to real devices; extend by weighing up the cost of efficiency." }, ["State the useful energy output before calculating efficiency.", "Compare two devices using a justified conclusion."], 6, day(-4)),
    }),
    sub("demo-x2", "demo-a3", ME, { status: "graded", grade: 88, submitted_at: day(-14), graded_at: day(-11), content: "Worksheet answers.", feedback: "Excellent: every answer has the equation, substitution and unit." }),
    sub("demo-x3", "demo-a9", ME, {
      status: "graded", grade: 74, submitted_at: day(-6), graded_at: day(-3), content: "Test paper.",
      feedback: "Strong on arithmetic sequences. Review the sum of a geometric series, and show the common ratio before using it.",
      assessment: myp("mathematics", { A: 5, C: 6 }, { A: "Mostly accurate; slips with the geometric sum.", C: "Clear notation throughout." }, ["Find and show r before using the geometric formulas."], 5, day(-3)),
    }),
    sub("demo-x4", "demo-a11", ME, { status: "graded", grade: 91, submitted_at: day(-11), graded_at: day(-8), content: "Speech script: why our town needs a safe cycle lane.", feedback: "Confident and persuasive. Your rhetorical questions landed; vary sentence length a little more in the conclusion." }),
    sub("demo-x5", "demo-a12", ME, { status: "graded", grade: 68, submitted_at: day(-10), graded_at: day(-7), content: "Source analysis.", feedback: "Good use of provenance for Source A. For Source B, say what the author's purpose means for its reliability." }),
  ];

  // The class's history: hand-ins and marks spread so some students need a look
  const scores = [92, 78, 45, 66, 88, 71, 95, 72, 80, 84, 52, 90, 70, 68, 81, 93, 74, 76, 64, 87];
  roster["demo-c1"].filter((s) => s !== ME).forEach((s, i) => {
    const g = scores[i];
    if (i !== 2) assignment_submissions.push(sub(`demo-h2-${s}`, "demo-a2", s, { status: "graded", grade: g, submitted_at: day(-7 - (i % 3)), graded_at: day(-4), content: "Test paper." }));
    if (i !== 6) assignment_submissions.push(sub(`demo-h3-${s}`, "demo-a3", s, { status: "graded", grade: Math.min(100, g + 4), submitted_at: day(-14), graded_at: day(-11), content: "Worksheet answers." }));
    if (i < 3) assignment_submissions.push(sub(`demo-h1-${s}`, "demo-a1", s, { submitted_at: day(-1 + i * 0.2, 20), content: WORK.forces[0] }));
  });
  // Waiting to be marked
  roster["demo-c2"].forEach((s, i) => {
    assignment_submissions.push(sub(`demo-h4x-${s}`, "demo-a4x", s, { status: "graded", grade: scores[(i + 3) % scores.length], submitted_at: day(-11), graded_at: day(-8), content: "Quiz." }));
    if (i === 3 || i === 9) return;
    assignment_submissions.push(sub(`demo-h4-${s}`, "demo-a4", s, { submitted_at: day(-3 - (i % 2), 15 + (i % 5)), content: WORK.cells[i % WORK.cells.length] }));
  });
  roster["demo-c3"].forEach((s, i) => {
    if (i === 4) return;
    assignment_submissions.push(sub(`demo-h6-${s}`, "demo-a6", s, { submitted_at: day(-2, 14 + (i % 6)), content: WORK.matter[i % WORK.matter.length] }));
    assignment_submissions.push(sub(`demo-h6b-${s}`, "demo-a6x", s, { status: "graded", grade: scores[i + 5] ?? 70, submitted_at: day(-20), graded_at: day(-17), content: "Quiz." }));
  });
  class_assignments.push(A("demo-a6x", "demo-c3", "Particles quiz", "Chemistry", -20, "Particle model basics."));
  class_assignments.push(A("demo-a4x", "demo-c2", "Cells quiz", "Biology", -10, "Cell structure and microscopy."));

  const messages = [
    { id: "demo-m1", sender_id: T, receiver_id: ME, content: "Great improvement on the energy test, Aanya! For the forces lab, remember to repeat each reading three times.", read: true, created_at: day(-2, 15) },
    { id: "demo-m2", sender_id: ME, receiver_id: T, content: "Thank you! Should the graph have error bars?", read: true, created_at: day(-1, 18) },
    { id: "demo-m3", sender_id: T, receiver_id: ME, content: "Yes: use the range of your repeats. Happy to look at a draft on Thursday.", read: false, created_at: day(0, 8) },
    { id: "demo-m4", sender_id: sid(2), receiver_id: T, content: "Ms Rao, can I hand in the osmosis write-up tomorrow? I was away on Monday.", read: false, created_at: day(0, 7) },
    { id: "demo-m5", sender_id: sid(9), receiver_id: T, content: "Is the projectile investigation individual or in pairs?", read: true, created_at: day(-1, 16) },
    { id: "demo-m6", sender_id: T, receiver_id: sid(9), content: "Individual, but you can compare results with a partner before writing up.", read: true, created_at: day(-1, 17) },
  ];

  const notifications = [
    { id: "demo-n1", user_id: ME, kind: "grade", title: "Energy transfers test marked", body: "82%, with feedback from Maya Rao", link: "/grades", data: {}, dedupe: null, read_at: null, created_at: day(-4, 16) },
    { id: "demo-n2", user_id: ME, kind: "assignment", title: "New: Projectile motion investigation", body: "MYP 5 Physics, due in 6 days", link: "/classes", data: {}, dedupe: null, read_at: null, created_at: day(-4, 9) },
    { id: "demo-n3", user_id: T, kind: "submission", title: "10 osmosis write-ups to mark", body: "MYP 4 Sciences", link: "/marking", data: {}, dedupe: null, read_at: null, created_at: day(-2, 18) },
    { id: "demo-n4", user_id: T, kind: "message", title: "Kabir Rao sent you a message", body: "Can I hand in the osmosis write-up tomorrow?", link: "/messages", data: {}, dedupe: null, read_at: null, created_at: day(0, 7) },
  ];

  const ai_chat_sessions = [
    { id: "demo-ch1", user_id: ME, title: "Osmosis vs diffusion", subject: "science", gem_id: null, world_id: null, scene_id: null, created_at: day(-1), updated_at: day(-1) },
    { id: "demo-ch2", user_id: ME, title: "Quadratic formula help", subject: "math", gem_id: null, world_id: null, scene_id: null, created_at: day(-3), updated_at: day(-3) },
    { id: "demo-ch3", user_id: T, title: "Forces lesson: misconceptions", subject: "science", gem_id: null, world_id: null, scene_id: null, created_at: day(-2), updated_at: day(-2) },
  ];

  return {
    profiles,
    user_roles: [{ user_id: ME, role: "student" }, { user_id: T, role: "teacher" }, ...OTHER_TEACHERS.map((t) => ({ user_id: t.user_id, role: "teacher" })), ...STUDENTS.map((_, i) => ({ user_id: sid(i), role: "student" }))],
    user_plans: [
      { id: "demo-p1", user_id: ME, plan_id: "premium", billing_cycle: "yearly", monthly_token_limit: 5000, tokens_used_this_month: 1240, token_reset_date: day(18), status: "active", assigned_by: null, created_at: day(-80) },
      { id: "demo-p2", user_id: T, plan_id: "teacher_pro", billing_cycle: "yearly", monthly_token_limit: 99999, tokens_used_this_month: 3100, token_reset_date: day(18), status: "active", assigned_by: null, created_at: day(-80) },
    ],
    classes,
    class_members,
    class_assignments,
    assignment_submissions,
    messages,
    notifications,
    ai_chat_sessions,
    ai_chat_messages: [],
    student_study_state: [],
    learning_paths: [],
    learning_path_progress: [],
    portfolio_projects: [],
    school_members: [],
  };
}

/** Who each demo user can message (the get_user_contacts RPC). */
export function contactsFor(tables: Tables, userId: string) {
  const name = (id: string) => tables.profiles.find((p) => p.user_id === id)?.full_name ?? "Someone";
  if (userId === T) {
    const mine = new Set(tables.classes.filter((c) => c.teacher_id === T).map((c) => c.id));
    const ids = [...new Set(tables.class_members.filter((m) => mine.has(m.class_id)).map((m) => m.student_id))];
    return ids.map((id) => ({ user_id: id, full_name: name(id), role: "student" }));
  }
  const theirs = new Set(tables.class_members.filter((m) => m.student_id === userId).map((m) => m.class_id));
  const teachers = [...new Set(tables.classes.filter((c) => theirs.has(c.id)).map((c) => c.teacher_id))];
  return teachers.map((id) => ({ user_id: id, full_name: name(id), role: "teacher" }));
}
