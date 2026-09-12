"use client";

import { FormEvent, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";

export default function SecurityPage() {
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputClass = "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/auth/two-factor", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: { enabled: boolean };
          message?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.message || "Unable to load two-factor settings.");
        }
        setEnabled(payload.data.enabled);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load two-factor settings.",
        );
      }
    }
    void load();
  }, []);

  async function begin() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/two-factor/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { secret: string; uri: string };
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to begin setup.");
      }
      setSecret(payload.data.secret);
      setUri(payload.data.uri);
    } catch (beginError) {
      setError(
        beginError instanceof Error
          ? beginError.message
          : "Unable to begin setup.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/two-factor/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { recoveryCodes: string[] };
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Code was not accepted.");
      }
      setEnabled(true);
      setSecret("");
      setUri("");
      setCode("");
      setRecoveryCodes(payload.data.recoveryCodes);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Code was not accepted.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/two-factor/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.message || "Unable to disable two-factor authentication.",
        );
      }
      setEnabled(false);
      setPassword("");
      setCode("");
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Unable to disable two-factor authentication.",
      );
    } finally {
      setBusy(false);
    }
  }

  return <><Topbar title="Security" subtitle="Protect your Admin account with an authenticator app" /><div className="max-w-3xl space-y-6 p-8">
    <section className="rounded-card border border-line p-6"><div className="flex items-center justify-between"><div><h2 className="text-[16px] font-medium text-ink">Two-factor authentication</h2><p className="mt-1 text-[12px] leading-5 text-ink2">Require a rotating code after your password when signing in.</p></div><span className={`rounded-full px-3 py-1 text-[11px] ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-surface text-ink2"}`}>{enabled ? "Enabled" : "Not enabled"}</span></div>
      {error && <p role="alert" className="mt-5 text-[13px] text-rose-700">{error}</p>}
      {!enabled && !secret && <button onClick={() => void begin()} disabled={busy} className="mt-6 rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-50">Set up authenticator</button>}
      {!enabled && secret && <form onSubmit={confirm} className="mt-6 space-y-4"><div className="rounded-card bg-surface p-4"><p className="text-[11px] uppercase tracking-eyebrow text-ink2">Manual setup key</p><p className="mt-2 break-all font-mono text-[14px] text-ink">{secret}</p><a href={uri} className="mt-3 inline-block text-[12px] underline underline-offset-4">Open authenticator app</a></div><label className="block text-[12px] text-ink2">Six-digit code<input required value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" className={inputClass} /></label><button disabled={busy} className="rounded-full bg-ink px-5 py-2.5 text-[13px] text-white disabled:opacity-50">Verify and enable</button></form>}
      {enabled && <form onSubmit={disable} className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-[12px] text-ink2">Current password<input required type="password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} /></label><label className="text-[12px] text-ink2">Authenticator or recovery code<input required value={code} onChange={event => setCode(event.target.value)} className={inputClass} /></label><button disabled={busy} className="w-fit rounded-full border border-line px-5 py-2.5 text-[13px] text-rose-700 hover:border-rose-300">Disable two-factor</button></form>}
    </section>
    {recoveryCodes.length > 0 && <section className="rounded-card border border-amber-200 bg-amber-50 p-6"><h2 className="text-[15px] font-medium text-ink">Save your recovery codes</h2><p className="mt-1 text-[12px] text-ink2">Each code works once. Store them away from this device; they will not be shown again.</p><div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[13px] text-ink">{recoveryCodes.map(item => <span key={item}>{item}</span>)}</div><button onClick={() => void navigator.clipboard.writeText(recoveryCodes.join("\n"))} className="mt-5 rounded-full border border-line bg-paper px-4 py-2 text-[12px]">Copy codes</button></section>}
  </div></>;
}
