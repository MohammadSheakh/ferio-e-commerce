"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AccountAuthShell from "@/components/AccountAuthShell";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const inputClass =
  "mt-2 w-full rounded-card border border-line bg-paper px-4 py-3 text-[14px] text-ink outline-none transition focus:border-ink";

export default function RegisterPage() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setMessage("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const response = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phoneNumber: form.get("phoneNumber") || undefined,
        password: form.get("password"),
      }),
    });
    const payload = await response.json();
    if (response.ok) {
      const next = new URLSearchParams(window.location.search).get("next");
      const query = new URLSearchParams({ email: payload.data.email });
      if (next?.startsWith("/") && !next.startsWith("//")) query.set("next", next);
      window.location.assign(`/account/verify?${query}`);
      return;
    }
    setMessage(payload.message || "Account creation failed.");
    setSubmitting(false);
  }

  return (
    <AccountAuthShell
      eyebrow="Create account"
      title="Keep every purchase connected."
      description="Registration is optional for checkout. Create an account when you want one secure place for order history, reviews, and warranty claims."
    >
      <h2 className="text-[24px] font-semibold tracking-tight text-ink">Create account</h2>
      <p className="mt-2 text-[13px] leading-6 text-ink2">
        Already registered?{" "}
        <Link href="/account/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>

      <div className="mt-8"><GoogleSignInButton /></div>
      <div className="my-7 flex items-center gap-4 text-[10px] uppercase tracking-eyebrow text-ink2">
        <span className="h-px flex-1 bg-line" />or register with email<span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <label className="block text-[12px] font-medium text-ink sm:col-span-2">
          Full name
          <input name="name" required autoComplete="name" className={inputClass} />
        </label>
        <label className="block text-[12px] font-medium text-ink sm:col-span-2">
          Email address
          <input name="email" required type="email" autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-[12px] font-medium text-ink sm:col-span-2">
          Phone number <span className="font-normal text-ink2">· optional</span>
          <input name="phoneNumber" type="tel" autoComplete="tel" className={inputClass} />
        </label>
        <label className="block text-[12px] font-medium text-ink">
          Password
          <input name="password" required type="password" minLength={8} autoComplete="new-password" className={inputClass} />
        </label>
        <label className="block text-[12px] font-medium text-ink">
          Confirm password
          <input name="confirmPassword" required type="password" minLength={8} autoComplete="new-password" className={inputClass} />
        </label>
        <p className="text-[11px] leading-5 text-ink2 sm:col-span-2">
          Use at least 8 characters. We will email a 6-digit code before the account can sign in.
        </p>
        {message ? (
          <div role="alert" className="border-y border-rose-200 bg-rose-50 px-4 py-3 text-[12px] leading-5 text-rose-700 sm:col-span-2">
            {message}
          </div>
        ) : null}
        <button disabled={submitting} className="rounded-full bg-ink px-6 py-3.5 text-[13px] font-medium text-white disabled:opacity-40 sm:col-span-2">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AccountAuthShell>
  );
}
