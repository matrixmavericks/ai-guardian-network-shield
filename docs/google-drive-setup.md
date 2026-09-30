# Connecting Google Drive to the Refyn assistant

Teachers can save assistant files straight into Google Docs and Google Sheets,
and add Docs, Sheets, Slides and Drive files to a chat's library. This needs a
Google Cloud project once; after that every teacher just clicks "Allow" the
first time they use it.

Refyn asks only for the `drive.file` permission: it can see and edit files the
teacher creates through Refyn or picks in the Google Picker, nothing else in
their Drive. Google classes this as a non-sensitive scope, so the app doesn't
need Google's security review.

## 1. Create the project (about 10 minutes)

1. Go to https://console.cloud.google.com, create a project called "Refyn".
2. **APIs & Services → Library**: enable **Google Drive API** and **Google Picker API**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - App name "Refyn", support email, logo optional.
   - Audience: **External**, then **Publish app** (Testing mode only allows listed test users).
   - Data access: add the scope `https://www.googleapis.com/auth/drive.file`.
4. **Credentials → Create credentials → OAuth client ID**:
   - Type: **Web application**, name "Refyn web".
   - Authorised JavaScript origins:
     - `https://refyntech.us`
     - `https://ai-guardian-network-shield.lovable.app`
     - `https://id-preview--459b9f4d-ebb8-42c0-b3d6-e48972276898.lovable.app`
     - `http://localhost:8080`
   - No redirect URIs are needed.
   - Copy the **Client ID** (ends in `.apps.googleusercontent.com`).
5. **Credentials → Create credentials → API key**:
   - Restrict it: Application restrictions → **Websites** → the same origins as above
     (e.g. `https://refyntech.us/*`); API restrictions → **Google Picker API** only.
   - Copy the key.
6. **IAM & Admin → Settings**: copy the **Project number** (digits only).

## 2. Add the values to Refyn

These values are designed to be public (they only work from the origins above),
so they go in the repo's `.env`:

```
VITE_GOOGLE_CLIENT_ID="…apps.googleusercontent.com"
VITE_GOOGLE_API_KEY="AIza…"
VITE_GOOGLE_APP_ID="123456789012"
```

Commit, let Lovable sync, and publish. The Google buttons in the assistant light
up for teachers as soon as `VITE_GOOGLE_CLIENT_ID` is set (the Drive picker also
needs the API key).

## What teachers see

- On a file the assistant made: **Save to Google Docs** / **Save to Google Sheets**
  converts it and opens it in a new tab.
- In the chat's **Files & context** panel: **Google Drive** opens the picker; picked
  Docs, Sheets and Slides are exported and read into the library, with a link back.
