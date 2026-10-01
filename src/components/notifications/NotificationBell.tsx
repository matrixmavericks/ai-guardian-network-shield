import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, isPast } from "date-fns";
import { Bell, BellRing, CheckCheck, CheckCircle2, ClipboardList, Clock, MessageSquare, PenLine, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { desktopOn, desktopSupported, disableDesktop, enableDesktop, useNotifications, type Notification, type NotificationKind } from "./store";

const ICON: Record<NotificationKind, React.ElementType> = {
  task_set: ClipboardList,
  task_due: Clock,
  task_marked: CheckCircle2,
  submission: Upload,
  reflection: PenLine,
  message: MessageSquare,
};
const TONE: Record<NotificationKind, string> = {
  task_set: "bg-lp-blue/15 text-lp-sky",
  task_due: "bg-amber-500/15 text-amber-300",
  task_marked: "bg-emerald-500/15 text-emerald-300",
  submission: "bg-violet-500/15 text-violet-300",
  reflection: "bg-sky-500/15 text-sky-300",
  message: "bg-lp-blue/15 text-lp-sky",
};

const dueText = (n: Notification) => {
  const due = typeof n.data?.due === "string" ? new Date(n.data.due) : null;
  if (!due || isNaN(due.getTime()) || (n.kind !== "task_set" && n.kind !== "task_due")) return null;
  return isPast(due) ? `was due ${formatDistanceToNow(due, { addSuffix: true })}` : `due ${formatDistanceToNow(due, { addSuffix: true })}`;
};

const Item: React.FC<{ n: Notification; onOpen: (n: Notification) => void; onClear: (n: Notification) => void }> = ({ n, onOpen, onClear }) => {
  const Icon = ICON[n.kind] ?? Bell;
  const due = dueText(n);
  return (
    <li className="group relative">
      <button type="button" onClick={() => onOpen(n)} className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]", !n.read_at && "bg-lp-blue/[0.06]")}>
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE[n.kind])}><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1 pr-5">
          <span className={cn("block text-[13.5px] leading-snug", n.read_at ? "text-lp-soft" : "font-medium text-white")}>{n.title}</span>
          {n.body && <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-relaxed text-lp-mute">{n.body}</span>}
          <span className="mt-1 block text-[11.5px] text-lp-mute">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}{due ? ` · ${due}` : ""}</span>
        </span>
        {!n.read_at && <span className="absolute right-3 top-4 h-2 w-2 rounded-full bg-lp-sky" aria-label="Unread" />}
      </button>
      <button type="button" aria-label="Clear" onClick={() => onClear(n)} className="absolute bottom-2 right-2 hidden h-6 w-6 items-center justify-center rounded-md text-lp-mute hover:bg-white/10 hover:text-white group-hover:flex"><X className="h-3.5 w-3.5" /></button>
    </li>
  );
};

/**
 * The bell: unread count, and a panel of notifications. `placement` decides
 * where the panel opens (next to the sidebar, or under a page header).
 */
export const NotificationBell: React.FC<{ placement?: "sidebar" | "header"; className?: string; onOpenChange?: (open: boolean) => void }> = ({ placement = "sidebar", className, onOpenChange }) => {
  const { items, loaded, unread, markRead, clear } = useNotifications();
  const [open, setOpenRaw] = useState(false);
  const [desktop, setDesktop] = useState(desktopOn());
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  const setOpen = (v: boolean) => { setOpenRaw(v); onOpenChange?.(v); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const openItem = (n: Notification) => {
    markRead([n.id]);
    setOpen(false);
    if (n.link) navigate(n.link);
  };
  const fresh = items.filter((n) => !n.read_at);
  const earlier = items.filter((n) => n.read_at).slice(0, 30);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className={cn("relative flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line bg-lp-surface/70 text-lp-soft transition-colors hover:border-lp-blue/50 hover:text-white", open && "border-lp-blue/60 text-white", className)}
      >
        {unread ? <BellRing className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
        {unread > 0 && <span className="lp-keep absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lp-red px-1 text-[10.5px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {/* Rendered on <body>: sidebars use transforms and clipping that would trap a fixed panel */}
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            ref={panel}
            role="dialog"
            aria-label="Notifications"
            className={cn(
              "lp-chrome lp-pop lp-fade fixed z-[61] flex max-h-[min(80vh,640px)] flex-col overflow-hidden rounded-2xl border border-lp-line bg-lp-deep font-ui shadow-2xl",
              "inset-x-3 top-3 sm:inset-x-auto sm:w-[400px]",
              placement === "sidebar" ? "sm:left-[276px] sm:top-4" : "sm:right-4 sm:top-16",
            )}
          >
            <div className="flex items-center gap-2 border-b border-lp-line px-4 py-3">
              <p className="flex-1 text-[15px] font-semibold text-white">Notifications</p>
              {unread > 0 && <button type="button" onClick={() => markRead(fresh.map((n) => n.id))} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-lp-soft hover:bg-white/[0.06] hover:text-white"><CheckCheck className="h-4 w-4" /> Mark all read</button>}
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {!loaded ? (
                <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <div key={i} className="lp-skeleton h-14 rounded-xl" />)}</div>
              ) : !items.length ? (
                <div className="px-6 py-10 text-center">
                  <Bell className="mx-auto h-7 w-7 text-lp-mute" />
                  <p className="mt-2 text-[14px] text-white">You're all caught up</p>
                  <p className="mt-1 text-[12.5px] text-lp-mute">New tasks, marks, messages and reminders will show up here.</p>
                </div>
              ) : (
                <>
                  {fresh.length > 0 && <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">New</p>}
                  <ul>{fresh.map((n) => <Item key={n.id} n={n} onOpen={openItem} onClear={(x) => clear(x.id)} />)}</ul>
                  {earlier.length > 0 && <p className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">Earlier</p>}
                  <ul>{earlier.map((n) => <Item key={n.id} n={n} onOpen={openItem} onClear={(x) => clear(x.id)} />)}</ul>
                </>
              )}
            </div>
            {desktopSupported() && (
              <div className="flex items-center gap-3 border-t border-lp-line px-4 py-2.5">
                <p className="min-w-0 flex-1 text-[12px] text-lp-mute">Desktop alerts when Refyn is in the background</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={desktop}
                  onClick={async () => { if (desktop) { disableDesktop(); setDesktop(false); } else setDesktop(await enableDesktop()); }}
                  className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", desktop ? "bg-lp-blue" : "bg-lp-line")}
                >
                  <span className={cn("absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[#FFFFFF] transition-transform", desktop && "translate-x-4")} />
                </button>
              </div>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
};

/** A small unread dot for places that can't hold the bell (the phone menu button). */
export const UnreadDot: React.FC<{ className?: string }> = ({ className }) => {
  const { unread } = useNotifications();
  return unread > 0 ? <span className={cn("lp-keep absolute flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lp-red px-1 text-[10.5px] font-semibold text-white", className)}>{unread > 99 ? "99+" : unread}</span> : null;
};
