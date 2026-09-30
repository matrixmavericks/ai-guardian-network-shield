import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BarChart3, BookOpen, Brain, Calculator, Check, Clock, Compass, Droplet, FlaskConical, Globe2, Heart, ImagePlus, Leaf, Lightbulb,
  Loader2, Map, MessageSquare, Music, Pencil, Puzzle, RefreshCw, Rocket, Shield, Sparkles, Star, Sun, Target, Trash2, Upload, Users, Zap,
} from "lucide-react";
import { onColor, type Theme } from "./themes";
import type { Slide, SlideImage } from "./types";

// One slide at a fixed 1280×720 design size. In edit mode every text field is
// click-to-edit; images show their generation state and an action menu.

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

const ICON: Record<string, React.ElementType> = {
  lightbulb: Lightbulb, target: Target, book: BookOpen, flask: FlaskConical, leaf: Leaf, globe: Globe2, users: Users, brain: Brain,
  calculator: Calculator, clock: Clock, map: Map, heart: Heart, zap: Zap, sun: Sun, droplet: Droplet, star: Star, shield: Shield,
  compass: Compass, puzzle: Puzzle, pencil: Pencil, message: MessageSquare, chart: BarChart3, rocket: Rocket, music: Music,
};

export type ImageAction = "generate" | "regenerate" | "prompt" | "upload" | "remove";

type Ctx = {
  t: Theme;
  edit: boolean;
  set: (patch: Partial<Slide>) => void;
  onImage?: (a: ImageAction) => void;
  typing?: boolean;
};

/* ---------- editable text ---------- */

type EditableProps = {
  value?: string;
  onCommit: (v: string) => void;
  edit: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
  multiline?: boolean;
  onEnter?: (text: string) => void;
  onEmptyBackspace?: () => void;
  as?: "div" | "span";
  /** Take focus (caret at the end) when mounted */
  autoFocus?: boolean;
};

const clean = (t: string) => t.replace(/\u00a0/g, " ").trim();

// Static and editable text are separate components so switching into edit mode
// mounts a fresh node (and static markup, e.g. for PDF export, has no layout effects)
const Editable: React.FC<EditableProps> = (p) => {
  if (p.edit) return <LiveEditable {...p} />;
  const Tag = (p.as ?? "div") as React.ElementType;
  return <Tag style={p.style}>{p.value ?? ""}</Tag>;
};

const LiveEditable: React.FC<EditableProps> = ({ value = "", onCommit, style, placeholder, multiline, onEnter, onEmptyBackspace, as = "div", autoFocus }) => {
  const ref = useRef<HTMLElement>(null);
  const skipBlur = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!autoFocus || !el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      className="refyn-editable"
      style={style}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (skipBlur.current) { skipBlur.current = false; return; }
        const v = clean(e.currentTarget.innerText);
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          const el = e.currentTarget as HTMLElement;
          if (onEnter) {
            // One change: this item's text plus the new item (a blur commit first would be overwritten)
            skipBlur.current = true;
            el.blur();
            onEnter(clean(el.innerText));
          } else el.blur();
        }
        if (e.key === "Backspace" && onEmptyBackspace && !e.currentTarget.innerText.trim()) {
          e.preventDefault();
          onEmptyBackspace();
        }
        if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
    />
  );
};

/** An editable list of strings (bullets, points). */
const EditableList: React.FC<{
  items: string[];
  onChange: (items: string[]) => void;
  edit: boolean;
  render: (node: React.ReactNode, i: number) => React.ReactNode;
  style?: React.CSSProperties;
  max?: number;
}> = ({ items, onChange, edit, render, style, max = 8 }) => {
  // Which item takes the caret after Enter or Backspace re-keys the list
  const focusAt = useRef<number | null>(null);
  const focus = focusAt.current;
  useEffect(() => { focusAt.current = null; });
  return (
    <>
      {items.map((b, i) =>
        render(
          <Editable
            key={`${i}-${items.length}`}
            value={b}
            edit={edit}
            style={style}
            placeholder="Type a point"
            autoFocus={focus === i}
            onCommit={(v) => onChange(items.map((x, k) => (k === i ? v : x)).filter((x, k) => x || k === i))}
            onEnter={(text) => {
              const next = items.map((x, k) => (k === i ? text : x));
              if (items.length >= max) return onChange(next);
              focusAt.current = i + 1;
              onChange([...next.slice(0, i + 1), "", ...next.slice(i + 1)]);
            }}
            onEmptyBackspace={() => {
              if (items.length < 2) return;
              focusAt.current = Math.max(0, i - 1);
              onChange(items.filter((_, k) => k !== i));
            }}
          />,
          i,
        ),
      )}
    </>
  );
};

/* ---------- image ---------- */

const ImageBox: React.FC<{ image?: SlideImage; c: Ctx; style?: React.CSSProperties; radius?: number }> = ({ image, c, style, radius = 28 }) => {
  const { t } = c;
  const busy = image?.state === "generating" || image?.state === "pending";
  return (
    <div className="group/img" style={{ position: "relative", overflow: "hidden", borderRadius: radius, background: t.dark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)", ...style }}>
      {image?.url && <img src={image.url} alt={image.alt ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />}
      {busy && (
        <div className="refyn-shimmer" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: t.muted, fontSize: 20 }}>
          <Sparkles style={{ width: 34, height: 34, color: t.accent }} className={image?.state === "generating" ? "animate-pulse" : ""} />
          {image?.state === "generating" ? "Creating image…" : "Image queued"}
        </div>
      )}
      {!image?.url && !busy && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: t.muted, fontSize: 20, textAlign: "center", padding: 24 }}>
          <ImagePlus style={{ width: 40, height: 40, color: t.accent, opacity: 0.8 }} />
          {image?.state === "error" ? <span>{image.error ?? "Couldn't make this image"}</span> : c.edit ? <span>Add an image</span> : null}
          {c.edit && (
            <button type="button" onClick={() => c.onImage?.(image?.prompt ? "generate" : "prompt")} style={{ fontSize: 18, fontWeight: 600, color: onColor(t.accent), background: t.accent, borderRadius: 999, padding: "10px 22px" }}>
              {image?.prompt ? "Generate image" : "Describe an image"}
            </button>
          )}
        </div>
      )}
      {c.edit && image?.url && !busy && (
        <div className="refyn-img-actions" style={{ position: "absolute", right: 16, top: 16, display: "flex", gap: 8 }}>
          {([["regenerate", RefreshCw, "Regenerate"], ["prompt", Pencil, "Change the picture"], ["upload", Upload, "Upload your own"], ["remove", Trash2, "Remove"]] as const).map(([a, Icon, label]) => (
            <button key={a} type="button" title={label} aria-label={label} onClick={() => c.onImage?.(a)} style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,12,20,0.72)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
              <Icon style={{ width: 20, height: 20 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- decoration ---------- */

const Motif: React.FC<{ t: Theme; variant: number }> = ({ t, variant }) => {
  if (t.motif === "glow")
    return <div aria-hidden style={{ position: "absolute", width: 620, height: 620, right: variant % 2 ? -220 : "auto", left: variant % 2 ? "auto" : -260, top: -260, borderRadius: "50%", background: `radial-gradient(closest-side, ${t.accent}55, transparent)`, filter: "blur(10px)" }} />;
  if (t.motif === "grid")
    return <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: `linear-gradient(${t.dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.045)"} 1px, transparent 1px), linear-gradient(90deg, ${t.dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.045)"} 1px, transparent 1px)`, backgroundSize: "64px 64px", maskImage: "linear-gradient(135deg, transparent 40%, black)", WebkitMaskImage: "linear-gradient(135deg, transparent 40%, black)" }} />;
  if (t.motif === "blob")
    return (
      <>
        <div aria-hidden style={{ position: "absolute", width: 520, height: 520, right: -160, bottom: -200, borderRadius: "50%", background: `radial-gradient(closest-side, ${t.accent2}44, transparent)` }} />
        <div aria-hidden style={{ position: "absolute", width: 420, height: 420, right: 180 + (variant % 3) * 40, top: -220, borderRadius: "50%", background: `radial-gradient(closest-side, ${t.accent}40, transparent)` }} />
      </>
    );
  if (t.motif === "rule") return <div aria-hidden style={{ position: "absolute", left: 72, right: 72, top: 48, height: 3, background: t.accent, opacity: 0.9 }} />;
  return null;
};

/* ---------- the slide ---------- */

export const SlideView: React.FC<{
  slide: Slide;
  theme: Theme;
  index: number;
  total: number;
  deckTitle: string;
  edit?: boolean;
  typing?: boolean;
  onChange?: (patch: Partial<Slide>) => void;
  onImage?: (a: ImageAction) => void;
}> = ({ slide: s, theme: t, index, total, deckTitle, edit = false, typing, onChange, onImage }) => {
  const c: Ctx = { t, edit, set: (p) => onChange?.(p), onImage, typing };
  const bgMode = s.background ?? "default";
  const onAccent = bgMode === "accent";
  const fg = onAccent ? onColor(t.accent) : bgMode === "image" && s.image?.url ? "#FFFFFF" : t.text;
  const muted = onAccent ? `${onColor(t.accent)}CC` : bgMode === "image" && s.image?.url ? "rgba(255,255,255,0.82)" : t.muted;
  const H = (size: number, extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: `"${t.heading}", "Inter Tight", system-ui, sans-serif`, fontWeight: t.headingWeight, fontSize: size, lineHeight: 1.06,
    letterSpacing: t.headingCase === "uppercase" ? "0.01em" : "-0.025em", textTransform: t.headingCase === "uppercase" ? "uppercase" : "none", color: fg, margin: 0, ...extra,
  });
  const B = (size: number, extra?: React.CSSProperties): React.CSSProperties => ({ fontFamily: `"${t.body}", "Inter", system-ui, sans-serif`, fontSize: size, lineHeight: 1.45, color: fg, margin: 0, ...extra });
  const pill: React.CSSProperties = { display: "inline-block", fontFamily: `"${t.body}", Inter, sans-serif`, fontSize: 17, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: onAccent ? fg : t.accent, background: onAccent ? "rgba(255,255,255,0.18)" : `${t.accent}1F`, padding: "8px 16px", borderRadius: 999 };
  const card: React.CSSProperties = { background: onAccent ? "rgba(255,255,255,0.14)" : t.surface, borderRadius: 24, border: t.dark || onAccent ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.08)", boxShadow: t.dark ? "none" : "0 18px 50px -30px rgba(15,23,42,0.35)" };
  const text = (k: keyof Slide, style: React.CSSProperties, placeholder: string, multiline = false) => (
    <Editable value={(s[k] as string) ?? ""} edit={edit} style={style} placeholder={placeholder} multiline={multiline} onCommit={(v) => c.set({ [k]: v } as Partial<Slide>)} />
  );
  const Title = (size = 54, extra?: React.CSSProperties) => text("title", H(size, extra), "Slide title");
  // An empty optional field takes no space (the editor matches the presented slide) and shows on hover
  const optional = (k: keyof Slide, style: React.CSSProperties, placeholder: string, gap: number) =>
    s[k] ? (
      <div style={{ marginBottom: gap }}>{text(k, style, placeholder)}</div>
    ) : edit ? (
      <div className="refyn-opt" style={{ position: "relative", height: 0 }}>
        <div style={{ position: "absolute", left: 0, bottom: 12, whiteSpace: "nowrap" }}>{text(k, style, placeholder)}</div>
      </div>
    ) : null;
  const list = (items: string[] | undefined, key: keyof Slide, size: number, marker: (i: number) => React.ReactNode) => (
    <EditableList
      items={items ?? []}
      edit={edit}
      onChange={(v) => c.set({ [key]: v } as Partial<Slide>)}
      style={B(size, { flex: 1 })}
      render={(node, i) => (
        <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          {marker(i)}
          {node}
        </div>
      )}
    />
  );
  const dot = () => <span style={{ flexShrink: 0, width: 12, height: 12, borderRadius: 4, marginTop: 14, background: onAccent ? fg : t.accent, transform: "rotate(45deg)" }} />;

  let content: React.ReactNode;
  switch (s.layout) {
    case "title": {
      const bleed = bgMode === "image" && s.image;
      content = bleed ? (
        <div style={{ position: "absolute", left: 88, right: 88, bottom: 90 }}>
          {optional("eyebrow", { ...pill, color: "#fff", background: "rgba(255,255,255,0.18)" }, "Eyebrow", 22)}
          {Title(84, { maxWidth: 980 })}
          <div style={{ marginTop: 22, maxWidth: 820 }}>{text("subtitle", B(28, { color: muted }), "Subtitle", true)}</div>
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: s.image ? "1.15fr 1fr" : "1fr", alignItems: "center", gap: 56, padding: "72px 72px 72px 88px" }}>
          <div>
            {optional("eyebrow", pill, "Eyebrow", 26)}
            {Title(s.image ? 72 : 92)}
            <div style={{ marginTop: 26, maxWidth: 640 }}>{text("subtitle", B(28, { color: muted }), "Subtitle", true)}</div>
            <div style={{ marginTop: 40, width: 96, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }} />
          </div>
          {s.image && <ImageBox image={s.image} c={c} style={{ height: 560 }} radius={32} />}
        </div>
      );
      break;
    }
    case "section":
      content = (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 120px" }}>
          <div style={{ marginBottom: 24 }}>{text("eyebrow", pill, "Part")}</div>
          {Title(96, { maxWidth: 1000 })}
          <div style={{ marginTop: 28, maxWidth: 820 }}>{text("subtitle", B(30, { color: muted }), "What this part covers", true)}</div>
          <div aria-hidden style={{ position: "absolute", left: 72, top: 200, bottom: 200, width: 8, borderRadius: 4, background: `linear-gradient(${t.accent}, ${t.accent2})` }} />
        </div>
      );
      break;
    case "bullets":
    case "closing":
      content = (
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: s.image ? "1.2fr 1fr" : "1fr", gap: 56, padding: "84px 80px 90px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {s.layout === "closing" && optional("eyebrow", pill, "To finish", 18)}
            {Title(s.layout === "closing" ? 62 : 52)}
            {s.subtitle !== undefined && <div style={{ marginTop: 14 }}>{text("subtitle", B(24, { color: muted }), "Subtitle", true)}</div>}
            <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 22 }}>
              {list(s.bullets, "bullets", s.image ? 26 : 29, (i) =>
                s.layout === "closing" ? (
                  <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: onAccent ? "rgba(255,255,255,0.2)" : `${t.accent}22`, color: onAccent ? fg : t.accent, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                    <Check style={{ width: 22, height: 22 }} />
                  </span>
                ) : (
                  <span style={{ flexShrink: 0, fontFamily: `"${t.heading}", sans-serif`, fontWeight: 700, fontSize: 20, width: 38, height: 38, borderRadius: 12, background: onAccent ? "rgba(255,255,255,0.2)" : `${t.accent}1F`, color: onAccent ? fg : t.accent, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {i + 1}
                  </span>
                ),
              )}
            </div>
          </div>
          {s.image && <ImageBox image={s.image} c={c} style={{ height: "100%" }} />}
        </div>
      );
      break;
    case "split": {
      const left = s.imageSide === "left";
      content = (
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ order: left ? 2 : 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: left ? "72px 88px 72px 64px" : "72px 64px 72px 88px" }}>
            {optional("eyebrow", pill, "Eyebrow", 20)}
            {Title(50)}
            <div style={{ marginTop: 24 }}>{text("body", B(25, { color: muted }), "Explain the idea", true)}</div>
            {(s.bullets?.length ?? 0) > 0 && <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>{list(s.bullets, "bullets", 23, dot)}</div>}
          </div>
          <div style={{ order: left ? 1 : 2, padding: 28 }}>
            <ImageBox image={s.image} c={c} style={{ height: "100%" }} radius={30} />
          </div>
        </div>
      );
      break;
    }
    case "cards": {
      const cards = s.cards ?? [];
      content = (
        <div style={{ position: "absolute", inset: 0, padding: "80px 72px", display: "flex", flexDirection: "column" }}>
          {Title(50)}
          <div style={{ marginTop: 48, flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, cards.length)}, 1fr)`, gap: 24 }}>
            {cards.map((cd, i) => {
              const Icon = ICON[cd.icon ?? ""] ?? Lightbulb;
              const upd = (p: Partial<typeof cd>) => c.set({ cards: cards.map((x, k) => (k === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} style={{ ...card, padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
                  <span style={{ width: 60, height: 60, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: i % 2 ? `${t.accent2}26` : `${t.accent}26`, color: i % 2 ? t.accent2 : t.accent }}>
                    <Icon style={{ width: 30, height: 30 }} />
                  </span>
                  <Editable value={cd.title} edit={edit} onCommit={(v) => upd({ title: v })} style={H(28, { lineHeight: 1.15 })} placeholder="Card title" />
                  <Editable value={cd.body} edit={edit} multiline onCommit={(v) => upd({ body: v })} style={B(21, { color: muted })} placeholder="A sentence about it" />
                </div>
              );
            })}
          </div>
        </div>
      );
      break;
    }
    case "stats": {
      const stats = s.stats ?? [];
      content = (
        <div style={{ position: "absolute", inset: 0, padding: "84px 80px", display: "flex", flexDirection: "column" }}>
          {Title(50)}
          <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, stats.length)}, 1fr)`, gap: 28 }}>
            {stats.map((st, i) => {
              const upd = (p: Partial<typeof st>) => c.set({ stats: stats.map((x, k) => (k === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} style={{ borderTop: `4px solid ${i % 2 ? t.accent2 : t.accent}`, paddingTop: 24 }}>
                  <Editable value={st.value} edit={edit} onCommit={(v) => upd({ value: v })} style={H(stats.length > 3 ? 76 : 96, { color: onAccent ? fg : i % 2 ? t.accent2 : t.accent, letterSpacing: "-0.04em" })} placeholder="72%" />
                  <Editable value={st.label} edit={edit} multiline onCommit={(v) => upd({ label: v })} style={B(23, { color: muted, marginTop: 10 })} placeholder="What it measures" />
                </div>
              );
            })}
          </div>
          {(s.body || edit) && <div style={{ marginTop: "auto", maxWidth: 1000 }}>{text("body", B(23, { color: muted }), "Why it matters", true)}</div>}
        </div>
      );
      break;
    }
    case "quote":
      content = (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
          <div aria-hidden style={{ ...H(220, { color: t.accent, lineHeight: 0.6, height: 110, opacity: 0.9 }) }}>“</div>
          {text("quote", H(50, { lineHeight: 1.18, fontStyle: t.heading === "Fraunces" || t.heading.includes("Serif") || t.heading.includes("Playfair") ? "italic" : "normal", textTransform: "none", letterSpacing: "-0.015em" }), "The quotation", true)}
          <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ width: 44, height: 3, background: t.accent }} />
            {text("by", B(24, { fontWeight: 600 }), "Who said it")}
          </div>
          {(s.subtitle || edit) && <div style={{ marginTop: 12, marginLeft: 60 }}>{text("subtitle", B(20, { color: muted }), "Context", true)}</div>}
        </div>
      );
      break;
    case "steps": {
      const steps = s.steps ?? [];
      const vertical = steps.length > 4;
      content = (
        <div style={{ position: "absolute", inset: 0, padding: "80px 72px", display: "flex", flexDirection: "column" }}>
          {Title(50)}
          <div style={{ marginTop: 56, position: "relative", display: "grid", gridTemplateColumns: vertical ? "1fr 1fr" : `repeat(${Math.max(1, steps.length)}, 1fr)`, gap: vertical ? "26px 48px" : 28 }}>
            {!vertical && <div aria-hidden style={{ position: "absolute", left: 30, right: 30, top: 30, height: 3, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`, opacity: 0.6 }} />}
            {steps.map((st, i) => {
              const upd = (p: Partial<typeof st>) => c.set({ steps: steps.map((x, k) => (k === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} style={{ position: "relative", display: vertical ? "flex" : "block", gap: 20 }}>
                  <span style={{ position: "relative", zIndex: 1, flexShrink: 0, width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: t.accent, color: onColor(t.accent), ...H(26, { color: onColor(t.accent), textTransform: "none" }) }}>{i + 1}</span>
                  <div style={{ marginTop: vertical ? 4 : 24 }}>
                    <Editable value={st.title} edit={edit} onCommit={(v) => upd({ title: v })} style={H(26, { lineHeight: 1.15 })} placeholder="Step" />
                    <Editable value={st.body} edit={edit} multiline onCommit={(v) => upd({ body: v })} style={B(20, { color: muted, marginTop: 8 })} placeholder="What happens" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
      break;
    }
    case "compare": {
      const side = (k: "left" | "right", color: string) => {
        const v = s[k] ?? { heading: "", points: [] };
        return (
          <div style={{ ...card, padding: 36, borderTop: `6px solid ${color}` }}>
            <Editable value={v.heading} edit={edit} onCommit={(h) => c.set({ [k]: { ...v, heading: h } } as Partial<Slide>)} style={H(32, { color })} placeholder="Heading" />
            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <EditableList items={v.points} edit={edit} onChange={(p) => c.set({ [k]: { ...v, points: p } } as Partial<Slide>)} style={B(23, { flex: 1 })} render={(node, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <span style={{ flexShrink: 0, width: 9, height: 9, borderRadius: "50%", background: color, marginTop: 13 }} />
                  {node}
                </div>
              )} />
            </div>
          </div>
        );
      };
      content = (
        <div style={{ position: "absolute", inset: 0, padding: "80px 72px", display: "flex", flexDirection: "column" }}>
          {Title(50)}
          <div style={{ marginTop: 44, position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44 }}>
            {side("left", t.accent)}
            {side("right", t.accent2)}
            <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 64, height: 64, borderRadius: "50%", background: t.dark ? t.bg : "#fff", border: `2px solid ${t.dark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", ...H(22, { textTransform: "uppercase" }) }}>vs</span>
          </div>
        </div>
      );
      break;
    }
    case "table": {
      const cols = s.columns ?? [];
      const rows = s.rows ?? [];
      const cell = (v: string, onCommit: (x: string) => void, head: boolean) => (
        <Editable value={v} edit={edit} onCommit={onCommit} style={head ? B(21, { fontWeight: 700, color: onAccent ? fg : t.accent }) : B(20)} placeholder="…" />
      );
      content = (
        <div style={{ position: "absolute", inset: 0, padding: "80px 72px", display: "flex", flexDirection: "column" }}>
          {Title(48)}
          <div style={{ ...card, marginTop: 40, overflow: "hidden", padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: `${t.accent}1A` }}>
                  {cols.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "18px 24px" }}>{cell(h, (v) => c.set({ columns: cols.map((x, k) => (k === i ? v : x)) }), true)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} style={{ borderTop: `1px solid ${t.dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}` }}>
                    {cols.map((_, ci) => <td key={ci} style={{ padding: "16px 24px", verticalAlign: "top" }}>{cell(r[ci] ?? "", (v) => c.set({ rows: rows.map((row, k) => (k === ri ? cols.map((__, j) => (j === ci ? v : row[j] ?? "")) : row)) }), false)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      break;
    }
    case "question": {
      const opts = s.options ?? [];
      content = (
        <div style={{ position: "absolute", inset: 0, padding: "84px 96px", display: "flex", flexDirection: "column" }}>
          <div>{text("eyebrow", pill, "Quick check")}</div>
          <div style={{ marginTop: 28 }}>{text("question", H(opts.length ? 50 : 64, { lineHeight: 1.12, textTransform: "none" }), "Your question?", true)}</div>
          {opts.length > 0 && (
            <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {opts.map((o, i) => (
                <div key={i} style={{ ...card, padding: "22px 26px", display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: t.accent, ...H(22, { color: onColor(t.accent), textTransform: "none" }) }}>{String.fromCharCode(65 + i)}</span>
                  <Editable value={o} edit={edit} onCommit={(v) => c.set({ options: opts.map((x, k) => (k === i ? v : x)) })} style={B(24)} placeholder="Option" />
                </div>
              ))}
            </div>
          )}
          {edit && (
            <div style={{ marginTop: "auto", border: `2px dashed ${t.dark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.18)"}`, borderRadius: 16, padding: "12px 18px", display: "flex", gap: 12, alignItems: "baseline" }}>
              <span style={B(16, { fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 })}>Answer · hidden when presenting</span>
              {text("answer", B(20, { color: muted }), "The answer", true)}
            </div>
          )}
        </div>
      );
      break;
    }
    case "image":
      content = (
        <>
          <ImageBox image={s.image} c={c} style={{ position: "absolute", inset: 0 }} radius={0} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "120px 80px 60px", background: "linear-gradient(transparent, rgba(0,0,0,0.72))", pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}>
              {text("title", H(52, { color: "#fff" }), "Title")}
              <div style={{ marginTop: 12 }}>{text("subtitle", B(24, { color: "rgba(255,255,255,0.85)" }), "Caption", true)}</div>
            </div>
          </div>
        </>
      );
      break;
  }

  const imageBg = bgMode === "image" && s.image?.url && s.layout !== "image";
  return (
    <div
      className="refyn-slide"
      style={{
        position: "relative", width: SLIDE_W, height: SLIDE_H, overflow: "hidden", color: fg,
        background: onAccent ? `linear-gradient(135deg, ${t.accent}, ${t.accent2})` : t.bgCss, fontFamily: `"${t.body}", Inter, sans-serif`,
      }}
    >
      {imageBg && (
        <>
          <img src={s.image!.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.72))" }} />
        </>
      )}
      {!imageBg && !onAccent && s.layout !== "image" && <Motif t={t} variant={index} />}
      {content}
      {s.layout !== "image" && s.layout !== "title" && (
        <div style={{ position: "absolute", left: s.layout === "split" && s.imageSide === "left" ? 704 : 80, right: s.layout === "split" && s.imageSide !== "left" ? 704 : 80, bottom: 30, display: "flex", justifyContent: "space-between", fontSize: 15, color: muted, fontFamily: `"${t.body}", Inter, sans-serif`, opacity: 0.8 }}>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 700 }}>{deckTitle}</span>
          <span>{index + 1} / {total}</span>
        </div>
      )}
      {typing && <span aria-hidden className="refyn-typing" style={{ position: "absolute", right: 28, top: 26, display: "flex", alignItems: "center", gap: 8, fontSize: 16, color: t.accent, fontFamily: "Inter, sans-serif" }}><Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> Writing…</span>}
    </div>
  );
};

/** Renders a slide scaled to the width of its container. */
export const ScaledSlide: React.FC<{ className?: string; children: React.ReactNode; rounded?: number }> = ({ className, children, rounded = 18 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / SLIDE_W));
    ro.observe(el);
    setScale(el.clientWidth / SLIDE_W);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: rounded }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
};

/** Global styles for editable text and shimmer (inject once). */
export const DECK_CSS = `
.refyn-editable { outline: none; border-radius: 6px; transition: box-shadow .15s; cursor: text; }
.refyn-editable:hover { box-shadow: 0 0 0 2px rgba(99,139,255,.35); }
.refyn-editable:focus { box-shadow: 0 0 0 3px rgba(99,139,255,.75); }
.refyn-editable:empty::before { content: attr(data-placeholder); opacity: .38; }
.refyn-opt { opacity: 0; transition: opacity .15s; }
.refyn-slide:hover .refyn-opt, .refyn-opt:focus-within { opacity: 1; }
.refyn-shimmer { background: linear-gradient(100deg, rgba(255,255,255,0) 20%, rgba(255,255,255,.12) 45%, rgba(255,255,255,0) 70%); background-size: 250% 100%; animation: refyn-shim 1.6s linear infinite; }
@keyframes refyn-shim { from { background-position: 150% 0 } to { background-position: -100% 0 } }
.refyn-img-actions { opacity: 0; transition: opacity .15s; }
.group\\/img:hover .refyn-img-actions { opacity: 1; }
`;
