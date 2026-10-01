import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { OAuthAuthorizationDetails } from "@supabase/auth-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const id = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) { setError("This connection request is missing or has expired."); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const result = await supabase.auth.oauth.getAuthorizationDetails(id);
      if (!active) return;
      if (result.error) { setError(result.error.message); return; }
      if (result.data?.redirect_uri) { window.location.assign(result.data.redirect_uri); return; }
      setDetails(result.data);
    })().catch(() => { if (active) setError("Could not load this connection request. Try again."); });
    return () => { active = false; };
  }, [id]);

  async function decide(approve: boolean) {
    setBusy(true);
    const result = approve
      ? await supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
    if (result.error || !result.data?.redirect_url) {
      setError(result.error?.message ?? "The connection could not be completed.");
      setBusy(false);
      return;
    }
    window.location.assign(result.data.redirect_url);
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
    <div className="w-full max-w-md space-y-6">
      <p className="text-sm font-semibold uppercase text-muted-foreground">Refyn · Agent integrations</p>
      {error ? <p role="alert" className="text-destructive">{error}</p> : details ? <>
        <h1 className="text-3xl font-semibold">Connect {details.client?.client_name ?? "an assistant"}?</h1>
        <p className="text-muted-foreground">This assistant can see the classes your Refyn account can access. This connection cannot make changes.</p>
        <p className="text-sm text-muted-foreground">Signed in as {details.user.email}</p>
        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)}>Allow connection</Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Deny</Button>
        </div>
      </> : <p role="status">Loading connection request…</p>}
    </div>
  </main>;
}