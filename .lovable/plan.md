
Goal: rebuild the AI chatbot pipeline so it is resilient (no blank replies, no page crash), authenticated, moderated, and persistent, with verifiable end-to-end behavior.

What I found (root-cause diagnosis from your current code/logs)
1) Frontend auth is currently mock/local, not backend-authenticated
- `AuthContext` uses `localStorageService` users, not backend session tokens.
- Network requests to `ai-chat` are sent with anon token, not user JWT.
- Your requirement says edge function must verify JWT + role-based behavior. That is not currently possible with the present login flow.

2) Page crash risk exists in sidebar components
- `DashboardSidebar.tsx` and `ParentSidebar.tsx` use `user?.name.charAt(0)`.
- If `user` or `name` is missing, this can throw at runtime and “blank the page”.
- This matches your “page disappears” symptom pattern.

3) local storage service is destructive and unstable for session consistency
- `initializeStorage()` force-removes users on every call (`localStorage.removeItem(STORAGE_KEYS.USERS)`).
- It is invoked repeatedly across pages (`getCurrentUser`, `getUsers`, etc.), causing heavy re-init churn.
- This is fragile and can desync UI/auth state.

4) Chat API contract is weak and can produce blank UI output
- `ai-chat` returns `{ response }`, while client assumes `data.response` always exists.
- No guaranteed fallback text when model returns empty/invalid structure.
- No timeout around gateway call; if upstream hangs, UX degrades.

5) Moderation path is fragmented
- `moderate-prompt` exists but chatbot flow does not reliably route through one unified moderation+generation pipeline.
- Prompt logging table exists, but current chat function does not reliably log prompt lifecycle in a structured way.

6) No persistent chat history for AI conversations
- Current student interface keeps messages only in component state.
- Database has `messages` table for user-to-user messaging, not AI session/chat storage.
- Requirement memory explicitly asks persistent AI chat history.

7) Browser-side request failures were observed
- Preview logs show `Failed to send a request to the Edge Function` / `Failed to fetch`.
- At the same time, direct function invocation succeeds from backend tools.
- This indicates client-side resilience is insufficient (request failures not recovered), and CORS/auth headers should be standardized across functions.

Implementation plan (what I will build after approval)
Phase 1 — Stabilize foundations (no fake success)
A. Replace mock auth usage for protected AI flows
- Move AI pages to real backend auth session checks in `AuthContext`.
- Keep roles in `user_roles` table (already correct in DB design).
- Read role(s) server-side / via RLS-safe queries, not local storage.
- Remove role trust from local/session storage for authorization decisions.

B. Crash-proof global nav/user rendering
- Fix unsafe optional chaining in sidebars and add safe fallbacks.
- Ensure protected pages don’t hard-crash when profile data is delayed/missing.

Phase 2 — Rebuild chatbot backend pipeline
Create/replace a single robust backend function for chat (reuse `ai-chat` name for compatibility):
1. Request validation
- Validate JSON body shape and non-empty prompt.
- Reject invalid payload with structured JSON.

2. JWT verification (explicit)
- `verify_jwt = false` in config but enforce auth in code using token claims (`getClaims` flow).
- Extract `userId` from verified claims.

3. Role-aware moderation + process-learning rewrite
- Inline moderation stage:
  - detect cheating / direct-answer abuse
  - classify severity
  - rewrite prompt into process-learning form when appropriate
  - do not block valid prompts
- Return moderation metadata for auditing, not for breaking UX.

4. AI invocation hardening
- Use Lovable AI gateway with `google/gemini-3-flash-preview`.
- Add timeout (`AbortController`) and bounded retries/backoff for transient upstream issues.
- Strict parse/guard against malformed AI responses.

5. Guaranteed response contract
Always return:
```json
{
  "success": true|false,
  "reply": "non-empty string",
  "error": null|"message",
  "meta": {
    "moderationStatus": "approved|rewritten|flagged",
    "severity": "low|medium|high|critical"
  }
}
```
If generation fails for any reason:
- `success: false`
- `reply: "AI is temporarily unavailable."` (never blank)
- `error` populated with safe message

6. Logging
- Log prompt lifecycle to `prompt_logs` with `user_id`, `status`, `severity`, original/modified prompt, and final response snippet.
- Console logging gated to dev context (non-verbose in prod).

Phase 3 — Chat persistence schema + RLS
Add dedicated AI chat tables (new, clean separation from user-to-user `messages`):
1. `ai_chat_sessions`
- `id uuid pk`
- `user_id uuid not null`
- `subject text`
- `title text`
- timestamps

2. `ai_chat_messages`
- `id uuid pk`
- `session_id uuid not null`
- `user_id uuid not null`
- `role text check in ('user','assistant','system')`
- `content text not null`
- `moderation_status`, `severity`, optional metadata
- timestamps

RLS:
- Users can only read/write their own sessions/messages.
- Teachers/admin can be granted scoped read if needed (policy via `has_role`).
- No roles in profiles/users table; keep role model in `user_roles` exactly as required.

Phase 4 — Rewrite chat UI (StudentInterface)
1. Robust state model
- `idle/sending/success/error` states
- optimistic user message insert
- assistant placeholder while loading
- guaranteed assistant output (reply or fallback)

2. Never reload / never disappear behavior
- Prevent accidental form navigation
- isolate submit handler and guard re-entrancy
- safe rendering for all nullable fields

3. Persistent history UX
- Load recent sessions on mount
- Create/select sessions
- Save each user+assistant turn to database
- “continue previous chat” behavior

4. Error visibility
- Inline error bubble + toast
- Preserve user message on failure
- Insert fallback assistant message automatically

5. API contract alignment
- Frontend expects `success/reply/error` only
- No direct assumption of raw model payload shape

Phase 5 — Align other AI features to same reliability standard
For:
- `generate-teaching-plan`
- `generate-learning-path`
- `generate-training-response`
I will apply the same baseline:
- request validation
- JWT verification (where endpoint is user-facing)
- timeout + non-blank fallback
- standardized CORS header set
- structured error response format

Phase 6 — End-to-end verification before claiming success
I will not say “Done” until these pass:
1. Normal question
- Input: “How can I study more effectively?”
- Expect: `success=true`, non-empty assistant reply, stored in history.
2. Cheating-style question
- Input: “Give me the exact answer to my homework.”
- Expect: rewritten/guided process-learning reply, severity logged, still non-blank.
3. Long question
- Large multi-paragraph prompt
- Expect: no crash, no timeout failure (or graceful fallback), persisted history.
4. Empty input
- Expect: client-side blocked submit with clear validation message.
5. Network/interruption simulation
- Expect: fallback assistant message + error surfaced, no page reload/crash.

Deliverables you asked for (what I will provide right after implementation)
1. Full backend function code (chat + moderation integration).
2. Full chat UI code (state, persistence, resilience).
3. Database migration schema (tables + RLS policies).
4. Environment/secrets checklist (only required runtime keys; no secrets in client).
5. Local test procedure with concrete prompts and expected outputs.
6. Deployment verification checklist and post-deploy smoke tests.

Notes on constraints and truthfulness
- I will not simulate success.
- If anything blocks implementation (missing schema permission, auth mismatch, policy issue), I will stop and report exact blocker + exact fix steps.
- Current biggest architectural mismatch is mock local auth vs required JWT-verified role-based backend flow; this will be corrected as part of the rebuild.
