import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { X } from "lucide-react";

const DISMISS_KEY = "refyn_claim_google_dismissed";

/**
 * Shown to accounts that were provisioned with a temporary password (no Google
 * identity yet). Signing in with Google on the same verified school address
 * attaches that identity to this account instead of creating a second one.
 */
const ClaimGoogleAccountCard = () => {
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!active || !user) return;
      const identities = (user as any).identities as { provider: string }[] | undefined;
      const hasGoogle = (identities ?? []).some((i) => i.provider === "google");
      setEmail(user.email ?? "");
      setShow(!hasGoogle);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!show) return null;

  const claim = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({
        title: "Couldn't link Google",
        description: error.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-6 border-primary/40 bg-primary/5">
      <CardContent className="py-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="font-medium">Use your school Google account to sign in</p>
          <p className="text-sm text-muted-foreground max-w-xl">
            Your account was set up with a temporary password
            {email ? <> for <span className="font-mono text-xs">{email}</span></> : null}. Link it to your school Google
            account and you'll never need that password again.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={claim}>Link Google account</Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setShow(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimGoogleAccountCard;
