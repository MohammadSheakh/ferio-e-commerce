"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AccountAuthShell from "@/components/AccountAuthShell";

const inputClass =
  "mt-2 w-full rounded-card border border-line bg-paper px-4 py-3 text-[14px] text-ink outline-none transition focus:border-ink";

function destination() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/account/orders";
}

export default function VerifyAccountPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get("email") || "");
    const developmentCode = sessionStorage.getItem(
      "ferio_development_verification_code",
    );
    if (developmentCode) {
      setOtp(developmentCode);
      sessionStorage.removeItem("ferio_development_verification_code");
    }
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("working");
    setMessage("");
    const response = await fetch("/api/account/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const payload = await response.json();
    if (response.ok) {
      window.location.assign(destination());
      return;
    }
    setMessage(payload.message || "Verification failed.");
    setStatus("idle");
  }

  async function resend() {
    if (!email) {
      setMessage("Enter the email used during registration.");
      return;
    }
    setStatus("working");
    const response = await fetch("/api/account/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = await response.json();
    setMessage(payload.message || "Unable to resend the code.");
    setStatus(response.ok ? "sent" : "idle");
  }

  return (
    <AccountAuthShell
      eyebrow="Email verification"
      title="One quick confirmation."
      description="The verification code protects your order history and warranty access from being attached to the wrong email account."
    >
      <h2 className="text-[24px] font-semibold tracking-tight text-ink">Verify your email</h2>
      <p className="mt-2 text-[13px] leading-6 text-ink2">Enter the 6-digit code sent after registration. Codes expire after 10 minutes.</p>
      <form onSubmit={verify} className="mt-8 space-y-5">
        <label className="block text-[12px] font-medium text-ink">
          Email address
          <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-[12px] font-medium text-ink">
          Verification code
          <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" className={`${inputClass} tracking-[0.35em]`} />
        </label>
        {message ? (
          <div aria-live="polite" className={`border-y px-4 py-3 text-[12px] leading-5 ${status === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            {message}
          </div>
        ) : null}
        <button disabled={status === "working" || otp.length !== 6} className="w-full rounded-full bg-ink px-6 py-3.5 text-[13px] font-medium text-white disabled:opacity-40">
          {status === "working" ? "Please wait…" : "Verify and continue"}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-[12px] text-ink2">
        <button type="button" onClick={resend} disabled={status === "working"} className="underline underline-offset-4 hover:text-ink disabled:opacity-40">Send a new code</button>
        <Link href="/account/login" className="underline underline-offset-4 hover:text-ink">Back to sign in</Link>
      </div>
    </AccountAuthShell>
  );
}
