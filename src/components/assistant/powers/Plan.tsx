import React, { useMemo } from "react";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { BookMarked, CalendarPlus, CalendarRange, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanItem, PlanSpec } from "./blocks";
import { Card, CardHead, chip, download, ghost, primary, safeName, useSaved } from "./ui";

/* ---------- calendar file (.ics) ---------- */

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Lines over 75 octets are folded with a leading space (RFC 5545)
const fold = (line: string) => line.length <= 74 ? line : line.match(/.{1,73}/g)!.join("\r\n ");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function planToIcs(spec: PlanSpec, uidBase: string): string {
  const now = stamp(new Date());
  const events = spec.items.map((it, i) => {
    const day = it.date.replace(/-/g, "");
    let when: string[];
    if (it.time) {
      // Floating local times: the calendar shows them in the person's own time zone
      const start = parseISO(`${it.date}T${it.time}:00`);
      const end = new Date(start.getTime() + (it.minutes || 30) * 60_000);
      when = [`DTSTART:${format(start, "yyyyMMdd'T'HHmmss")}`, `DTEND:${format(end, "yyyyMMdd'T'HHmmss")}`];
    } else {
      const next = format(new Date(parseISO(it.date).getTime() + 86_400_000), "yyyyMMdd");
      when = [`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`];
    }
    return ["BEGIN:VEVENT", `UID:${uidBase}-${i}@refyn`, `DTSTAMP:${now}`, ...when, `SUMMARY:${esc(it.title)}`, it.detail || it.tag ? `DESCRIPTION:${esc([it.detail, it.tag && `For: ${it.tag}`].filter(Boolean).join("\n"))}` : "", "END:VEVENT"].filter(Boolean).map(fold).join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Refyn//Study plan//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(spec.title)}`, ...events, "END:VCALENDAR", ""].join("\r\n");
}

const dayLabel = (d: Date) => (isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEEE d MMMM"));

export const Plan: React.FC<{ spec: PlanSpec; storeKey: string; onSave?: (title: string, markdown: string) => void }> = ({ spec, storeKey, onSave }) => {
  const [saved, setSaved] = useSaved<{ done: number[] }>(storeKey, { done: [] });
  const done = new Set(saved.done);
  const days = useMemo(() => {
    const out: { date: string; items: { it: PlanItem; i: number }[] }[] = [];
    spec.items.forEach((it, i) => {
      const last = out[out.length - 1];
      if (last?.date === it.date) last.items.push({ it, i });
      else out.push({ date: it.date, items: [{ it, i }] });
    });
    return out;
  }, [spec]);
  const minutes = spec.items.reduce((t, it) => t + it.minutes, 0);
  const toggle = (i: number) => setSaved({ done: done.has(i) ? saved.done.filter((x) => x !== i) : [...saved.done, i] });
  const markdown = `# ${spec.title}\n\n${days.map((d) => `## ${format(parseISO(d.date), "EEEE d MMMM")}\n${d.items.map(({ it }) => `- [ ] ${it.time ? `${it.time} ` : ""}${it.title}${it.minutes ? ` (${it.minutes} min)` : ""}${it.detail ? `: ${it.detail}` : ""}`).join("\n")}`).join("\n\n")}\n`;
  const pct = spec.items.length ? Math.round((done.size / spec.items.length) * 100) : 0;

  return (
    <Card>
      <CardHead icon={CalendarRange} kind="Plan" title={spec.title}>
        <span className={chip}>{done.size}/{spec.items.length} done</span>
        {minutes > 0 && <span className={chip}><Clock className="h-3 w-3" /> {minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}` : `${minutes} min`}</span>}
      </CardHead>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-lp-line"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} /></div>
      <div className="mt-4 space-y-4">
        {days.map((d) => {
          const date = parseISO(d.date);
          const late = isPast(date) && !isToday(date);
          return (
            <div key={d.date}>
              <p className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", isToday(date) ? "text-lp-sky" : late ? "text-lp-mute" : "text-lp-soft")}>{dayLabel(date)}</p>
              <ul className="mt-1.5 space-y-1.5">
                {d.items.map(({ it, i }) => (
                  <li key={i}>
                    <button type="button" onClick={() => toggle(i)} className={cn("flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors", done.has(i) ? "border-emerald-500/30 bg-emerald-500/[0.07]" : "border-lp-line hover:border-lp-blue/50")}>
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", done.has(i) ? "border-emerald-500 bg-emerald-500 text-white" : "border-lp-mute")}>{done.has(i) && <Check className="h-3.5 w-3.5" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[14px]", done.has(i) ? "text-lp-mute line-through" : "text-white")}>{it.title}</span>
                        {it.detail && <span className="mt-0.5 block text-[12.5px] text-lp-mute">{it.detail}</span>}
                      </span>
                      <span className="shrink-0 text-right text-[12px] text-lp-mute">
                        {it.time && <span className="block tabular-nums text-lp-soft">{it.time}</span>}
                        {it.minutes > 0 && <span className="block">{it.minutes} min</span>}
                        {it.tag && <span className="mt-0.5 inline-block rounded bg-lp-raised px-1.5 text-[11px] text-lp-soft">{it.tag}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-lp-line pt-3">
        <button type="button" onClick={() => download(`${safeName(spec.title)}.ics`, planToIcs(spec, storeKey.replace(/[^a-z0-9]/gi, "")), "text/calendar;charset=utf-8")} className={primary}><CalendarPlus className="h-4 w-4" /> Add to calendar</button>
        {onSave && <button type="button" onClick={() => onSave(spec.title, markdown)} className={ghost}><BookMarked className="h-4 w-4" /> Save to notebook</button>}
      </div>
      <p className="mt-2 text-[11.5px] text-lp-mute">Import the calendar file into Google Calendar, Outlook or Apple Calendar.</p>
    </Card>
  );
};
