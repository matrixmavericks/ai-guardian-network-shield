import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Code, Terminal, Shield, AlertTriangle, Github } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const MASTER_ADMIN_EMAIL = "info.aiconditioner@gmail.com";

// Pull every source file in the repo as a raw string at build time.
// Vite resolves these globs statically; the resulting bundle contains the file contents.
const sourceFiles = import.meta.glob(
  [
    "/src/**/*",
    "/supabase/**/*",
    "/public/**/*",
    "/index.html",
    "/package.json",
    "/tsconfig*.json",
    "/vite.config.ts",
    "/tailwind.config.ts",
    "/postcss.config.js",
    "/components.json",
    "/eslint.config.js",
    "/README.md",
  ],
  { query: "?raw", import: "default", eager: false }
) as Record<string, () => Promise<string>>;

const SourceCodeDownloadPage: React.FC = () => {
  const { user } = useAuth();
  const [isBuilding, setIsBuilding] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileCount = useMemo(() => Object.keys(sourceFiles).length, []);

  if (!user || user.role !== "admin" || user.email !== MASTER_ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDownload = async () => {
    setIsBuilding(true);
    setProgress(0);
    try {
      const zip = new JSZip();
      const entries = Object.entries(sourceFiles);
      let done = 0;

      for (const [path, loader] of entries) {
        try {
          const content = await loader();
          // Strip leading slash so files unzip into a folder relative path
          zip.file(path.replace(/^\//, ""), content as string);
        } catch (err) {
          console.warn(`Skipped ${path}:`, err);
        }
        done += 1;
        if (done % 10 === 0 || done === entries.length) {
          setProgress(Math.round((done / entries.length) * 100));
        }
      }

      // Add a README explaining how to run locally
      zip.file(
        "RUN_LOCALLY.md",
        `# Running Refyn Technologies Locally

This archive contains the full source code of the Refyn Technologies platform.

## Prerequisites
- Node.js 18+ and npm (or bun)
- A Supabase project (or use Lovable Cloud)

## Steps
1. Unzip this archive and \`cd\` into the folder.
2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
3. Create a \`.env\` file in the root with:
   \`\`\`
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=your-project-id
   \`\`\`
4. Start the dev server:
   \`\`\`
   npm run dev
   \`\`\`
5. Visit http://localhost:8080

## Deploying Edge Functions
Edge functions live under \`supabase/functions/\`. Deploy with the Supabase CLI:
\`\`\`
supabase functions deploy <function-name>
\`\`\`

## Database Schema
SQL migrations are in \`supabase/migrations/\`. Apply them in order via the Supabase CLI or SQL editor.

Generated: ${new Date().toISOString()}
`
      );

      const blob = await zip.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        (meta) => setProgress(Math.round(meta.percent))
      );

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      saveAs(blob, `refyn-technologies-source-${stamp}.zip`);

      toast({
        title: "Download ready",
        description: `Bundled ${entries.length} files into a zip archive.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsBuilding(false);
      setProgress(0);
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
            Download the entire Refyn Technologies codebase as a zip so you can run, audit, or self-host the model and platform.
          </p>
        </div>

        <Alert className="mb-6 border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Master admin only</AlertTitle>
          <AlertDescription>
            This export contains the complete frontend, edge functions, and SQL migrations. It does NOT include any
            secrets (API keys, service role tokens) or production data. Treat the archive as confidential intellectual
            property.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download full source archive
            </CardTitle>
            <CardDescription>
              Bundles {fileCount} source files (frontend, backend functions, SQL migrations, configs) into a single
              zip generated locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleDownload} disabled={isBuilding} size="lg" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              {isBuilding ? `Building archive… ${progress}%` : "Download source code (.zip)"}
            </Button>
            {isBuilding && (
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Run the model & website locally
            </CardTitle>
            <CardDescription>Quick start after unzipping the archive.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
              <li>Unzip and open the folder in your editor.</li>
              <li>
                Install dependencies:
                <pre className="mt-1 bg-slate-900 text-slate-100 p-2 rounded text-xs">npm install</pre>
              </li>
              <li>
                Create a <code className="bg-slate-100 px-1 rounded">.env</code> file with your backend URL and anon
                key (or connect a fresh Lovable Cloud / Supabase project):
                <pre className="mt-1 bg-slate-900 text-slate-100 p-2 rounded text-xs whitespace-pre-wrap">
{`VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...`}
                </pre>
              </li>
              <li>
                Start the dev server:
                <pre className="mt-1 bg-slate-900 text-slate-100 p-2 rounded text-xs">npm run dev</pre>
              </li>
              <li>
                Apply the SQL files in <code className="bg-slate-100 px-1 rounded">supabase/migrations/</code> and
                deploy the edge functions in <code className="bg-slate-100 px-1 rounded">supabase/functions/</code>.
              </li>
              <li>Visit http://localhost:8080</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              What's included / excluded
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <p><strong>Included:</strong> all React/TypeScript source, Tailwind config, Supabase edge functions, SQL migrations, public assets, package manifests.</p>
            <p><strong>Excluded:</strong> <code>node_modules/</code>, build output, the live <code>.env</code> file, secrets, user data, and the production Supabase service role key.</p>
            <p className="flex items-center gap-2 text-slate-500 pt-2">
              <Github className="h-4 w-4" />
              For version-controlled access, connect this Lovable project to GitHub via the share menu.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SourceCodeDownloadPage;
