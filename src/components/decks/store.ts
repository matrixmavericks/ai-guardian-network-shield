import { supabase } from "@/integrations/supabase/client";
import type { Deck, DeckBrief, DeckDesign } from "./types";

// Decks live in studio_decks (one JSON document each); images in the private
// studio-media bucket, shown through signed URLs refreshed on load.

// The table is newer than the generated Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const BUCKET = "studio-media";

export type DeckRow = { id: string; title: string; deck: Deck; slide_count: number; session_id: string | null; updated_at: string; created_at: string };

export const DEFAULT_DESIGN: DeckDesign = { theme: "midnight", imageStyle: "illustration", images: true };

export async function createDeck(userId: string, brief: DeckBrief, design: DeckDesign, title = "Untitled presentation"): Promise<string> {
  const deck: Deck = { version: 1, title, design, slides: [], brief };
  const { data, error } = await db
    .from("studio_decks")
    .insert({ user_id: userId, session_id: brief.sessionId ?? null, title, deck, slide_count: 0 })
    .select("id")
    .single();
  if (error || !data) throw new Error("Couldn't create the presentation.");
  return data.id as string;
}

/** Strip runtime-only image URLs before saving. */
const forStorage = (deck: Deck): Deck => ({
  ...deck,
  slides: deck.slides.map((s) => (s.image ? { ...s, image: { ...s.image, url: s.image.path ? undefined : s.image.url?.startsWith("data:") ? undefined : s.image.url, state: s.image.state === "generating" ? "pending" : s.image.state } } : s)),
});

export async function saveDeck(id: string, deck: Deck) {
  const { error } = await db.from("studio_decks").update({ title: deck.title.slice(0, 300) || "Untitled presentation", deck: forStorage(deck), slide_count: deck.slides.length }).eq("id", id);
  if (error) throw new Error("Couldn't save.");
}

/** Signed URLs for every stored image in a deck. */
export async function withImageUrls(deck: Deck): Promise<Deck> {
  const paths = deck.slides.map((s) => s.image?.path).filter((p): p is string => !!p);
  if (!paths.length) return deck;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24 * 7);
  const url = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return { ...deck, slides: deck.slides.map((s) => (s.image?.path && url.get(s.image.path) ? { ...s, image: { ...s.image, url: url.get(s.image.path)!, state: "done" } } : s)) };
}

export async function loadDeck(id: string): Promise<DeckRow | null> {
  const { data } = await db.from("studio_decks").select("id, title, deck, slide_count, session_id, updated_at, created_at").eq("id", id).maybeSingle();
  if (!data) return null;
  return { ...data, deck: await withImageUrls(data.deck as Deck) } as DeckRow;
}

export async function listDecks(userId: string): Promise<DeckRow[]> {
  const { data } = await db.from("studio_decks").select("id, title, deck, slide_count, session_id, updated_at, created_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(60);
  const rows = (data ?? []) as DeckRow[];
  // Cover images for the gallery thumbnails
  const paths = rows.map((r) => r.deck.slides?.[0]?.image?.path).filter((p): p is string => !!p);
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
    const url = new Map((signed ?? []).map((d) => [d.path, d.signedUrl]));
    for (const r of rows) {
      const img = r.deck.slides?.[0]?.image;
      if (img?.path && url.get(img.path)) r.deck.slides[0] = { ...r.deck.slides[0], image: { ...img, url: url.get(img.path)!, state: "done" } };
    }
  }
  return rows;
}

export async function deleteDeck(id: string, deck: Deck) {
  await db.from("studio_decks").delete().eq("id", id);
  const paths = deck.slides.map((s) => s.image?.path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

/** Upload the teacher's own image for a slide. */
export async function uploadSlideImage(userId: string, file: File): Promise<{ path: string; url: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Images can be up to 15 MB.");
  const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "png").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error("Upload failed.");
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  return { path, url: data?.signedUrl ?? "" };
}
