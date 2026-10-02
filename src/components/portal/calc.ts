// A small calculator for the command palette. It parses the expression
// itself (no eval): + - * / ^, brackets, implicit multiplication (2pi, 3(4+1)),
// percent and factorial, constants pi and e, and common functions. Trig works
// in degrees, as in school.

type Tok = { t: "n"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

const FN: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sin: (d) => Math.sin((d * Math.PI) / 180),
  cos: (d) => Math.cos((d * Math.PI) / 180),
  tan: (d) => Math.tan((d * Math.PI) / 180),
  asin: (x) => (Math.asin(x) * 180) / Math.PI,
  acos: (x) => (Math.acos(x) * 180) / Math.PI,
  atan: (x) => (Math.atan(x) * 180) / Math.PI,
};
const CONST: Record<string, number> = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };

const lex = (src: string): Tok[] | null => {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " ") {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(src.slice(i));
    if (num) {
      out.push({ t: "n", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = /^[a-z]+/.exec(src.slice(i));
    if (id) {
      if (!(id[0] in FN) && !(id[0] in CONST)) return null;
      out.push({ t: "id", v: id[0] });
      i += id[0].length;
      continue;
    }
    if ("+-*/^()%!".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    return null;
  }
  return out;
};

const fact = (n: number) => {
  if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
};

const parse = (toks: Tok[]) => {
  let i = 0;
  const peek = () => toks[i];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const startsPrimary = () => {
    const p = peek();
    return !!p && (p.t === "n" || p.t === "id" || (p.t === "op" && p.v === "("));
  };

  const expr = (): number => {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[i++].v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const term = (): number => {
    let v = power();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = toks[i++].v;
        const r = power();
        v = op === "*" ? v * r : v / r;
      } else if (startsPrimary()) v *= power();
      else return v;
    }
  };
  const power = (): number => {
    const b = unary();
    if (isOp("^")) {
      i++;
      return Math.pow(b, power());
    }
    return b;
  };
  const unary = (): number => {
    if (isOp("-")) {
      i++;
      return -unary();
    }
    if (isOp("+")) {
      i++;
      return unary();
    }
    return postfix();
  };
  const postfix = (): number => {
    let v = primary();
    while (isOp("!") || isOp("%")) v = toks[i++].v === "!" ? fact(v) : v / 100;
    return v;
  };
  const primary = (): number => {
    const p = toks[i++];
    if (!p) throw new Error("end");
    if (p.t === "n") return p.v;
    if (p.t === "id") {
      if (p.v in CONST) return CONST[p.v];
      // sqrt(2) or, without brackets, sqrt 2 and sin30
      if (!isOp("(")) return FN[p.v](postfix());
      i++;
      const arg = expr();
      if (!isOp(")")) throw new Error("close");
      i++;
      return FN[p.v](arg);
    }
    if (p.v === "(") {
      const v = expr();
      if (!isOp(")")) throw new Error("close");
      i++;
      return v;
    }
    throw new Error("token");
  };

  const v = expr();
  if (i !== toks.length) throw new Error("trailing");
  return v;
};

/** Round to something readable: 10 significant figures, no trailing zeros. */
export const showNumber = (v: number) => {
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return v.toLocaleString("en-GB");
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e12 || a < 1e-6)) return v.toExponential(6).replace(/\.?0+e/, "e");
  return String(Number(v.toPrecision(10)));
};

/** The value of `input` if it is a sum worth answering, else null. */
export const calc = (input: string): { value: number; text: string; degrees: boolean } | null => {
  const src = input.toLowerCase().replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/(\d),(?=\d{3}\b)/g, "$1").trim();
  if (!src || src.length > 120) return null;
  // Needs an operator or a function, so a plain number or word isn't "answered"
  if (!/[-+*/^%!()]/.test(src) && !/[a-z]{2,}\s*[\d(.]/.test(src) && !/\d\s*(pi|tau|e)\b/.test(src)) return null;
  if (/^[-+]?\d*\.?\d+$/.test(src)) return null;
  const toks = lex(src);
  if (!toks || !toks.length) return null;
  try {
    const value = parse(toks);
    if (!Number.isFinite(value)) return null;
    return { value, text: showNumber(value), degrees: /sin|cos|tan/.test(src) };
  } catch {
    return null;
  }
};
