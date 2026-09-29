import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, FileText, Loader2, Printer, Send, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { EmptyState, Panel, ghostBtn } from "@/components/student/ui";
import { printElement } from "@/components/subjects/docs";
import { cn } from "@/lib/utils";
import { DIAGRAM_FENCE_RULE, RichOutput } from "@/components/studio/RichOutput";
import { useLibrary, useStudio } from "@/components/studio/studio";
import { uid } from "@/components/studio/worksheet";

const REFINE = ["Make it harder", "Make it more accessible", "Add a mark scheme", "Shorter and punchier", "Use Indian real-world examples", "Add a diagram"];

const StudioToolPage = () => {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { config, look, band, setBand } = useStudio();
  const lib = useLibrary();
  const tool = config?.tools.find((t) => t.id === id);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [refine, setRefine] = useState("");
  const [copied, setCopied] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const item = params.get("item");
    if (!item) return;
    const found = lib.items.find((x) => x.id === item && x.type === "tool");
    if (found && found.type === "tool") {
      setInput(found.input);
      setOutput(found.output);
      setItemId(found.id);
    }
    setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config || !look) return <Navigate to="/dashboard" replace />;
  if (!tool) return <Navigate to="/studio" replace />;
  const Icon = tool.icon;

  const call = async (prompt: string, history: { role: string; content: string }[] = []) => {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: { prompt, subject: config.subjectLabel, gradeLevel: band, processTeaching: false, sessionId: null, history },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.reply || "Refyn couldn't answer just now.");
    return String(data.reply || "");
  };

  const run = async () => {
    if (tool.needsInput && !input.trim()) {
      toast.error("Add some input first");
      return;
    }
    setLoading(true);
    try {
      const prompt = `${config.systemContext}\n\nTask: ${tool.buildPrompt(input.trim(), band)}\n\nFormat with clear markdown headings, bullet points and tables where useful. Use plain Unicode maths, never LaTeX.\n\n${DIAGRAM_FENCE_RULE}`;
      const reply = await call(prompt);
      setOutput(reply);
      setLastPrompt(prompt);
      const newId = uid();
      setItemId(newId);
      lib.save({ id: newId, type: "tool", title: `${tool.title}: ${input.trim().slice(0, 60) || band}`, at: Date.now(), tool: tool.id, input: input.trim(), output: reply, band });
    } catch (e) {
      toast.error((e as Error)?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const doRefine = async (text: string) => {
    if (!text.trim() || !output) return;
    setLoading(true);
    try {
      const reply = await call(`${text.trim()}. Return the complete revised version.\n\n${DIAGRAM_FENCE_RULE}`, [
        { role: "user", content: lastPrompt || `${config.systemContext}\n\nTask: ${tool.buildPrompt(input.trim(), band)}` },
        { role: "assistant", content: output },
      ]);
      setOutput(reply);
      setRefine("");
      if (itemId) lib.save({ id: itemId, type: "tool", title: `${tool.title}: ${input.trim().slice(0, 60) || band}`, at: Date.now(), tool: tool.id, input: input.trim(), output: reply, band });
    } catch (e) {
      toast.error((e as Error)?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const examples = (tool.inputPlaceholder ?? "").replace(/^e\.g\.\s*/i, "").split(/,\s*/).filter((x) => x.length > 2).slice(0, 4);

  return (
    <StudyShell wide>
      <Link to="/studio" className="inline-flex items-center gap-1.5 text-[13px] text-lp-mute hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {config.title}
      </Link>
      <header className="mt-4 flex flex-wrap items-center gap-4">
        <span className="lp-keep flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-[0_18px_50px_-18px_rgba(59,130,246,0.9)]" style={{ background: look.gradient }}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white">{tool.title}</h1>
          <p className="text-[14px] text-lp-soft">{tool.description}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel className="p-4" delay={40}>
            <p className="text-[12.5px] font-medium text-lp-soft">Grade band</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {config.gradeBands.map((b) => (
                <button key={b.id} type="button" title={b.description} onClick={() => setBand(b.id)} className={cn("h-8 rounded-lg border px-2.5 text-[12.5px] font-medium", band === b.id ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}>
                  {b.label}
                </button>
              ))}
            </div>
            {tool.needsInput && (
              <>
                <label className="mt-4 block text-[12.5px] font-medium text-lp-soft" htmlFor="tool-input">
                  {tool.inputLabel}
                </label>
                <textarea
                  id="tool-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
                  }}
                  rows={4}
                  placeholder={tool.inputPlaceholder}
                  className="mt-1.5 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/40 p-3 text-[14px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none"
                />
                {examples.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {examples.map((x) => (
                      <button key={x} type="button" onClick={() => setInput(x)} className="rounded-full border border-lp-line px-2.5 py-1 text-[11.5px] text-lp-soft hover:border-lp-sky/40 hover:text-white">
                        {x}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <button type="button" onClick={run} disabled={loading} className={cn(primaryBtn, "mt-4 h-11 w-full")}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {output ? "Generate again" : "Generate"}
            </button>
          </Panel>

          {output && (
            <Panel className="p-4" delay={0}>
              <p className="text-[12.5px] font-medium text-lp-soft">Refine it</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REFINE.map((r) => (
                  <button key={r} type="button" disabled={loading} onClick={() => doRefine(r)} className="rounded-full border border-lp-line px-2.5 py-1 text-[11.5px] text-lp-soft hover:border-lp-sky/40 hover:text-white disabled:opacity-50">
                    {r}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  doRefine(refine);
                }}
                className="mt-3 flex gap-2"
              >
                <input value={refine} onChange={(e) => setRefine(e.target.value)} placeholder="Or say what to change…" className="h-9 min-w-0 flex-1 rounded-lg border border-lp-line bg-lp-deep/40 px-3 text-[13px] text-white placeholder:text-lp-mute focus:border-lp-sky/60 focus:outline-none" />
                <button type="submit" disabled={loading || !refine.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-lp-blue text-white disabled:opacity-50" aria-label="Refine">
                  <Wand2 className="h-4 w-4" />
                </button>
              </form>
            </Panel>
          )}
        </div>

        <div className="min-w-0">
          {output ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => paperRef.current && printElement(paperRef.current, tool.title)} className={ghostBtn}>
                  <Printer className="h-4 w-4" /> Print or PDF
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(output.replace(/```diagram[\s\S]*?```/g, "[diagram]"));
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1400);
                  }}
                  className={ghostBtn}
                >
                  {copied ? <Check className="h-4 w-4 text-lp-green" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("refyn:studio:source", output.replace(/```diagram[\s\S]*?```/g, "").slice(0, 4000));
                    navigate(`/studio/create?topic=${encodeURIComponent(input.trim() || tool.title)}`);
                  }}
                  className={primaryBtn}
                >
                  <FileText className="h-4 w-4" /> Turn into a worksheet
                </button>
                <Link to={`/ai-learning-assistant?prompt=${encodeURIComponent(`About this ${tool.title.toLowerCase()} output: `)}`} className={ghostBtn}>
                  <Send className="h-4 w-4" /> Discuss with Refyn
                </Link>
                <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-lp-mute">
                  <Check className="h-3.5 w-3.5 text-lp-green" /> Saved to library
                </span>
              </div>
              <div className={cn("rounded-[28px] border border-lp-line bg-lp-deep/50 p-3 sm:p-5 transition-opacity", loading && "opacity-50")}>
                <div ref={paperRef} className="lp-paper rounded-2xl px-6 py-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] sm:px-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: look.accent }}>
                    {config.title} · {band}
                  </p>
                  <h2 className="mt-1 text-[22px] font-bold tracking-[-0.02em] text-[#0F172A]">{tool.title}</h2>
                  {input && <p className="mt-0.5 text-[13.5px] text-[#475569]">{input}</p>}
                  <div className="mt-5">
                    <RichOutput text={output} accent={look.accent} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Panel className="p-6" delay={80}>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="lp-skeleton h-24 rounded-2xl" style={{ opacity: 1 - i * 0.2 }} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={Icon} title="Your result appears here" body="Pick a grade band, add your input and press Generate. Results can include exact diagrams, and every result is saved to your library." />
              )}
            </Panel>
          )}
        </div>
      </div>
    </StudyShell>
  );
};

export default StudioToolPage;
