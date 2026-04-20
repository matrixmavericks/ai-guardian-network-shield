import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("[webhook]", event.type, "env:", env);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_failed":
        console.log("payment failed:", event.data.object.id);
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("webhook error:", e.message);
    return new Response(`Webhook error: ${e.message}`, { status: 400 });
  }
});

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const requestId = session.metadata?.registrationRequestId;
  const discountCode = session.metadata?.discountCode;

  // Mark registration request as paid (admin will provision manually)
  if (requestId) {
    await supabase
      .from("registration_requests")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription || null,
      })
      .eq("id", requestId);

    // Record payment transaction
    await supabase.from("payment_transactions").insert({
      registration_request_id: requestId,
      paddle_transaction_id: session.id, // reusing existing column
      paddle_customer_id: session.customer,
      amount_inr: (session.amount_total || 0) / 100,
      currency: (session.currency || "inr").toUpperCase(),
      status: "paid",
      discount_code: discountCode || null,
      raw_event: session,
    });

    // Increment discount code usage
    if (discountCode) {
      await supabase.rpc("increment_discount_uses" as any, { _code: discountCode })
        .then(() => {})
        .catch(async () => {
          // fallback if RPC not present
          const { data } = await supabase.from("discount_codes")
            .select("uses_count").eq("code", discountCode).maybeSingle();
          if (data) {
            await supabase.from("discount_codes")
              .update({ uses_count: (data.uses_count || 0) + 1 })
              .eq("code", discountCode);
          }
        });
    }
  }
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId || null;
  const requestId = subscription.metadata?.registrationRequestId || null;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.id || null;
  const productId = item?.price?.product || null;
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      registration_request_id: requestId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      plan_id: priceId?.replace(/_(monthly|yearly)$/, "") || null,
      billing_cycle: priceId?.endsWith("_yearly") ? "yearly"
        : priceId?.endsWith("_monthly") ? "monthly" : null,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}
