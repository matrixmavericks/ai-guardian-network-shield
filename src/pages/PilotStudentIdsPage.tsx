import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Download, FileUp, IdCard, KeyRound, Loader2, Printer, RefreshCw, Search, ShieldCheck, Shuffle, Sparkles, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { EmptyState, Panel, PanelHead, ghostBtn } from "@/components/student/ui";
import { inputCls } from "@/components/student/Modal";
import { printElement } from "@/components/subjects/docs";
import { downloadMarkdown } from "@/components/assistant/storage";
import { cn } from "@/lib/utils";
import { getPublicAppBaseUrl } from "@/lib/publicUrl";
import { CARD_LAYOUT, LoginCards, type CardCred, type CardSize } from "@/components/pilot/LoginCards";

type Result = { id: string; password?: string; status: string; error?: string };
type Account = { id: string; grade: string | null; createdAt: string; lastSignIn: string | null; classes: number };

const GRADES = ["MYP 1", "MYP 2", "MYP 3", "MYP 4", "MYP 5", "DP 1", "DP 2"];
const CHUNK = 50;
const ID_TOKEN = /MIS-[A-Z0-9]{3,24}/gi;

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("pilot-student-ids", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error || error.message);
  }
  if (!data?.success) throw new Error(data?.error || "Request failed");
  return data;
};

const shuffle = <T,>(a: T[]) => {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const PilotStudentIdsPage = () => {
  const [mode, setMode] = useState<"paste" | "generate">("paste");
  const [text, setText] = useState("");
  const [count, setCount] = useState(30);
  const [length, setLength] = useState(8);
  const [grade, setGrade] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<Result[]>([]);
  const [size, setSize] = useState<CardSize>("medium");
  const [instructions, setInstructions] = useState(true);
  const [order, setOrder] = useState<CardCred[] | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountsError, setAccountsError] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const loginUrl = `${getPublicAppBaseUrl().replace(/^https?:\/\//, "")}/login`;

  const parsed = useMemo(() => {
    const found = (text.match(ID_TOKEN) ?? []).map((x) => x.toUpperCase());
    const unique = [...new Set(found)];
    return { unique, dupes: found.length - unique.length };
  }, [text]);

  const creds: CardCred[] = useMemo(() => results.filter((r) => r.password).map((r) => ({ id: r.id, password: r.password! })), [results]);
  const printable = order ?? creds;

  useEffect(() => setOrder(null), [creds.length]);

  // Warn before leaving while passwords are only in this tab
  useEffect(() => {
    if (!creds.length) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [creds.length]);

  const loadAccounts = async () => {
    setAccountsError("");
    try {
      const data = await call({ action: "list" });
      setAccounts(data.accounts as Account[]);
    } catch (e) {
      setAccountsError((e as Error).message);
      setAccounts([]);
    }
  };
  useEffect(() => {
    loadAccounts();
  }, []);

  const create = async () => {
    const ids = mode === "paste" ? parsed.unique : [];
    if (mode === "paste" && !ids.length) return toast.error("Paste at least one ID like MIS-7K2QX9P4");
    const total = mode === "paste" ? ids.length : count;
    setRunning(true);
    setProgress({ done: 0, total });
    const out: Result[] = [];
    try {
      for (let i = 0; i < total; i += CHUNK) {
        const n = Math.min(CHUNK, total - i);
        const body = mode === "paste" ? { action: "create", ids: ids.slice(i, i + n), grade: grade || undefined } : { action: "create", generate: { count: n, length }, grade: grade || undefined };
        const data = await call(body);
        out.push(...(data.results as Result[]));
        setResults((prev) => [...prev, ...(data.results as Result[])]);
        setProgress({ done: Math.min(total, i + n), total });
      }
      const made = out.filter((r) => r.status === "created").length;
      toast.success(`${made} account${made === 1 ? "" : "s"} created`);
      loadAccounts();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const reset = async () => {
    const ids = [...picked];
    if (!ids.length) return;
    setResetting(true);
    try {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const data = await call({ action: "reset", ids: ids.slice(i, i + CHUNK) });
        setResults((prev) => [...prev.filter((r) => !ids.includes(r.id)), ...(data.results as Result[])]);
      }
      toast.success(`New passwords for ${ids.length} account${ids.length === 1 ? "" : "s"}. Print them below.`);
      setPicked(new Set());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const content = await f.text();
    setText((t) => (t ? `${t}\n${content}` : content));
    setMode("paste");
  };

  const exportCsv = () => {
    const rows = ["Student ID,Password", ...creds.map((c) => `${c.id},${c.password}`)];
    downloadMarkdown(`refyn-student-logins-${new Date().toISOString().slice(0, 10)}.csv`, rows.join("\n"));
  };

  const filtered = (accounts ?? []).filter((a) => !q.trim() || a.id.includes(q.trim().toUpperCase()));
  const statusTone: Record<string, string> = { created: "text-lp-green", reset: "text-lp-sky", exists: "text-lp-amber", invalid: "text-lp-red", failed: "text-lp-red", "not found": "text-lp-red" };

  return (
    <StudyShell wide>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">
        <Link to="/pilot/mahindra" className="hover:text-white">
          Mahindra pilot
        </Link>{" "}
        · Student logins
      </p>
      <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.035em] text-white">Student ID cards</h1>
      <p className="mt-1 max-w-[760px] text-[14.5px] text-lp-soft">
        Create anonymous accounts from the school's MIS IDs, print a small login card for each and hand them out. Students sign in with the ID and password, then join their class with the teacher's class code. No names are stored.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Create */}
        <div className="space-y-5">
          <Panel className="p-5" delay={40}>
            <PanelHead title="1 · Add IDs" icon={IdCard} />
            <div className="mt-4 inline-flex rounded-xl border border-lp-line bg-lp-deep/40 p-1">
              {(
                [
                  ["paste", "Paste or upload the school's list"],
                  ["generate", "Generate new IDs"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setMode(id)} className={cn("h-8 rounded-lg px-3 text-[12.5px] font-medium", mode === id ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                  {label}
                </button>
              ))}
            </div>

            {mode === "paste" ? (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  placeholder={"MIS-7K2QX9P4\nMIS-B3M8TZ2A\n…or paste a whole spreadsheet column, CSV or email; IDs are picked out automatically."}
                  className="mt-4 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/40 p-3 font-mono text-[13px] text-white placeholder:font-sans placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px]">
                  <span className="text-white">
                    <b className="tabular-nums">{parsed.unique.length}</b> IDs found
                  </span>
                  {parsed.dupes > 0 && <span className="text-lp-amber">{parsed.dupes} duplicates skipped</span>}
                  <button type="button" onClick={() => fileRef.current?.click()} className="ml-auto inline-flex items-center gap-1.5 text-lp-sky hover:text-white">
                    <FileUp className="h-3.5 w-3.5" /> Upload CSV or text file
                  </button>
                  <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,text/plain,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
              </>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block text-[12.5px] text-lp-mute">
                  How many
                  <input type="number" min={1} max={600} value={count} onChange={(e) => setCount(Math.max(1, Math.min(600, Number(e.target.value) || 1)))} className={cn(inputCls, "mt-1")} />
                </label>
                <label className="block text-[12.5px] text-lp-mute">
                  Characters after MIS-
                  <select value={length} onChange={(e) => setLength(Number(e.target.value))} className={cn(inputCls, "mt-1")}>
                    {[6, 7, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} (e.g. MIS-{"7K2QX9P4B3".slice(0, n)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label className="mt-4 block text-[12.5px] text-lp-mute">
              Year group for this batch (optional, helps teachers)
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className={cn(inputCls, "mt-1")}>
                <option value="">Not set</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" onClick={create} disabled={running || (mode === "paste" && !parsed.unique.length)} className={cn(primaryBtn, "mt-5 h-11 w-full")}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running ? `Creating ${progress.done} of ${progress.total}…` : `Create ${mode === "paste" ? parsed.unique.length : count} account${(mode === "paste" ? parsed.unique.length : count) === 1 ? "" : "s"}`}
            </button>
            {running && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-lp-line">
                <div className="h-full rounded-full bg-lp-blue transition-[width] duration-500" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            )}
            <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-lp-mute">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lp-green" />
              <span>
                Each account gets a random password like <span className="whitespace-nowrap font-mono text-lp-soft">Bako-Mizu-47</span>. Passwords are stored scrambled, so they can only be shown right now. IDs that already have an account are skipped.
              </span>
            </p>
          </Panel>

          {results.length > 0 && (
            <Panel className="p-5" delay={0}>
              <PanelHead title="Results" icon={CheckCircle2} meta={`${creds.length} ready to print`} />
              <div className="mt-3 max-h-[280px] overflow-y-auto rounded-xl border border-lp-line">
                <table className="w-full text-[13px]">
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id + r.status} className="border-b border-lp-line/60 last:border-0">
                        <td className="px-3 py-2 font-mono text-white">{r.id}</td>
                        <td className="px-3 py-2 font-mono text-lp-soft">{r.password ?? "—"}</td>
                        <td className={cn("px-3 py-2 text-right text-[12px] font-medium capitalize", statusTone[r.status] ?? "text-lp-mute")} title={r.error}>
                          {r.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {/* Existing accounts */}
          <Panel className="p-5" delay={80}>
            <PanelHead
              title="Existing ID accounts"
              icon={Users}
              meta={
                <button type="button" onClick={loadAccounts} className="inline-flex items-center gap-1 text-lp-sky hover:text-white">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              }
            />
            {accounts === null ? (
              <div className="lp-skeleton mt-4 h-40 rounded-2xl" />
            ) : accountsError ? (
              <p className="mt-3 flex items-center gap-2 text-[13px] text-lp-red">
                <XCircle className="h-4 w-4" /> {accountsError}
              </p>
            ) : accounts.length ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="relative min-w-[180px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an ID" className="h-9 w-full rounded-lg border border-lp-line bg-lp-deep/40 pl-9 pr-3 font-mono text-[13px] text-white placeholder:font-sans placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none" />
                  </label>
                  <button type="button" disabled={!picked.size || resetting} onClick={reset} className={cn(ghostBtn, "h-9")}>
                    {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} New password{picked.size > 1 ? "s" : ""} {picked.size ? `(${picked.size})` : ""}
                  </button>
                </div>
                <p className="mt-2 text-[12px] text-lp-mute">
                  {accounts.length} accounts · {accounts.filter((a) => a.lastSignIn).length} have signed in · {accounts.filter((a) => a.classes > 0).length} have joined a class
                </p>
                <div className="mt-2 max-h-[340px] overflow-y-auto rounded-xl border border-lp-line">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-lp-surface text-left text-[11px] uppercase tracking-[0.12em] text-lp-mute">
                      <tr>
                        <th className="w-8 px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label="Select all shown"
                            checked={filtered.length > 0 && filtered.every((a) => picked.has(a.id))}
                            onChange={(e) => setPicked(e.target.checked ? new Set([...picked, ...filtered.map((a) => a.id)]) : new Set([...picked].filter((id) => !filtered.some((a) => a.id === id))))}
                          />
                        </th>
                        <th className="px-2 py-2 font-medium">ID</th>
                        <th className="px-2 py-2 font-medium">Year</th>
                        <th className="px-2 py-2 font-medium">Last sign-in</th>
                        <th className="px-2 py-2 text-right font-medium">Classes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 500).map((a) => (
                        <tr key={a.id} className="border-t border-lp-line/60">
                          <td className="px-3 py-1.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${a.id}`}
                              checked={picked.has(a.id)}
                              onChange={(e) => {
                                const next = new Set(picked);
                                if (e.target.checked) next.add(a.id);
                                else next.delete(a.id);
                                setPicked(next);
                              }}
                            />
                          </td>
                          <td className="px-2 py-1.5 font-mono text-white">{a.id}</td>
                          <td className="px-2 py-1.5 text-lp-soft">{a.grade ?? "—"}</td>
                          <td className="px-2 py-1.5 text-lp-soft">{a.lastSignIn ? formatDistanceToNow(new Date(a.lastSignIn), { addSuffix: true }) : <span className="text-lp-mute">Never</span>}</td>
                          <td className={cn("px-2 py-1.5 text-right tabular-nums", a.classes ? "text-lp-green" : "text-lp-mute")}>{a.classes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState icon={Users} title="No ID accounts yet" body="Accounts you create here appear in this list with their last sign-in and classes joined." className="py-6" />
            )}
          </Panel>
        </div>

        {/* Print */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel className="p-5" delay={60}>
            <PanelHead title="2 · Print login cards" icon={Printer} meta={creds.length ? `${creds.length} cards · ${Math.ceil(creds.length / (CARD_LAYOUT[size].cols * CARD_LAYOUT[size].rows))} pages` : undefined} />
            {creds.length ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-lp-line bg-lp-deep/40 p-1">
                    {(Object.keys(CARD_LAYOUT) as CardSize[]).map((s) => (
                      <button key={s} type="button" onClick={() => setSize(s)} className={cn("h-8 rounded-lg px-3 text-[12.5px] font-medium", size === s ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                        {CARD_LAYOUT[s].label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setInstructions((v) => !v)} aria-pressed={instructions} className={cn("h-9 rounded-lg border px-3 text-[12.5px] font-medium", instructions ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute")}>
                    Joining instructions
                  </button>
                  <button type="button" onClick={() => setOrder(shuffle(creds))} className={cn(ghostBtn, "h-9")}>
                    <Shuffle className="h-4 w-4" /> Shuffle order
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => cardsRef.current && printElement(cardsRef.current, "Refyn student logins")} className={primaryBtn}>
                    <Printer className="h-4 w-4" /> Print cards
                  </button>
                  <button type="button" onClick={exportCsv} className={ghostBtn}>
                    <Download className="h-4 w-4" /> Download CSV
                  </button>
                </div>
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-lp-amber/30 bg-lp-amber/10 p-3 text-[12.5px] leading-relaxed text-lp-amber">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Print or download before you leave this page: the passwords can't be shown again (you can issue new ones from the list). Treat the CSV like a list of keys and delete it once the cards are handed out.
                </p>
                <div className="mt-4 max-h-[70vh] overflow-auto rounded-2xl border border-lp-line bg-lp-deep/50 p-3">
                  <div className="origin-top-left" style={{ transform: "scale(0.62)", width: "190mm", marginBottom: "-38%" }}>
                    <LoginCards ref={cardsRef} creds={printable} size={size} loginUrl={loginUrl} school="Mahindra International School, Pune" instructions={instructions} />
                  </div>
                </div>
              </>
            ) : (
              <EmptyState icon={IdCard} title="Cards appear here" body="Create accounts (or issue new passwords) and a printable sheet of cut-out login cards is ready straight away." className="py-10" />
            )}
          </Panel>

          <Panel className="p-5" delay={100}>
            <PanelHead title="How it works in class" icon={Users} />
            <ol className="mt-3 space-y-2 text-[13px] leading-relaxed text-lp-soft">
              {[
                "Hand each student a card at random. The school's list is the only link between an ID and a student.",
                `Students go to ${loginUrl} and sign in with the ID and password on their card.`,
                "The teacher shares their class code (on the class page). Students enter it under Classes → Join a class.",
                "Teachers see students by their ID in class lists, marking and the gradebook.",
                "Lost a card? Tick the ID in the list and issue a new password.",
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lp-blue/15 text-[11.5px] font-semibold text-lp-sky">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </StudyShell>
  );
};

export default PilotStudentIdsPage;
