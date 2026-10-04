import { AppShell } from "@/components/app-shell";
import { CheckoutClient } from "@/components/checkout-client";
import { getUpiId, getUpiName } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppShell email={user?.email}>
      <CheckoutClient upiId={getUpiId()} upiName={getUpiName()} />
    </AppShell>
  );
}
