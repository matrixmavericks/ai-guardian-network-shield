import React, { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Shield } from "lucide-react";
import { loadLegalDoc, LEGAL_DOC_META, type LegalDocKey, type LegalDoc } from "@/lib/legalDocs";

const ROUTE_TO_KEY: Record<string, LegalDocKey> = {
  terms: "terms",
  privacy: "privacy",
  "data-protection": "data_protection",
};

const LegalDocPage = () => {
  const { doc: docSlug } = useParams<{ doc: string }>();
  const key = docSlug ? ROUTE_TO_KEY[docSlug] : undefined;
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;
    loadLegalDoc(key).then((d) => {
      setDoc(d);
      setLoading(false);
    });
  }, [key]);

  if (!key) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">Refyn Technologies</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {loading || !doc ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{doc.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Last updated: {doc.updatedAt}</p>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {doc.body}
              </pre>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex flex-wrap gap-3 text-sm print:hidden">
          {(Object.keys(LEGAL_DOC_META) as LegalDocKey[]).map((k) => (
            <Link
              key={k}
              to={LEGAL_DOC_META[k].route}
              className="text-primary hover:underline"
            >
              {LEGAL_DOC_META[k].title}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LegalDocPage;
