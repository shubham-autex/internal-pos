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
  return process.env.NEXT_PUBLIC_UPI_ID ?? "yourstall@upi";
}

export function getUpiName() {
  return process.env.NEXT_PUBLIC_UPI_NAME ?? "Mela Stall";
}
