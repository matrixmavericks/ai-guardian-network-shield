import { useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, createCheckoutSession, type CheckoutLineItem } from "@/lib/stripe";

export interface StripeCheckoutProps {
  lineItems: CheckoutLineItem[];
  customerEmail?: string;
  registrationRequestId?: string;
  userId?: string;
  discountCode?: string;
  returnUrl?: string;
}

export function StripeCheckout(props: StripeCheckoutProps) {
  const options = useMemo(() => ({
    fetchClientSecret: () => createCheckoutSession(props),
  }), [JSON.stringify(props)]);

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
