import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StripeCheckout } from "@/components/StripeCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ALL_PLAN_LABELS } from "@/lib/planConfigs";

interface RegRequest {
  id: string;
  email: string;
  full_name: string;
  payment_plan: string | null;
  payment_amount_inr: number | null;
  payment_status: string | null;
  seat_config: any;
}

const PRICE_MAP: Record<string, string> = {
  starter_monthly: "student_starter_monthly",
  starter_yearly: "student_starter_yearly",
  standard_monthly: "student_standard_monthly",
  standard_yearly: "student_standard_yearly",
  premium_monthly: "student_premium_monthly",
  premium_yearly: "student_premium_yearly",
  teacher_individual_monthly: "teacher_individual_monthly",
  teacher_individual_yearly: "teacher_individual_yearly",
  teacher_pro_monthly: "teacher_pro_monthly",
  teacher_pro_yearly: "teacher_pro_yearly",
  teacher_master_monthly: "teacher_master_monthly",
  teacher_master_yearly: "teacher_master_yearly",
};

function buildLineItems(request: RegRequest): { priceId: string; quantity?: number }[] {
  const plan = request.payment_plan || "";
  // School per-seat plan
  if (plan.startsWith("school_")) {
    const [_s, tier, cycle] = plan.split("_"); // school_starter_monthly
    const platformId = `school_${tier}_platform_${cycle}`;
    const items: { priceId: string; quantity?: number }[] = [{ priceId: platformId }];
    const seats = request.seat_config || {};
    if (seats.teachers > 0) items.push({ priceId: `school_${tier}_per_teacher`, quantity: seats.teachers });
    if (seats.students > 0) items.push({ priceId: `school_${tier}_per_student`, quantity: seats.students });
    return items;
  }
  const mapped = PRICE_MAP[plan];
  return mapped ? [{ priceId: mapped }] : [];
}

export default function PayPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RegRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<string | undefined>();
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    (async () => {
      if (!requestId) return;
      const { data, error } = await supabase
        .from("registration_requests")
        .select("id, email, full_name, payment_plan, payment_amount_inr, payment_status, seat_config")
        .eq("id", requestId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Registration request not found");
        navigate("/");
        return;
      }
      setRequest(data as RegRequest);
      setLoading(false);
    })();
  }, [requestId, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>;
  }
  if (!request) return null;

  if (request.payment_status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Payment received ✓</h2>
          <p className="text-muted-foreground mb-4">
            An admin will activate your account shortly. You'll receive a login email.
          </p>
          <Button onClick={() => navigate("/")}>Back to home</Button>
        </Card>
      </div>
    );
  }

  const lineItems = buildLineItems(request);
  if (!lineItems.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-destructive">Plan not configured</h2>
          <p className="text-muted-foreground">Please contact support.</p>
        </Card>
      </div>
    );
  }

  const planLabel = ALL_PLAN_LABELS[request.payment_plan || ""] || request.payment_plan;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="container max-w-3xl mx-auto p-6">
        <Card className="p-6 mb-4">
          <h1 className="text-2xl font-bold mb-1">Complete your payment</h1>
          <p className="text-muted-foreground">
            Plan: <span className="font-medium text-foreground">{planLabel}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">{request.email}</p>
        </Card>

        {!showCheckout ? (
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Discount code (optional)</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EARLYBIRD20"
                />
                <Button variant="outline" onClick={() => {
                  setAppliedDiscount(discountCode || undefined);
                  toast.success(discountCode ? `Code ${discountCode} will be applied` : "Code cleared");
                }}>Apply</Button>
              </div>
              {appliedDiscount && <p className="text-xs text-muted-foreground mt-1">
                Code {appliedDiscount} will be validated at checkout.
              </p>}
            </div>
            <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
              Continue to payment
            </Button>
          </Card>
        ) : (
          <Card className="p-4">
            <StripeCheckout
              lineItems={lineItems}
              customerEmail={request.email}
              registrationRequestId={request.id}
              discountCode={appliedDiscount}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&request=${request.id}`}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
