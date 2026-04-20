import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
export const stripeEnvironment = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export interface CheckoutLineItem { priceId: string; quantity?: number; }

export async function createCheckoutSession(opts: {
  lineItems: CheckoutLineItem[];
  customerEmail?: string;
  registrationRequestId?: string;
  userId?: string;
  discountCode?: string;
  returnUrl?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { ...opts, environment: stripeEnvironment },
  });
  if (error || !data?.clientSecret) {
    throw new Error(error?.message || data?.error || "Failed to create checkout");
  }
  return data.clientSecret as string;
}

export async function openCustomerPortal(returnUrl?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-portal-session", {
    body: { returnUrl, environment: stripeEnvironment },
  });
  if (error || !data?.url) throw new Error(error?.message || "Failed to open portal");
  window.open(data.url, "_blank");
}
