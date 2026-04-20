import { useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Payment complete!</h1>
        <p className="text-muted-foreground mb-6">
          Thanks — we've received your payment. An admin will review and activate your account shortly.
          You'll receive an email with login details.
        </p>
        {sessionId && <p className="text-xs text-muted-foreground mb-4 font-mono">Ref: {sessionId.slice(-12)}</p>}
        <Button asChild><Link to="/">Back to home</Link></Button>
      </Card>
    </div>
  );
}
