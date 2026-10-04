import { LoginForm } from "@/components/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_-40px_rgba(18,32,39,0.55)] sm:p-8">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Mela Stall
        </p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Staff sign-in for the stall POS.
        </p>

        {!configured ? (
          <div className="mt-5 rounded-xl bg-[var(--accent-soft)] px-3 py-3 text-sm text-[var(--accent-ink)]">
            Missing env vars. Copy <code>.env.local.example</code> to{" "}
            <code>.env.local</code>, add your Supabase URL and publishable key,
            then run <code>supabase/schema.sql</code> and create a staff user.
          </div>
        ) : null}

        <div className="mt-6">
          <LoginForm configured={configured} />
        </div>
      </div>
    </div>
  );
}
