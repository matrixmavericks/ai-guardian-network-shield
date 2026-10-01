// A small, safe maths expression compiler for the graph block (no eval).
// Supports + - * / ^, unary minus, parentheses, |abs|, implicit
// multiplication (2x, 3(x+1), x(x-1), ax), functions and constants.

type Node =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "neg"; a: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { k: "fn"; name: string; a: Node };

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, π: Math.PI };
const NAMES = [...Object.keys(FUNCS), ...Object.keys(CONSTS)].sort((a, b) => b.length - a.length);

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const s = src.replace(/\s+/g, "").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-").replace(/\*\*/g, "^").replace(/²/g, "^2").replace(/³/g, "^3").replace(/√/g, "sqrt");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i)!;
      out.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
    } else if (/[a-zπ]/i.test(c)) {
      const rest = s.slice(i).toLowerCase();
      const name = NAMES.find((n) => rest.startsWith(n));
      // "e" only counts as Euler's number when it isn't the start of a longer known name
      if (name) { out.push({ t: "id", v: name }); i += name.length; }
      else { out.push({ t: "id", v: c.toLowerCase() }); i += 1; }
    } else if ("+-*/^()|,".includes(c)) {
      out.push({ t: "op", v: c });
      i += 1;
    } else {
      throw new Error(`Unexpected "${c}"`);
    }
  }
  return out;
}

function parse(src: string): Node {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const eat = (v: string) => { if (!isOp(v)) throw new Error(`Expected "${v}"`); p++; };

  const expr = (): Node => {
    let a = term();
    while (isOp("+") || isOp("-")) { const op = (toks[p++] as { v: "+" | "-" }).v; a = { k: "bin", op, a, b: term() }; }
    return a;
  };
  // Starts of a factor that can follow another with no operator between them
  const startsFactor = () => { const t = peek(); return !!t && (t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "(")); };
  const term = (): Node => {
    let a = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) { const op = (toks[p++] as { v: "*" | "/" }).v; a = { k: "bin", op, a, b: unary() }; }
      else if (startsFactor()) a = { k: "bin", op: "*", a, b: power() };
      else return a;
    }
  };
  const unary = (): Node => {
    if (isOp("-")) { p++; return { k: "neg", a: unary() }; }
    if (isOp("+")) { p++; return unary(); }
    return power();
  };
  const power = (): Node => {
    const base = primary();
    if (isOp("^")) { p++; return { k: "bin", op: "^", a: base, b: unary() }; }
    return base;
  };
  const primary = (): Node => {
    const t = peek();
    if (!t) throw new Error("Unexpected end");
    if (t.t === "num") { p++; return { k: "num", v: t.v }; }
    if (t.t === "op" && t.v === "(") { p++; const e = expr(); eat(")"); return e; }
    if (t.t === "op" && t.v === "|") { p++; const e = expr(); eat("|"); return { k: "fn", name: "abs", a: e }; }
    if (t.t === "id") {
      p++;
      if (FUNCS[t.v]) {
        // sin(x), or sin x / sin 2x without brackets
        if (isOp("(")) { p++; const e = expr(); eat(")"); return { k: "fn", name: t.v, a: e }; }
        return { k: "fn", name: t.v, a: power() };
      }
      if (t.v in CONSTS) return { k: "num", v: CONSTS[t.v] };
      return { k: "var", name: t.v };
    }
    throw new Error(`Unexpected "${t.v}"`);
  };
  const tree = expr();
  if (p < toks.length) throw new Error(`Unexpected "${(toks[p] as { v: unknown }).v}"`);
  return tree;
}

const run = (n: Node, vars: Record<string, number>): number => {
  switch (n.k) {
    case "num": return n.v;
    case "var": return vars[n.name] ?? NaN;
    case "neg": return -run(n.a, vars);
    case "fn": return FUNCS[n.name](run(n.a, vars));
    case "bin": {
      const a = run(n.a, vars), b = run(n.b, vars);
      switch (n.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "^": return a < 0 && !Number.isInteger(b) && Number.isInteger(1 / b) && (1 / b) % 2 === 1 ? -Math.pow(-a, b) : Math.pow(a, b);
      }
    }
  }
};

const varsIn = (n: Node, out = new Set<string>()): Set<string> => {
  if (n.k === "var") out.add(n.name);
  else if (n.k === "neg" || n.k === "fn") varsIn(n.a, out);
  else if (n.k === "bin") { varsIn(n.a, out); varsIn(n.b, out); }
  return out;
};

export type Compiled = { fn: (vars: Record<string, number>) => number; vars: string[] };

/** Compile "y = 2x^2 - 3" (or "2x^2-3"); throws a readable error for bad input. */
export function compile(expr: string): Compiled {
  const body = expr.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=/i, "");
  const tree = parse(body);
  return { fn: (vars) => run(tree, vars), vars: [...varsIn(tree)] };
}
