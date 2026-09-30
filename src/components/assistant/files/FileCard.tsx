import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ChevronDown, Download, ExternalLink, FileSpreadsheet, FileText, Library, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { splitSheets } from "./office";
import { FORMAT_LABEL, buildFile, downloadFile, formatsFor, type OutputFile } from "./outputs";
import { googleReady, saveToDrive } from "./google";
import { GoogleDriveMark } from "./LibraryPanel";

/** A file the assistant made: preview, downloads, Google Drive, save to the chat library. */
export const FileCard: React.FC<{
  file: OutputFile;
  complete: boolean;
  teacher: boolean;
  onSaveToLibrary?: (file: OutputFile) => Promise<void>;
}> = ({ file, complete, teacher, onSaveToLibrary }) => {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const formats = useMemo(() => formatsFor(file), [file]);
  const sheets = useMemo(() => (file.kind === "sheet" ? splitSheets(file.content, file.base) : []), [file]);
  const Icon = file.kind === "sheet" ? FileSpreadsheet : FileText;
  const lines = file.content.split("\n").length;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const toDrive = () =>
    run("drive", async () => {
      const as = file.kind === "sheet" ? "sheet" : "doc";
      const blob = await buildFile(file, as === "sheet" ? "xlsx" : "docx");
      const { url } = await saveToDrive(blob, file.base, as);
      setDriveUrl(url);
      window.open(url, "_blank", "noopener");
      toast.success(`Saved to your Google Drive as a Google ${as === "sheet" ? "Sheet" : "Doc"}`);
    });

  const pill = "flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12.5px] text-lp-soft transition-colors hover:border-lp-blue/50 hover:text-white disabled:opacity-50";

  return (
    <div className="lp-fade my-3 overflow-hidden rounded-2xl border border-lp-line bg-lp-surface">
      <div className="flex items-center gap-3 border-b border-lp-line px-4 py-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", file.kind === "sheet" ? "bg-lp-green/15 text-lp-green" : "bg-lp-blue/15 text-lp-sky")}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-white">{file.name}</p>
          <p className="text-[12px] text-lp-mute">
            {file.kind === "sheet"
              ? `${sheets.length} sheet${sheets.length === 1 ? "" : "s"} · ${sheets.reduce((a, s) => a + Math.max(0, s.rows.length - 1), 0)} rows`
              : `${FORMAT_LABEL[file.format]} document · ${lines} lines`}
            {!complete && <span className="text-lp-amber"> · may be cut off</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => run(file.format, () => downloadFile(file))}
          disabled={!!busy}
          className="flex h-9 shrink-0 items-center gap-2 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(59,130,246,0.9)] hover:bg-[#2F6FE0] disabled:opacity-60"
        >
          {busy === file.format ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="hidden sm:inline">Download</span> {FORMAT_LABEL[file.format]}
        </button>
      </div>

      <div className={cn("relative overflow-hidden px-4 pt-3", expanded ? "max-h-none pb-3" : "max-h-[190px]")}>
        {file.kind === "sheet" ? (
          <div className="overflow-x-auto">
            {sheets.slice(0, expanded ? sheets.length : 1).map((s) => (
              <div key={s.name} className="mb-3">
                {sheets.length > 1 && <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-lp-mute">{s.name}</p>}
                <table className="w-full border-collapse text-[12.5px]">
                  <tbody>
                    {s.rows.slice(0, expanded ? 200 : 6).map((r, ri) => (
                      <tr key={ri} className={ri === 0 ? "bg-lp-raised font-medium text-white" : "text-lp-soft"}>
                        {r.slice(0, expanded ? 30 : 6).map((c, ci) => (
                          <td key={ci} className="max-w-[220px] truncate border border-lp-line px-2 py-1">{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div className="lp-md text-[14px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{expanded ? file.content : file.content.split("\n").slice(0, 14).join("\n")}</ReactMarkdown>
          </div>
        )}
        {!expanded && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-lp-surface to-transparent" />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-lp-line px-3 py-2.5">
        <button type="button" onClick={() => setExpanded((v) => !v)} className={pill} aria-expanded={expanded}>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} /> {expanded ? "Collapse" : "Preview all"}
        </button>
        {formats.filter((f) => f !== file.format).map((f) => (
          <button key={f} type="button" disabled={!!busy} onClick={() => run(f, () => downloadFile(file, f))} className={pill}>
            {busy === f ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {FORMAT_LABEL[f]}
          </button>
        ))}
        {teacher && (
          driveUrl ? (
            <a href={driveUrl} target="_blank" rel="noreferrer" className={pill}>
              <ExternalLink className="h-3.5 w-3.5" /> Open in Google {file.kind === "sheet" ? "Sheets" : "Docs"}
            </a>
          ) : (
            <button
              type="button"
              disabled={!!busy || !googleReady()}
              title={googleReady() ? undefined : "Your Refyn admin needs to connect Google Drive first"}
              onClick={toDrive}
              className={pill}
            >
              {busy === "drive" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GoogleDriveMark className="h-3.5 w-3.5" />}
              Save to Google {file.kind === "sheet" ? "Sheets" : "Docs"}
            </button>
          )
        )}
        {onSaveToLibrary && (
          <button
            type="button"
            disabled={!!busy || saved}
            onClick={() => run("lib", async () => { await onSaveToLibrary(file); setSaved(true); })}
            className={cn(pill, "ml-auto")}
            title="Keep this file in the chat's library so Refyn can build on it later"
          >
            {saved ? <Check className="h-3.5 w-3.5 text-lp-green" /> : busy === "lib" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Library className="h-3.5 w-3.5" />}
            {saved ? "In chat files" : "Save to chat files"}
          </button>
        )}
      </div>
    </div>
  );
};
