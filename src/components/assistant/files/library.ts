import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MAX_FILE_BYTES, extractFile, kindOf } from "./extract";
import type { OutputFile } from "./outputs";

// A chat's library: rows in chat_context_items (text the assistant reads) and,
// for uploads, the original file in the private chat-files bucket.

// The table is newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const BUCKET = "chat-files";
const COLUMNS = "id, session_id, kind, name, mime, size_bytes, storage_path, source_url, char_count, pinned, meta, created_at";

export type LibraryKind = "file" | "note" | "google" | "output" | "message";
export type LibraryItem = {
  id: string;
  session_id: string;
  kind: LibraryKind;
  name: string;
  mime: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  source_url: string | null;
  char_count: number;
  pinned: boolean;
  meta: { pages?: number; note?: string; format?: string } | null;
  created_at: string;
};

export type Upload = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "reading" | "ready" | "error";
  detail?: string;
  itemId?: string;
  /** Downscaled image, sent to the model with the next message */
  image?: string;
};

const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(-120);

export function useChatLibrary(userId: string | null, sessionId: string | null) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [available, setAvailable] = useState(true);
  const current = useRef(sessionId);
  current.current = sessionId;

  const refresh = useCallback(async (sid = current.current) => {
    if (!userId || !sid) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await db.from("chat_context_items").select(COLUMNS).eq("session_id", sid).order("created_at", { ascending: true });
    if (error && /chat_context_items/.test(error.message ?? "")) setAvailable(false);
    if (current.current === sid) setItems((data ?? []) as LibraryItem[]);
    setLoading(false);
  }, [userId]);

  const prevSession = useRef(sessionId);
  useEffect(() => {
    // Switching chats clears pending chips; creating the chat for an upload doesn't
    if (prevSession.current !== null && prevSession.current !== sessionId) setUploads([]);
    prevSession.current = sessionId;
    refresh(sessionId);
  }, [sessionId, refresh]);

  const patch = (key: string, p: Partial<Upload>) => setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...p } : u)));

  /** Upload, read and store files. `ensureSession` creates the chat if needed. */
  const addFiles = async (files: File[], ensureSession: () => Promise<string | null>, source?: { kind: "google"; url: string }[]) => {
    if (!userId || !files.length) return;
    const fresh: Upload[] = files.map((f) => ({ key: crypto.randomUUID(), name: f.name, size: f.size, status: "uploading" }));
    setUploads((prev) => [...prev, ...fresh]);
    const sid = await ensureSession();
    if (!sid) {
      fresh.forEach((u) => patch(u.key, { status: "error", detail: "Couldn't start a chat to save this in." }));
      return;
    }
    await Promise.all(
      files.map(async (file, i) => {
        const up = fresh[i];
        if (file.size > MAX_FILE_BYTES) return patch(up.key, { status: "error", detail: "Too large (25 MB max)." });
        if (kindOf(file) === "unsupported") return patch(up.key, { status: "error", detail: "This file type isn't supported yet." });
        const path = `${userId}/${sid}/${crypto.randomUUID()}-${safeName(file.name)}`;
        try {
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (upErr) throw new Error("Upload failed. Check your connection and try again.");
          patch(up.key, { status: "reading" });
          const ex = await extractFile(file, sid, (s) => patch(up.key, { detail: s }));
          const { data, error } = await db
            .from("chat_context_items")
            .insert({
              session_id: sid,
              user_id: userId,
              kind: source?.[i] ? "google" : "file",
              name: file.name.slice(0, 300),
              mime: file.type || null,
              size_bytes: file.size,
              storage_path: path,
              source_url: source?.[i]?.url ?? null,
              content: ex.text,
              meta: { pages: ex.pages, note: ex.note },
            })
            .select(COLUMNS)
            .single();
          if (error) throw new Error("Couldn't save it to this chat.");
          patch(up.key, { status: "ready", detail: ex.note, itemId: data.id, image: ex.image });
          if (current.current === sid) setItems((prev) => [...prev, data as LibraryItem]);
        } catch (e) {
          supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
          patch(up.key, { status: "error", detail: (e as Error).message || "Something went wrong." });
        }
      }),
    );
  };

  const addText = async (kind: "note" | "output" | "message", name: string, content: string, ensureSession: () => Promise<string | null>, meta: Record<string, unknown> = {}) => {
    if (!userId || !content.trim()) return null;
    const sid = await ensureSession();
    if (!sid) throw new Error("Couldn't start a chat to save this in.");
    const { data, error } = await db
      .from("chat_context_items")
      .insert({ session_id: sid, user_id: userId, kind, name: name.trim().slice(0, 300) || "Untitled", content, meta })
      .select(COLUMNS)
      .single();
    if (error) throw new Error("Couldn't save it to this chat.");
    if (current.current === sid) setItems((prev) => [...prev, data as LibraryItem]);
    return data as LibraryItem;
  };

  const addOutput = (file: OutputFile, ensureSession: () => Promise<string | null>) =>
    addText("output", file.name, file.content, ensureSession, { format: file.format });

  const remove = async (item: LibraryItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setUploads((prev) => prev.filter((u) => u.itemId !== item.id));
    await db.from("chat_context_items").delete().eq("id", item.id);
    // Keep the stored file if another chat still uses it
    if (item.storage_path) {
      const { count } = await db.from("chat_context_items").select("id", { count: "exact", head: true }).eq("storage_path", item.storage_path);
      if (!count) await supabase.storage.from(BUCKET).remove([item.storage_path]);
    }
  };

  const togglePin = async (item: LibraryItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, pinned: !i.pinned } : i)));
    const { error } = await db.from("chat_context_items").update({ pinned: !item.pinned }).eq("id", item.id);
    if (error) refresh();
  };

  const readText = async (item: LibraryItem): Promise<string> => {
    const { data } = await db.from("chat_context_items").select("content").eq("id", item.id).single();
    return (data?.content as string) ?? "";
  };

  /** Download the original upload, or the stored text for notes and replies. */
  const download = async (item: LibraryItem) => {
    let url: string;
    if (item.storage_path) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item.storage_path, 120, { download: item.name });
      if (error || !data) throw new Error("Couldn't get the file.");
      url = data.signedUrl;
    } else {
      const text = await readText(item);
      url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = item.storage_path ? item.name : `${item.name.replace(/\.[a-z0-9]+$/i, "")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /** Recent library items from the user's other chats, to reuse here. */
  const fromOtherChats = async (): Promise<(LibraryItem & { chat: string })[]> => {
    if (!userId) return [];
    const { data } = await db
      .from("chat_context_items")
      .select(`${COLUMNS}, ai_chat_sessions(title)`)
      .eq("user_id", userId)
      .neq("session_id", current.current ?? "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: false })
      .limit(40);
    return ((data ?? []) as (LibraryItem & { ai_chat_sessions: { title: string } | null })[]).map((r) => ({ ...r, chat: r.ai_chat_sessions?.title ?? "Another chat" }));
  };

  const copyFrom = async (item: LibraryItem, ensureSession: () => Promise<string | null>) => {
    const content = await readText(item);
    const sid = await ensureSession();
    if (!sid || !userId) throw new Error("Couldn't start a chat to save this in.");
    const { data, error } = await db
      .from("chat_context_items")
      .insert({ session_id: sid, user_id: userId, kind: item.kind, name: item.name, mime: item.mime, size_bytes: item.size_bytes, storage_path: item.storage_path, source_url: item.source_url, content, meta: item.meta ?? {} })
      .select(COLUMNS)
      .single();
    if (error) throw new Error("Couldn't add it to this chat.");
    if (current.current === sid) setItems((prev) => [...prev, data as LibraryItem]);
  };

  const clearUploads = (keys?: string[]) => setUploads((prev) => (keys ? prev.filter((u) => !keys.includes(u.key)) : prev.filter((u) => u.status !== "ready" && u.status !== "error")));

  return { items, loading, available, uploads, refresh, addFiles, addText, addOutput, remove, togglePin, readText, download, fromOtherChats, copyFrom, clearUploads };
}

export const totalChars = (items: LibraryItem[]) => items.reduce((a, i) => a + (i.char_count ?? 0), 0);

/** Mirrors the server's budget: characters of library one reply reads, by model input price. */
export const libraryBudget = (inputPricePerM: number) =>
  (inputPricePerM <= 0.35 ? 150_000 : inputPricePerM <= 1.5 ? 80_000 : inputPricePerM <= 3 ? 50_000 : 30_000) * 4;
