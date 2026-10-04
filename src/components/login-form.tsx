"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setError("Add Supabase env vars in .env.local first.");
      return;
    }

    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" method="post">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          enterKeyHint="next"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          enterKeyHint="done"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
