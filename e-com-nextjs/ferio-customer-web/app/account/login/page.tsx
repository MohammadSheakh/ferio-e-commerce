"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AccountAuthShell from "@/components/AccountAuthShell";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const inputClass =
  "mt-2 w-full rounded-card border border-line bg-paper px-4 py-3 text-[14px] text-ink outline-none transition focus:border-ink";

function destination() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/account/orders";
}

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const payload = await response.json();
    if (response.ok) {
      window.location.assign(destination());
      return;
    }
    setMessage(payload.message || "Sign in failed.");
    setSubmitting(false);
  }

  return (
    <AccountAuthShell
      eyebrow="Customer account"
      title="Welcome back."
      description="See verified purchase history, submit product reviews, and keep warranty conversations connected to the right order."
    >
      <h2 className="text-[24px] font-semibold tracking-tight text-ink">Sign in</h2>
      <p className="mt-2 text-[13px] leading-6 text-ink2">
        New to Ferio?{" "}
        <Link href="/account/register" className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>

      <div className="mt-8">
        <GoogleSignInButton />
      </div>
      <div className="my-7 flex items-center gap-4 text-[10px] uppercase tracking-eyebrow text-ink2">
        <span className="h-px flex-1 bg-line" />
        or use email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="space-y-5">
        <label className="block text-[12px] font-medium text-ink">
          Email address
          <input name="email" required type="email" autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-[12px] font-medium text-ink">
          Password
          <input
            name="password"
            required
            type="password"
            minLength={8}
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
        {message ? (
          <div role="alert" className="border-y border-rose-200 bg-rose-50 px-4 py-3 text-[12px] leading-5 text-rose-700">
            {message}
          </div>
        ) : null}
        <button
          disabled={submitting}
          className="w-full rounded-full bg-ink px-6 py-3.5 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-[12px] text-ink2">
        <Link href="/account/verify" className="underline underline-offset-4 hover:text-ink">
          Verify an account
        </Link>
        <Link href="/support" className="underline underline-offset-4 hover:text-ink">
          Need help?
        </Link>
      </div>
    </AccountAuthShell>
  );
}
