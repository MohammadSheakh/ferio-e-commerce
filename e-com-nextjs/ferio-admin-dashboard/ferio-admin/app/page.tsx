"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "Sign in failed.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach Ferio. Try again shortly.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm rounded-card border border-line p-8">
        <p className="text-[19px] font-semibold tracking-tight text-ink">Ferio Admin</p>
        <p className="mt-1.5 text-[13px] text-ink2">
          Sign in to manage orders, products and customers.
        </p>
        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-4"
        >
          <div>
            <label className="text-[12px] text-ink2">Email</label>
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="text-[12px] text-ink2">Password</label>
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </div>
          {error && (
            <p role="alert" className="text-[13px] leading-relaxed text-rose-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
