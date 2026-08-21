"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [code, setCode] = useState("");
  const inputClass = "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const payload = await response.json() as { message?: string; requiresTwoFactor?: boolean; challengeToken?: string };
      if (!response.ok) { setError(payload.message || "Sign in failed."); return; }
      if (payload.requiresTwoFactor && payload.challengeToken) { setChallengeToken(payload.challengeToken); return; }
      router.replace("/dashboard"); router.refresh();
    } catch { setError("Unable to reach Ferio. Try again shortly."); }
    finally { setIsPending(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsPending(true);
    try {
      const response = await fetch("/api/auth/two-factor/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeToken, code }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) { setError(payload.message || "Authentication code was not accepted."); return; }
      router.replace("/dashboard"); router.refresh();
    } catch { setError("Unable to reach Ferio. Try again shortly."); }
    finally { setIsPending(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-paper px-6">
    <div className="w-full max-w-sm rounded-card border border-line p-8">
      <p className="text-[19px] font-semibold tracking-tight text-ink">Ferio Admin</p>
      <p className="mt-1.5 text-[13px] leading-5 text-ink2">{challengeToken ? "Enter your authenticator code or one unused recovery code." : "Sign in to manage orders, products and customers."}</p>
      {challengeToken ? <form onSubmit={verify} className="mt-7 space-y-4">
        <label className="block text-[12px] text-ink2">Authentication code<input required autoFocus value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" className={`${inputClass} tracking-[0.18em]`} /></label>
        {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
        <button type="submit" disabled={isPending} className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50">{isPending ? "Verifying…" : "Verify and sign in"}</button>
        <button type="button" onClick={() => { setChallengeToken(""); setCode(""); setError(""); }} className="w-full text-[12px] text-ink2 hover:text-ink">Use a different account</button>
      </form> : <form onSubmit={signIn} className="mt-7 space-y-4">
        <label className="block text-[12px] text-ink2">Email<input required name="email" type="email" autoComplete="email" className={inputClass} /></label>
        <label className="block text-[12px] text-ink2">Password<input required name="password" type="password" autoComplete="current-password" className={inputClass} /></label>
        {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
        <button type="submit" disabled={isPending} className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50">{isPending ? "Signing in…" : "Sign in"}</button>
      </form>}
    </div>
  </main>;
}
