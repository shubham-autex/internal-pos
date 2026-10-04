import { CheckoutClient } from "@/components/checkout-client";
import { getUpiId, getUpiName } from "@/lib/env";

export default function CheckoutPage() {
  return <CheckoutClient upiId={getUpiId()} upiName={getUpiName()} />;
}
