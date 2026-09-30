// Google Drive for teachers: save assistant files as Google Docs / Sheets and
// bring Drive files into a chat's library.
//
// Uses Google Identity Services in the browser with the `drive.file` scope, so
// Refyn only ever sees files the teacher creates through it or picks in the
// Google Picker. Needs a Google Cloud OAuth client ID (and, for the picker, an
// API key and project number) in:
//   VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY, VITE_GOOGLE_APP_ID
// Setup steps: docs/google-drive-setup.md

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? "";
const API_KEY = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim() ?? "";
const APP_ID = (import.meta.env.VITE_GOOGLE_APP_ID as string | undefined)?.trim() ?? "";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

export const googleReady = () => !!CLIENT_ID;
export const pickerReady = () => !!CLIENT_ID && !!API_KEY;

type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void; callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void };
declare global {
  interface Window {
    google?: {
      accounts: { oauth2: { initTokenClient: (c: { client_id: string; scope: string; callback: TokenClient["callback"]; error_callback?: (e: { type: string }) => void }) => TokenClient } };
      picker?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    gapi?: { load: (lib: string, cb: () => void) => void };
  }
}

const loaded = new Map<string, Promise<void>>();
const loadScript = (src: string) => {
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => { loaded.delete(src); reject(new Error("Couldn't reach Google. Check your connection.")); };
        document.head.appendChild(s);
      }),
    );
  }
  return loaded.get(src)!;
};

let token: { value: string; expires: number } | null = null;

/** An access token for Drive, asking the teacher to allow access the first time. */
export async function driveToken(): Promise<string> {
  if (!CLIENT_ID) throw new Error("Google Drive isn't set up for Refyn yet.");
  if (token && token.expires > Date.now() + 60_000) return token.value;
  await loadScript("https://accounts.google.com/gsi/client");
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error === "access_denied" ? "Google access wasn't allowed." : "Couldn't connect to Google."));
        token = { value: r.access_token, expires: Date.now() + (r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e) => reject(new Error(e.type === "popup_closed" ? "The Google window was closed." : "Couldn't open the Google sign-in window. Allow pop-ups for Refyn.")),
    });
    client.requestAccessToken({ prompt: token ? "" : "consent" });
  });
}

const DOC = "application/vnd.google-apps.document";
const SHEET = "application/vnd.google-apps.spreadsheet";
const SLIDES = "application/vnd.google-apps.presentation";

/** Upload a file to the teacher's Drive, converting it to a Google Doc, Sheet or Slides. */
export async function saveToDrive(blob: Blob, name: string, as: "doc" | "sheet" | "slides"): Promise<{ id: string; url: string }> {
  const access = await driveToken();
  const meta = { name, mimeType: as === "doc" ? DOC : as === "sheet" ? SHEET : SLIDES };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  form.append("file", blob);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
    body: form,
  });
  if (res.status === 401) { token = null; throw new Error("Google sign-in expired. Try again."); }
  if (!res.ok) throw new Error(`Google Drive said no (${res.status}).`);
  const data = await res.json();
  return { id: data.id, url: data.webViewLink ?? `https://docs.google.com/${as === "doc" ? "document" : as === "sheet" ? "spreadsheets" : "presentation"}/d/${data.id}/edit` };
}

export type DriveFile = { id: string; name: string; mimeType: string; url: string };

/** Let the teacher pick Drive files with the Google Picker. */
export async function pickDriveFiles(): Promise<DriveFile[]> {
  if (!pickerReady()) throw new Error("The Google Drive picker isn't set up for Refyn yet.");
  const access = await driveToken();
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((r) => window.gapi!.load("picker", () => r()));
  const g = window.google!.picker;
  return new Promise((resolve) => {
    const view = new g.DocsView(g.ViewId.DOCS)
      .setIncludeFolders(true)
      .setMimeTypes([DOC, SHEET, SLIDES, "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "text/plain", "text/csv", "image/png", "image/jpeg"].join(","));
    const builder = new g.PickerBuilder()
      .addView(view)
      .enableFeature(g.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(access)
      .setDeveloperKey(API_KEY)
      .setTitle("Add files to this chat")
      .setCallback((data: { action: string; docs?: { id: string; name: string; mimeType: string; url: string }[] }) => {
        if (data.action === g.Action.PICKED) resolve((data.docs ?? []).map((d) => ({ id: d.id, name: d.name, mimeType: d.mimeType, url: d.url })));
        else if (data.action === g.Action.CANCEL) resolve([]);
      });
    if (APP_ID) builder.setAppId(APP_ID);
    builder.build().setVisible(true);
  });
}

/**
 * Fetch a picked Drive file as a File for the normal extractor. Google Docs,
 * Sheets and Slides are exported to Word, Excel and PowerPoint first.
 */
export async function fetchDriveFile(f: DriveFile): Promise<File> {
  const access = await driveToken();
  const exportAs: Record<string, [string, string]> = {
    [DOC]: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
    [SHEET]: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
    [SLIDES]: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"],
  };
  const ex = exportAs[f.mimeType];
  const url = ex
    ? `https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=${encodeURIComponent(ex[0])}`
    : `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
  if (!res.ok) throw new Error(`Couldn't download "${f.name}" from Drive (${res.status}).`);
  const blob = await res.blob();
  const name = ex && !f.name.toLowerCase().endsWith(ex[1]) ? `${f.name}${ex[1]}` : f.name;
  return new File([blob], name, { type: ex ? ex[0] : f.mimeType });
}
