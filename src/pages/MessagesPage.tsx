import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowLeft, ArrowUp, Check, CheckCheck, MessageSquare, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { StudyShell } from "@/components/subjects/kit";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface Contact {
  user_id: string;
  full_name: string;
  role?: string;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #3B82F6, #1E3A8A)",
  "linear-gradient(135deg, #10B981, #065F46)",
  "linear-gradient(135deg, #A855F7, #4C1D95)",
  "linear-gradient(135deg, #F59E0B, #78350F)",
  "linear-gradient(135deg, #F43F5E, #881337)",
  "linear-gradient(135deg, #14B8A6, #134E4A)",
];

const TITLE = /^(mr|mrs|ms|miss|mx|dr|prof|sir|madam)\.?$/i;

/** "Ms Priya Rao" -> "Ms Rao", "Diya Kapoor" -> "Diya" */
const callName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 && TITLE.test(parts[0]) ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0] || name;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter((p) => p && !TITLE.test(p))
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const Avatar: React.FC<{ contact: Contact; size?: "sm" | "md" }> = ({ contact, size = "md" }) => {
  const g = AVATAR_GRADIENTS[[...contact.user_id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length];
  return (
    <span className={cn("lp-keep flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white/5", size === "sm" ? "h-9 w-9 text-[12px]" : "h-11 w-11 text-[13px]")} style={{ background: g }}>
      {initials(contact.full_name) || "?"}
    </span>
  );
};

const dayLabel = (d: Date) => (isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, d MMMM"));
const shortTime = (iso: string) => {
  const d = new Date(iso);
  return isToday(d) ? format(d, "HH:mm") : isYesterday(d) ? "Yesterday" : format(d, "d MMM");
};

const STARTERS = ["Hi! I have a question about the last assignment.", "Could you explain the feedback on my work?", "When is the next piece due?"];

const MessagesPage = () => {
  const { user } = useAuth();
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastByContact, setLastByContact] = useState<Record<string, Message>>({});
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Contacts (classmates, teachers and past conversations), unread counts and last messages
  useEffect(() => {
    if (!user) return;
    const fetchContacts = async () => {
      setLoadingContacts(true);
      const { data, error } = await supabase.rpc("get_user_contacts", { _user_id: user.id });
      if (error) {
        console.error("Error fetching contacts:", error);
        setLoadingContacts(false);
        return;
      }
      setContacts((data || []).map((c) => ({ user_id: c.user_id, full_name: c.full_name, role: c.role })));

      const { data: recent } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(300);
      const last: Record<string, Message> = {};
      const counts: Record<string, number> = {};
      for (const m of recent || []) {
        const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!last[other]) last[other] = m;
        if (m.receiver_id === user.id && !m.read) counts[other] = (counts[other] || 0) + 1;
      }
      setLastByContact(last);
      setUnreadCounts(counts);
      setLoadingContacts(false);
    };
    fetchContacts();
  }, [user]);

  // Messages for the open conversation, marked read, plus live updates
  useEffect(() => {
    if (!user || !activeContact) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.user_id}),and(sender_id.eq.${activeContact.user_id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }
      setMessages(data || []);
      const unreadIds = (data || []).filter((msg) => msg.sender_id === activeContact.user_id && !msg.read).map((msg) => msg.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        setUnreadCounts((prev) => ({ ...prev, [activeContact.user_id]: 0 }));
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages:${user.id}:${activeContact.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${activeContact.user_id}),and(sender_id.eq.${activeContact.user_id},receiver_id.eq.${user.id}))`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          setLastByContact((prev) => ({ ...prev, [activeContact.user_id]: m }));
          if (m.sender_id === activeContact.user_id) supabase.from("messages").update({ read: true }).eq("id", m.id).then();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeContact]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [messageText]);

  const handleSendMessage = async (text = messageText) => {
    if (!user || !activeContact || !text.trim() || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: activeContact.user_id, content: text.trim(), read: false }).select().single();
    setSending(false);
    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      return;
    }
    // Show it straight away even if the live update is slow
    if (data) {
      setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
      setLastByContact((prev) => ({ ...prev, [activeContact.user_id]: data }));
    }
    setMessageText("");
  };

  const sorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return contacts
      .filter((c) => c.full_name.toLowerCase().includes(q))
      .sort((a, b) => {
        const ta = lastByContact[a.user_id]?.created_at ?? "";
        const tb = lastByContact[b.user_id]?.created_at ?? "";
        return tb.localeCompare(ta) || a.full_name.localeCompare(b.full_name);
      });
  }, [contacts, searchQuery, lastByContact]);
  const teachers = sorted.filter((c) => c.role === "teacher" || c.role === "admin");
  const peers = sorted.filter((c) => !(c.role === "teacher" || c.role === "admin"));
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const groups = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(new Date(m.created_at));
      if (!out.length || out[out.length - 1].day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(m);
    }
    return out;
  }, [messages]);

  const contactRow = (c: Contact) => {
    const last = lastByContact[c.user_id];
    const unread = unreadCounts[c.user_id] || 0;
    const active = activeContact?.user_id === c.user_id;
    return (
      <button
        key={c.user_id}
        type="button"
        onClick={() => setActiveContact(c)}
        aria-current={active ? "true" : undefined}
        className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors", active ? "bg-lp-blue/15" : "hover:bg-white/[0.04]")}
      >
        <Avatar contact={c} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("truncate text-[14px]", unread ? "font-semibold text-white" : "font-medium text-lp-text")}>{c.full_name}</span>
            {last && <span className="shrink-0 text-[11px] text-lp-mute">{shortTime(last.created_at)}</span>}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className={cn("truncate text-[12.5px]", unread ? "text-lp-soft" : "text-lp-mute")}>
              {last ? `${last.sender_id === user?.id ? "You: " : ""}${last.content}` : c.role === "teacher" ? "Teacher" : "Say hello"}
            </span>
            {unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lp-blue px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
          </span>
        </span>
      </button>
    );
  };

  return (
    <StudyShell wide>
      <header className="lp-fade flex flex-wrap items-end justify-between gap-4" style={{ animationFillMode: "both" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Inbox</p>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[34px]">Messages</h1>
          <p className="mt-1.5 text-[14.5px] text-lp-soft">Chat with your teachers and classmates.</p>
        </div>
        {totalUnread > 0 && <span className="rounded-full border border-lp-blue/40 bg-lp-blue/15 px-3 py-1 text-[12.5px] font-medium text-lp-sky">{totalUnread} unread</span>}
      </header>

      <div
        className="lp-fade mt-6 grid h-[calc(100vh-15rem)] min-h-[480px] grid-cols-1 overflow-hidden rounded-3xl border border-lp-line bg-lp-surface/70 md:grid-cols-[320px_minmax(0,1fr)]"
        style={{ animationDelay: "60ms", animationFillMode: "both" }}
      >
        {/* Contacts */}
        <aside className={cn("flex min-h-0 flex-col border-lp-line md:border-r", activeContact ? "hidden md:flex" : "flex")}>
          <div className="border-b border-lp-line p-3">
            <label className="relative block">
              <span className="sr-only">Search contacts</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people"
                className="h-10 w-full rounded-xl border border-lp-line bg-lp-deep/70 pl-9 pr-3 text-[13.5px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingContacts ? (
              <div className="space-y-2 p-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="lp-skeleton h-14 rounded-2xl" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Users className="mx-auto h-8 w-8 text-lp-mute" />
                <p className="mt-3 text-[13.5px] text-lp-soft">{contacts.length ? "No one matches that search." : "No contacts yet"}</p>
                {!contacts.length && <p className="mt-1 text-[12.5px] text-lp-mute">Join a class to message your teacher and classmates.</p>}
              </div>
            ) : (
              <>
                {teachers.length > 0 && <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">Teachers</p>}
                {teachers.map(contactRow)}
                {peers.length > 0 && <p className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lp-mute">Classmates</p>}
                {peers.map(contactRow)}
              </>
            )}
          </div>
        </aside>

        {/* Conversation */}
        <section className={cn("min-h-0 flex-col", activeContact ? "flex" : "hidden md:flex")}>
          {activeContact ? (
            <>
              <div className="flex items-center gap-3 border-b border-lp-line px-4 py-3">
                <button type="button" onClick={() => setActiveContact(null)} aria-label="Back to conversations" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-soft hover:bg-white/[0.06] md:hidden">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar contact={activeContact} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">{activeContact.full_name}</p>
                  <p className="text-[12px] capitalize text-lp-mute">{activeContact.role === "admin" ? "School admin" : activeContact.role || "Classmate"}</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Avatar contact={activeContact} />
                    <p className="mt-3 text-[15px] font-medium text-white">Start a conversation with {callName(activeContact.full_name)}</p>
                    <div className="mt-4 flex max-w-[460px] flex-wrap justify-center gap-2">
                      {STARTERS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setMessageText(s);
                            inputRef.current?.focus();
                          }}
                          className="rounded-full border border-lp-line bg-lp-deep/60 px-3 py-1.5 text-[12.5px] text-lp-soft transition-colors hover:border-lp-sky/50 hover:text-white"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  groups.map((g) => (
                    <div key={g.day}>
                      <div className="my-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-lp-line" />
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-lp-mute">{g.day}</span>
                        <span className="h-px flex-1 bg-lp-line" />
                      </div>
                      <div className="space-y-1">
                        {g.items.map((m, i) => {
                          const mine = m.sender_id === user?.id;
                          const prev = g.items[i - 1];
                          const nextM = g.items[i + 1];
                          const firstOfRun = !prev || prev.sender_id !== m.sender_id;
                          const lastOfRun = !nextM || nextM.sender_id !== m.sender_id;
                          return (
                            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start", firstOfRun && i > 0 && "pt-2")}>
                              <div
                                className={cn(
                                  "max-w-[78%] px-3.5 py-2 text-[14px] leading-relaxed",
                                  mine ? "bg-lp-blue text-white shadow-[0_8px_24px_-12px_rgba(59,130,246,0.8)]" : "border border-lp-line bg-lp-raised text-lp-text",
                                  mine
                                    ? cn("rounded-2xl", !lastOfRun && "rounded-br-md", !firstOfRun && "rounded-tr-md")
                                    : cn("rounded-2xl", !lastOfRun && "rounded-bl-md", !firstOfRun && "rounded-tl-md"),
                                )}
                              >
                                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                {lastOfRun && (
                                  <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10.5px]", mine ? "text-white/70" : "text-lp-mute")}>
                                    {format(new Date(m.created_at), "HH:mm")}
                                    {mine && (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="border-t border-lp-line p-3"
              >
                <div className="flex items-end gap-2 rounded-2xl border border-lp-line bg-lp-deep/70 p-1.5 focus-within:border-lp-sky/50">
                  <label htmlFor="msg-input" className="sr-only">
                    Message {activeContact.full_name}
                  </label>
                  <textarea
                    id="msg-input"
                    ref={inputRef}
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message ${callName(activeContact.full_name)}`}
                    className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] text-white placeholder:text-lp-mute focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sending}
                    aria-label="Send"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-blue text-white transition-colors hover:bg-[#2F6FE0] disabled:bg-lp-raised disabled:text-lp-mute"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 hidden px-1 text-[11px] text-lp-mute sm:block">Enter to send · Shift + Enter for a new line</p>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lp-line bg-lp-raised text-lp-sky">
                <MessageSquare className="h-6 w-6" />
              </span>
              <p className="mt-4 text-[16px] font-medium text-white">Pick a conversation</p>
              <p className="mt-1 max-w-[320px] text-[13.5px] text-lp-mute">Choose a teacher or classmate on the left to see your messages.</p>
            </div>
          )}
        </section>
      </div>
    </StudyShell>
  );
};

export default MessagesPage;
