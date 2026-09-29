import React from "react";

export type CardCred = { id: string; password: string };
export type CardSize = "large" | "medium" | "small";

/** Cards per A4 page and their size in millimetres (printable area 190 × 277 mm). */
export const CARD_LAYOUT: Record<CardSize, { cols: number; rows: number; label: string }> = {
  large: { cols: 3, rows: 4, label: "12 per page" },
  medium: { cols: 4, rows: 5, label: "20 per page" },
  small: { cols: 5, rows: 6, label: "30 per page" },
};

const W_MM = 190;
const H_MM = 277;

/**
 * Printable sheets of square-ish login cards with dashed cut lines.
 * Pure black-on-white so they photocopy well; no names anywhere.
 */
export const LoginCards = React.forwardRef<
  HTMLDivElement,
  { creds: CardCred[]; size: CardSize; loginUrl: string; school: string; instructions: boolean }
>(({ creds, size, loginUrl, school, instructions }, ref) => {
  const { cols, rows } = CARD_LAYOUT[size];
  const per = cols * rows;
  const pages: CardCred[][] = [];
  for (let i = 0; i < creds.length; i += per) pages.push(creds.slice(i, i + per));
  const cw = W_MM / cols;
  const ch = H_MM / rows;
  const scale = size === "large" ? 1 : size === "medium" ? 0.8 : 0.66;
  const mm = (v: number) => `${v}mm`;
  return (
    <div ref={ref} className="bg-[#FFFFFF] text-[#111827]" style={{ fontFamily: '"Inter Tight", Arial, sans-serif' }}>
      {pages.map((page, p) => (
        <div
          key={p}
          className={p > 0 ? "ws-page-break" : undefined}
          style={{ width: mm(W_MM), height: mm(H_MM), display: "grid", gridTemplateColumns: `repeat(${cols}, ${mm(cw)})`, gridTemplateRows: `repeat(${rows}, ${mm(ch)})`, boxSizing: "border-box" }}
        >
          {page.map((c, i) => (
            <div
              key={c.id}
              style={{
                boxSizing: "border-box",
                border: "0.3mm dashed #9CA3AF",
                marginLeft: i % cols ? "-0.3mm" : 0,
                marginTop: Math.floor(i / cols) ? "-0.3mm" : 0,
                padding: `${3.5 * scale}mm`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "2mm" }}>
                <span style={{ fontWeight: 700, fontSize: `${13 * scale}pt`, letterSpacing: "-0.02em" }}>
                  Refyn<span style={{ color: "#2563EB" }}>.</span>
                </span>
                <span style={{ fontSize: `${6.5 * scale}pt`, color: "#6B7280", textAlign: "right", lineHeight: 1.15 }}>{school}</span>
              </div>
              <div>
                <p style={{ fontSize: `${6.5 * scale}pt`, fontWeight: 700, letterSpacing: "0.14em", color: "#6B7280", margin: 0 }}>STUDENT ID</p>
                <p style={{ fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace', fontWeight: 700, fontSize: `${(c.id.length > 12 ? 11 : 13) * scale}pt`, margin: `${0.6 * scale}mm 0 ${2.2 * scale}mm`, letterSpacing: "0.02em", wordBreak: "break-all" }}>{c.id}</p>
                <p style={{ fontSize: `${6.5 * scale}pt`, fontWeight: 700, letterSpacing: "0.14em", color: "#6B7280", margin: 0 }}>PASSWORD</p>
                <p style={{ fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace', fontWeight: 700, fontSize: `${12 * scale}pt`, margin: `${0.6 * scale}mm 0 0`, letterSpacing: "0.02em" }}>{c.password}</p>
              </div>
              <div style={{ borderTop: "0.25mm solid #E5E7EB", paddingTop: `${1.4 * scale}mm`, fontSize: `${6.8 * scale}pt`, lineHeight: 1.3, color: "#374151" }}>
                <p style={{ margin: 0 }}>
                  Sign in at <b>{loginUrl}</b>
                </p>
                {instructions && size !== "small" && <p style={{ margin: `${0.6 * scale}mm 0 0` }}>Then join your class with the code your teacher gives you. Keep this card private.</p>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});
LoginCards.displayName = "LoginCards";
