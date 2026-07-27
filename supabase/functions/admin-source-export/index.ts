import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// This function gates source export behind a server-verified admin check.
// It does NOT bundle raw source into the client. When a GitHub connector is
// linked (GITHUB_API_KEY + optional GITHUB_OWNER/GITHUB_REPO/GITHUB_REF), it
// streams the repo zipball to the authorized caller. Otherwise it returns a
// structured 501 explaining how to enable the export.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: server-side admin check. Never trust client-supplied email/role.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });

    if (roleError || isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a GitHub token is configured, stream the repo zipball server-side.
    const githubToken =
      Deno.env.get("GITHUB_API_KEY") || Deno.env.get("GITHUB_TOKEN");
    const owner = Deno.env.get("GITHUB_OWNER");
    const repo = Deno.env.get("GITHUB_REPO");
    const ref = Deno.env.get("GITHUB_REF") || "main";
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (githubToken && owner && repo) {
      // Route through Lovable connector gateway if that path is available;
      // otherwise call GitHub REST directly with the token.
      const useGateway = Boolean(lovableApiKey && Deno.env.get("GITHUB_USE_GATEWAY"));
      const url = useGateway
        ? `https://connector-gateway.lovable.dev/github/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`
        : `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`;

      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
      };
      if (useGateway) {
        headers["Authorization"] = `Bearer ${lovableApiKey}`;
        headers["X-Connection-Api-Key"] = githubToken;
      } else {
        headers["Authorization"] = `Bearer ${githubToken}`;
        headers["User-Agent"] = "refyn-admin-source-export";
      }

      const ghResp = await fetch(url, { headers });
      if (!ghResp.ok) {
        const body = await ghResp.text();
        return new Response(
          JSON.stringify({ error: "GitHub zipball fetch failed", status: ghResp.status, details: body }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      return new Response(ghResp.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="refyn-source-${stamp}.zip"`,
        },
      });
    }

    // No GitHub credentials configured — source cannot be exported server-side.
    // The important guarantee is that raw source is NEVER bundled into the client.
    return new Response(
      JSON.stringify({
        error: "source_export_not_configured",
        message:
          "Server-side source export is authorized for you, but no GitHub credentials are configured. " +
          "An admin must set GITHUB_API_KEY, GITHUB_OWNER, and GITHUB_REPO in project secrets (optionally GITHUB_REF, default 'main') so this function can stream the repo zipball. " +
          "Raw source is intentionally NOT bundled into the client application.",
        required_secrets: ["GITHUB_API_KEY", "GITHUB_OWNER", "GITHUB_REPO"],
        optional_secrets: ["GITHUB_REF", "GITHUB_USE_GATEWAY"],
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-source-export error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
