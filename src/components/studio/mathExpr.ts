/**
 * A small, safe maths expression parser for plotting (no eval).
 * Supports numbers, x, pi, e, + - * / ^, implicit multiplication (2x, 3(x+1), x sin x),
 * unary minus and the functions below. Returns null for anything it can't read.
 */

type Node =
  | { k: "num"; v: number }
  | { k: "var" }
  | { k: "neg"; a: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { k: "fn"; name: string; a: Node };

const FNS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
};

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

const tokenize = (src: string): Tok[] | null => {
  const s = src
    .replace(/\s+/g, "")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/π/g, "pi")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√/g, "sqrt");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const v = Number(s.slice(i, j));
      if (Number.isNaN(v)) return null;
      out.push({ t: "num", v });
      i = j;
    } else if (/[a-z]/i.test(c)) {
      let j = i;
      while (j < s.length && /[a-z]/i.test(s[j])) j++;
      let word = s.slice(i, j).toLowerCase();
      // split things like "xsin" or "2pix" into known pieces
      while (word) {
        const known = ["asin", "acos", "atan", "sqrt", "floor", "ceil", "sin", "cos", "tan", "abs", "exp", "log", "ln", "pi", "x", "e"].find((k) => word.startsWith(k));
        if (!known) return null;
        out.push({ t: "id", v: known });
        word = word.slice(known.length);
      }
      i = j;
    } else if ("+-*/^()".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else return null;
  }
  // implicit multiplication
  const res: Tok[] = [];
  for (let k = 0; k < out.length; k++) {
    const a = res[res.length - 1];
    const b = out[k];
    const aEnds = a && (a.t === "num" || (a.t === "id" && !(a.v in FNS)) || (a.t === "op" && a.v === ")"));
    const bStarts = b.t === "num" || b.t === "id" || (b.t === "op" && b.v === "(");
    if (aEnds && bStarts) res.push({ t: "op", v: "*" });
    res.push(b);
  }
  return res;
};

const parse = (toks: Tok[]): Node | null => {
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const expr = (): Node | null => {
    let left = term();
    while (left && (isOp("+") || isOp("-"))) {
      const op = (toks[p++] as { v: "+" | "-" }).v;
      const right = term();
      if (!right) return null;
      left = { k: "bin", op, a: left, b: right };
    }
    return left;
  };
  const term = (): Node | null => {
    let left = unary();
    while (left && (isOp("*") || isOp("/"))) {
      const op = (toks[p++] as { v: "*" | "/" }).v;
      const right = unary();
      if (!right) return null;
      left = { k: "bin", op, a: left, b: right };
    }
    return left;
  };
  const unary = (): Node | null => {
    if (isOp("-")) {
      p++;
      const a = unary();
      return a ? { k: "neg", a } : null;
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return power();
  };
  const power = (): Node | null => {
    const base = atom();
    if (base && isOp("^")) {
      p++;
      const exp = unary();
      return exp ? { k: "bin", op: "^", a: base, b: exp } : null;
    }
    return base;
  };
  const atom = (): Node | null => {
    const t = toks[p++];
    if (!t) return null;
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "id") {
      if (t.v === "x") return { k: "var" };
      if (t.v === "pi") return { k: "num", v: Math.PI };
      if (t.v === "e") return { k: "num", v: Math.E };
      if (t.v in FNS) {
        const a = isOp("(") ? atom() : power();
        return a ? { k: "fn", name: t.v, a } : null;
      }
      return null;
    }
    if (t.v === "(") {
      const e = expr();
      if (!isOp(")")) return null;
      p++;
      return e;
    }
    return null;
  };
  const tree = expr();
  return tree && p === toks.length ? tree : null;
};

const evalNode = (n: Node, x: number): number => {
  switch (n.k) {
    case "num":
      return n.v;
    case "var":
      return x;
    case "neg":
      return -evalNode(n.a, x);
    case "fn":
      return FNS[n.name](evalNode(n.a, x));
    case "bin": {
      const a = evalNode(n.a, x);
      const b = evalNode(n.b, x);
      return n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : n.op === "/" ? a / b : Math.pow(a, b);
    }
  }
};

/** Compile "y = 2x^2 - 3" (or just the right-hand side) into f(x); null if unreadable. */
export const compile = (src: string): ((x: number) => number) | null => {
  const rhs = src.includes("=") ? src.split("=").pop()! : src;
  const toks = tokenize(rhs);
  if (!toks || !toks.length) return null;
  const tree = parse(toks);
  if (!tree) return null;
  return (x: number) => evalNode(tree, x);
};

/** Tidy number for labels: 3, 2.5, 0.33 */
export const nice = (v: number, dp = 2) => {
  const r = Math.round(v * 10 ** dp) / 10 ** dp;
  return Object.is(r, -0) ? "0" : String(r);
};
