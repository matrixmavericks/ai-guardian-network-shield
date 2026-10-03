/* eslint-disable @typescript-eslint/no-explicit-any -- stands in for the untyped, chainable Supabase client */
// A small in-memory stand-in for the Supabase query builder, enough for the
// portal's reads and writes in the demo: filters, or(), ordering, ranges,
// single rows, counts, simple embedded relations and insert/update/upsert/delete.

type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;
type Test = (r: Row) => boolean;

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `demo-${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();
const singular = (t: string) => (t.endsWith("ies") ? `${t.slice(0, -3)}y` : t.endsWith("sses") || t.endsWith("ches") ? t.slice(0, -2) : t.endsWith("s") ? t.slice(0, -1) : t);

const cast = (v: string): any => (v === "null" ? null : v === "true" ? true : v === "false" ? false : v);
const likeTest = (pattern: string, ci: boolean) => {
  const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`, ci ? "i" : "");
  return (v: unknown) => typeof v === "string" && re.test(v);
};

const op = (col: string, kind: string, value: any): Test => {
  switch (kind) {
    case "eq": return (r) => r[col] == value || String(r[col]) === String(value);
    case "neq": return (r) => r[col] != value;
    case "gt": return (r) => r[col] != null && r[col] > value;
    case "gte": return (r) => r[col] != null && r[col] >= value;
    case "lt": return (r) => r[col] != null && r[col] < value;
    case "lte": return (r) => r[col] != null && r[col] <= value;
    case "is": return (r) => (r[col] ?? null) === (value === "null" ? null : value);
    case "in": {
      const list = Array.isArray(value) ? value : String(value).replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      return (r) => list.some((v) => v == r[col]);
    }
    case "like": return (r) => likeTest(String(value), false)(r[col]);
    case "ilike": return (r) => likeTest(String(value), true)(r[col]);
    case "cs":
    case "contains": {
      const want = Array.isArray(value) ? value : [value];
      return (r) => Array.isArray(r[col]) ? want.every((w) => r[col].includes(w)) : typeof r[col] === "object" && r[col] !== null && Object.entries(value).every(([k, v]) => r[col][k] == v);
    }
    case "ov":
    case "overlaps": return (r) => Array.isArray(r[col]) && (value as any[]).some((v) => r[col].includes(v));
    default: return () => true;
  }
};

// PostgREST or() strings: "a.eq.1,and(b.eq.2,c.is.null)"
const splitTop = (s: string) => {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};
const parseCond = (s: string): Test => {
  const t = s.trim();
  const group = /^(and|or)\((.*)\)$/.exec(t);
  if (group) {
    const parts = splitTop(group[2]).map(parseCond);
    return group[1] === "and" ? (r) => parts.every((p) => p(r)) : (r) => parts.some((p) => p(r));
  }
  const [col, ...rest] = t.split(".");
  let kind = rest.shift() ?? "eq";
  let neg = false;
  if (kind === "not") { neg = true; kind = rest.shift() ?? "eq"; }
  const test = op(col, kind, cast(rest.join(".")));
  return neg ? (r) => !test(r) : test;
};

// "*, classes(name), profiles:profiles!inner(full_name), world_items(count)"
type Embed = { key: string; table: string; via?: string; count: boolean };
const parseSelect = (cols: string) => {
  const embeds: Embed[] = [];
  for (const part of splitTop(cols.replace(/\s+/g, ""))) {
    const m = /^(?:([\w]+):)?([\w]+)(?:!([\w]+))?\((.*)\)$/.exec(part);
    if (!m) continue;
    const [, alias, name, hint, inner] = m;
    // "schools:school_id(...)" names the column; "alias:table(...)" names the table
    const viaColumn = /_id$/.test(name);
    const table = viaColumn ? alias ?? `${name.slice(0, -3)}s` : name;
    embeds.push({ key: alias ?? name, table, via: viaColumn ? name : hint && /_id$/.test(hint) ? hint : undefined, count: inner === "count" });
  }
  return embeds;
};

export function createQuery(tables: Tables, table: string, latency: () => number) {
  let mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  let payload: any = null;
  let conflict: string[] | null = null;
  let returning = false;
  let head = false;
  let wantCount = false;
  let single: "one" | "maybe" | null = null;
  let embeds: Embed[] = [];
  const tests: Test[] = [];
  const orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  let from = 0;
  let to = Infinity;

  const embed = (row: Row): Row => {
    if (!embeds.length) return row;
    const out = { ...row };
    for (const e of embeds) {
      const target = tables[e.table] ?? [];
      const own = e.via ?? `${singular(e.table)}_id`;
      let found: Row | Row[] | null;
      if (e.table === "profiles") {
        const id = row.user_id ?? row.student_id ?? row.sender_id ?? row.teacher_id;
        found = target.find((p) => p.user_id === id) ?? null;
      } else if (own in row) {
        found = target.find((t) => t.id === row[own]) ?? null;
      } else {
        const back = `${singular(table)}_id`;
        const alt = table === "class_assignments" ? "assignment_id" : back;
        found = target.filter((t) => t[back] === row.id || t[alt] === row.id);
      }
      out[e.key] = e.count ? [{ count: Array.isArray(found) ? found.length : found ? 1 : 0 }] : found;
    }
    return out;
  };

  const run = () => {
    const rows = (tables[table] ||= []);
    if (mode === "insert" || mode === "upsert") {
      const list = (Array.isArray(payload) ? payload : [payload]).filter(Boolean);
      const written: Row[] = [];
      for (const raw of list) {
        const keys = conflict ?? (raw.id ? ["id"] : raw.user_id && !raw.id && ["student_study_state", "user_plans", "profiles"].includes(table) ? ["user_id"] : null);
        const existing = mode === "upsert" && keys ? rows.find((r) => keys.every((k) => r[k] === raw[k])) : undefined;
        if (existing) {
          Object.assign(existing, raw, { updated_at: now() });
          written.push(existing);
        } else {
          const row = { id: uid(), created_at: now(), updated_at: now(), ...raw };
          rows.push(row);
          written.push(row);
        }
      }
      const data = returning ? written.map((r) => ({ ...r })) : null;
      return { data: single ? data?.[0] ?? null : data, error: null, status: 201 };
    }
    const hit = rows.filter((r) => tests.every((t) => t(r)));
    if (mode === "update") {
      hit.forEach((r) => Object.assign(r, payload, payload && "updated_at" in payload ? {} : { updated_at: now() }));
      const data = returning ? hit.map((r) => ({ ...r })) : null;
      return { data: single ? data?.[0] ?? null : data, error: null, status: 200 };
    }
    if (mode === "delete") {
      tables[table] = rows.filter((r) => !hit.includes(r));
      return { data: returning ? hit : null, error: null, status: 204 };
    }
    let out = hit.slice();
    for (const o of orders.slice().reverse()) {
      out.sort((a, b) => {
        const x = a[o.col], y = b[o.col];
        if (x == null || y == null) return x == y ? 0 : (x == null) === o.nullsFirst ? -1 : 1;
        return (x < y ? -1 : x > y ? 1 : 0) * (o.asc ? 1 : -1);
      });
    }
    const count = out.length;
    out = out.slice(from, to === Infinity ? undefined : to + 1).map((r) => embed({ ...r }));
    if (head) return { data: null, error: null, count, status: 200 };
    if (single) {
      if (out.length === 0 && single === "one") return { data: null, error: { code: "PGRST116", message: "No rows found", details: "", hint: "" }, count, status: 406 };
      return { data: out[0] ?? null, error: null, count, status: 200 };
    }
    return { data: out, error: null, count: wantCount ? count : null, status: 200 };
  };

  const add = (t: Test) => (tests.push(t), proxy);
  const api: Record<string, (...a: any[]) => any> = {
    select(cols = "*", opts?: { count?: string; head?: boolean }) {
      if (mode !== "select") returning = true;
      embeds = parseSelect(String(cols));
      if (opts?.count) wantCount = true;
      if (opts?.head) head = true;
      return proxy;
    },
    insert(v: any) { mode = "insert"; payload = v; return proxy; },
    upsert(v: any, opts?: { onConflict?: string }) { mode = "upsert"; payload = v; conflict = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : null; return proxy; },
    update(v: any) { mode = "update"; payload = v; return proxy; },
    delete() { mode = "delete"; return proxy; },
    eq: (c: string, v: any) => add(op(c, "eq", v)),
    neq: (c: string, v: any) => add(op(c, "neq", v)),
    gt: (c: string, v: any) => add(op(c, "gt", v)),
    gte: (c: string, v: any) => add(op(c, "gte", v)),
    lt: (c: string, v: any) => add(op(c, "lt", v)),
    lte: (c: string, v: any) => add(op(c, "lte", v)),
    like: (c: string, v: any) => add(op(c, "like", v)),
    ilike: (c: string, v: any) => add(op(c, "ilike", v)),
    is: (c: string, v: any) => add(op(c, "is", v)),
    in: (c: string, v: any[]) => add(op(c, "in", v)),
    contains: (c: string, v: any) => add(op(c, "contains", v)),
    overlaps: (c: string, v: any) => add(op(c, "overlaps", v)),
    filter: (c: string, k: string, v: any) => add(op(c, k, typeof v === "string" ? cast(v) : v)),
    not: (c: string, k: string, v: any) => {
      const t = op(c, k, typeof v === "string" ? cast(v) : v);
      return add((r) => !t(r));
    },
    match: (o: Row) => add((r) => Object.entries(o).every(([k, v]) => r[k] == v)),
    or: (s: string) => add(parseCond(`or(${s})`)),
    textSearch: () => proxy,
    order(col: string, o?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string; referencedTable?: string }) {
      if (!o?.foreignTable && !o?.referencedTable) orders.push({ col, asc: o?.ascending ?? true, nullsFirst: o?.nullsFirst ?? false });
      return proxy;
    },
    limit(n: number) { to = from + n - 1; return proxy; },
    range(a: number, b: number) { from = a; to = b; return proxy; },
    single() { single = "one"; return proxy; },
    maybeSingle() { single = "maybe"; return proxy; },
    then(res: any, rej: any) {
      return new Promise((r) => setTimeout(() => r(run()), latency())).then(res, rej);
    },
  };
  const proxy: any = new Proxy(api, { get: (t, p) => (p in t ? t[p as string] : typeof p === "string" ? () => proxy : undefined) });
  return proxy;
}
