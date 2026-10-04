import { getUpiAccounts } from "@/lib/upi";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

export function getUpiId() {
  return getUpiAccounts()[0]?.id ?? "yourstall@upi";
}

export function getUpiName() {
  return getUpiAccounts()[0]?.name ?? "Mela Stall";
}

export { getUpiAccounts };
