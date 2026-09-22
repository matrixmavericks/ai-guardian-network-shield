import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Download, Upload, Users, Loader2, CheckCircle2, AlertTriangle, KeyRound,
} from "lucide-react";
import {
  CSV_TEMPLATE, MISP_GRADE_LEVELS, MISP_STUDENT_DOMAIN, ParsedRow,
  toCredentialsCsv, validateImportCsv,
} from "@/lib/mispRoster";

type ResultRow = {
  email: string;
  username?: string;
  full_name: string;
  grade_level?: string;
  password?: string;
  status: string;
  error?: string;
};

const downloadFile = (name: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const PilotStudentImportPage = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  const errorCount = useMemo(() => rows.filter((r) => r.errors.length).length, [rows]);

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = validateImportCsv(text);
    setFileName(file.name);
    setFatal(parsed.fatal ?? null);
    setRows(parsed.rows);
    setResults(null);
  };

  const createAccounts = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("pilot-bulk-students", {
        body: {
          rows: rows.map(({ first_name, last_name, grade_level, username, email }) => ({
            first_name, last_name, grade_level, username, email,
          })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResults((data as any).results as ResultRow[]);
      toast({
        title: "Import finished",
        description: `${(data as any).created} new account(s) created out of ${(data as any).total} row(s).`,
      });
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link to="/pilot/mahindra" className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-3">
              <ArrowLeft className="h-3 w-3" /> Back to pilot console
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" /> Bulk student onboarding
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Upload one spreadsheet with first name, last name and grade. Every student gets a unique login and a
              generated password automatically.
            </p>
          </div>
          <Button variant="outline" onClick={() => downloadFile("mahindra-students-template.csv", CSV_TEMPLATE)}>
            <Download className="h-4 w-4 mr-2" /> Download template
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grades</CardTitle>
              <CardDescription>Use these exact values in the grade column.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {MISP_GRADE_LEVELS.map((g) => (
                <Badge key={g} variant="secondary">{g}</Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">How logins are built</CardTitle>
              <CardDescription>First 2 letters of each name plus the grade, kept unique.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Aarav Shah, MYP 4 →{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aa.sh.myp4@{MISP_STUDENT_DOMAIN}</code>
              </p>
              <p>
                If two students would get the same login, a number is added (aa.sh.myp4<strong>2</strong>), so no
                account is ever shared.
              </p>
              <p>Classes are not part of this file — students are mapped to courses by grade afterwards.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload the filled spreadsheet</CardTitle>
            <CardDescription>Everything is checked before a single account is created.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Choose CSV
              </Button>
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
              {rows.length > 0 && (
                <Badge variant={errorCount ? "destructive" : "secondary"}>
                  {rows.length} row(s){errorCount ? ` · ${errorCount} need fixing` : " · all valid"}
                </Badge>
              )}
            </div>

            {fatal && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{fatal}</AlertDescription>
              </Alert>
            )}

            {rows.length > 0 && (
              <div className="border rounded-lg overflow-x-auto max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>First name</TableHead>
                      <TableHead>Last name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r.errors.length ? "bg-destructive/5" : undefined}>
                        <TableCell>{r.first_name}</TableCell>
                        <TableCell>{r.last_name}</TableCell>
                        <TableCell>{r.grade_level}</TableCell>
                        <TableCell className="font-mono text-xs">{r.email || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.errors.length ? (
                            <span className="text-destructive">{r.errors.join("; ")}</span>
                          ) : (
                            <span className="text-emerald-600 inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={createAccounts}
                disabled={submitting || !rows.length || errorCount > 0}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                Create {rows.length || ""} account{rows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <Card className="border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Accounts & passwords
                </CardTitle>
                <CardDescription>
                  Download this now — passwords are shown only once and are not stored anywhere readable.
                </CardDescription>
              </div>
              <Button onClick={() => downloadFile("mahindra-student-credentials.csv", toCredentialsCsv(results))}>
                <Download className="h-4 w-4 mr-2" /> Download credentials
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>{r.grade_level ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.email}</TableCell>
                        <TableCell className="font-mono text-xs">{r.password ?? "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.status === "failed" ? (
                            <span className="text-destructive">{r.error}</span>
                          ) : (
                            r.status
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PilotStudentImportPage;
