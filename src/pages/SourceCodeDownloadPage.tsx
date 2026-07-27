import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Code, Shield, AlertTriangle, Github, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// SECURITY: The full source is NOT bundled into the client anymore. The
// download is produced server-side by the admin-source-export edge function,
// which verifies an admin JWT before returning anything. Non-admin callers
// get 403 from the server; the client gate below is UX only.

const SourceCodeDownloadPage: React.FC = () => {
  const { user, session, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [isBuilding, setIsBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!authLoading && !roleLoading && (!user || !isAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDownload = async () => {
    setIsBuilding(true);
    setNotice(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-source-export`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!resp.ok) {
        let msg = `Server returned ${resp.status}`;
        try {
          const json = await resp.json();
          if (resp.status === 403) {
            msg = "Access denied — admin role required.";
          } else if (json?.error === "source_export_not_configured") {
            msg = json.message || "Source export is not configured on the server.";
            setNotice(msg);
            toast({ title: "Export not configured", description: msg });
            return;
          } else if (json?.error) {
            msg = json.error;
          }
        } catch { /* body wasn't JSON */ }
        toast({ title: "Download failed", description: msg, variant: "destructive" });
        setNotice(msg);
        return;
      }

      const blob = await resp.blob();
      const disposition = resp.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = match?.[1] ?? `refyn-source-${stamp}.zip`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

      toast({ title: "Download ready", description: filename });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Download failed", description: msg, variant: "destructive" });
      setNotice(msg);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Code className="h-8 w-8 text-blue-600" />
            Source Code Export
          </h1>
          <p className="text-slate-600 mt-2">
            Request a server-signed export of the Refyn Technologies codebase. Authorization is
            enforced on the server — the source is never shipped to your browser bundle.
          </p>
        </div>

        <Alert className="mb-6 border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Admin only, server-enforced</AlertTitle>
          <AlertDescription>
            The download is produced by an edge function that verifies your admin role from the
            database before returning anything. Non-admin sessions receive an access-denied response.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Request source archive
            </CardTitle>
            <CardDescription>
              The server streams the archive from the connected repository. If no repository is
              configured yet, you'll receive a clear message from the server explaining what to set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleDownload} disabled={isBuilding} size="lg" className="w-full md:w-auto">
              {isBuilding ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Requesting…</>
              ) : (
                <><Download className="h-4 w-4 mr-2" /> Download source code (.zip)</>
              )}
            </Button>
            {notice && (
              <Alert className="border-slate-300 bg-slate-50">
                <AlertTitle>Server response</AlertTitle>
                <AlertDescription className="text-sm text-slate-700 break-words">{notice}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              How this is protected
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <p>
              The previous version of this page used a build-time source glob that shipped every
              source file into the browser bundle. That has been removed entirely — the client
              contains no raw source and no glob loader.
            </p>
            <p>
              The <code>admin-source-export</code> edge function verifies a valid JWT, checks the
              caller's admin role via <code>has_role()</code> against <code>user_roles</code>, and
              only then streams the repository zipball from the configured Git remote to the caller.
            </p>
            <p className="flex items-center gap-2 text-slate-500 pt-2">
              <Github className="h-4 w-4" />
              To enable the actual archive download, connect a GitHub token and set{" "}
              <code>GITHUB_API_KEY</code>, <code>GITHUB_OWNER</code>, <code>GITHUB_REPO</code>{" "}
              (optionally <code>GITHUB_REF</code>) in project secrets.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SourceCodeDownloadPage;
