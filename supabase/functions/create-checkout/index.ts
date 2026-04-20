import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineItem { priceId: string; quantity?: number; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      lineItems,
      customerEmail,
      registrationRequestId,
      userId,
      discountCode,
      returnUrl,
      environment,
    } = await req.json() as {
      lineItems: LineItem[];
      customerEmail?: string;
      registrationRequestId?: string;
      userId?: string;
      discountCode?: string;
      returnUrl?: string;
      environment?: string;
    };

    if (!Array.isArray(lineItems) || !lineItems.length) {
      return new Response(JSON.stringify({ error: "lineItems required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Resolve all human-readable price IDs → real Stripe price IDs
    const resolvedItems: any[] = [];
    let isRecurring = false;
    for (const item of lineItems) {
      if (!/^[a-zA-Z0-9_-]+$/.test(item.priceId)) {
        return new Response(JSON.stringify({ error: `Invalid priceId: ${item.priceId}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const prices = await stripe.prices.list({ lookup_keys: [item.priceId] });
      if (!prices.data.length) {
        return new Response(JSON.stringify({ error: `Price not found: ${item.priceId}` }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const price = prices.data[0];
      if (price.type === "recurring") isRecurring = true;
      resolvedItems.push({ price: price.id, quantity: item.quantity || 1 });
    }

    // Optional discount code lookup from our DB
    let stripeDiscount: any[] | undefined;
    let appliedDiscountCode: string | null = null;
    let discountPercent = 0;
    if (discountCode) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: code } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (code && (!code.expires_at || new Date(code.expires_at) > new Date()) &&
          (!code.max_uses || code.uses_count < code.max_uses)) {
        appliedDiscountCode = code.code;
        // Create an ad-hoc coupon
        if (code.discount_type === "percent") {
          discountPercent = Number(code.discount_value);
          const coupon = await stripe.coupons.create({
            percent_off: discountPercent,
            duration: "once",
            name: `Code ${code.code}`,
          });
          stripeDiscount = [{ coupon: coupon.id }];
        } else {
          // flat ₹ amount → amount_off in paise
          const coupon = await stripe.coupons.create({
            amount_off: Math.round(Number(code.discount_value) * 100),
            currency: "inr",
            duration: "once",
            name: `Code ${code.code}`,
          });
          stripeDiscount = [{ coupon: coupon.id }];
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: resolvedItems,
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: returnUrl ||
        `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      ...(customerEmail && { customer_email: customerEmail }),
      ...(stripeDiscount && { discounts: stripeDiscount }),
      metadata: {
        ...(userId && { userId }),
        ...(registrationRequestId && { registrationRequestId }),
        ...(appliedDiscountCode && { discountCode: appliedDiscountCode }),
      },
      ...(isRecurring && {
        subscription_data: {
          metadata: {
            ...(userId && { userId }),
            ...(registrationRequestId && { registrationRequestId }),
          },
        },
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("create-checkout error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
