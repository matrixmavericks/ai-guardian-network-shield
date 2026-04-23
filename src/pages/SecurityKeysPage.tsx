import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ExternalLink } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";

const SecurityKeysPage: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Security Keys</h1>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
                <div>
                  <CardTitle>API key storage has moved</CardTitle>
                  <CardDescription>
                    For security, API keys and other secrets are no longer stored in the application database.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">
                Storing third-party API keys in a regular database table — even with admin-only access —
                creates risk: any SQL injection, compromised admin account, or backup leak would expose
                every key at once. Secrets should live in a dedicated secrets manager.
              </p>
              <p className="text-sm text-slate-700">
                Add or rotate secrets through <strong>Lovable Cloud → Secrets</strong>. Edge functions can
                then read them at runtime via <code className="bg-slate-100 px-1 py-0.5 rounded">Deno.env.get(...)</code> —
                they are never sent to the browser.
              </p>
              <div className="rounded-md bg-slate-100 p-4 text-xs text-slate-600">
                <p className="font-medium mb-1">Why this matters</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Keys are encrypted at rest in the secrets manager.</li>
                  <li>Only your edge functions can read them — never the client.</li>
                  <li>Rotating a key updates every function automatically.</li>
                </ul>
              </div>
              <Button asChild variant="outline">
                <a
                  href="https://docs.lovable.dev/features/security"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read security docs <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SecurityKeysPage;
