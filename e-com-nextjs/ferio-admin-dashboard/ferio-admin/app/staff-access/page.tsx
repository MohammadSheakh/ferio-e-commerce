"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Purpose = "invite" | "reset";

export default function StaffAccessPage() {
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loadingLink, setLoadingLink] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const nextPurpose = fragment.get("purpose");
    const nextToken = fragment.get("token");
    if (
      (nextPurpose === "invite" || nextPurpose === "reset") &&
      nextToken
    ) {
      setPurpose(nextPurpose);
      setToken(nextToken);
    }
    setLoadingLink(false);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!purpose || !token) {
      setError("This staff access link is incomplete or invalid.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/staff-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, token, password }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          payload.message || "Unable to complete staff access.",
        );
      }
      window.history.replaceState(null, "", window.location.pathname);
      setToken("");
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to complete staff access.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <section className="w-full max-w-md rounded-card border border-line p-8">
        <p className="text-[19px] font-semibold tracking-tight text-ink">
          Ferio Admin
        </p>

        {complete ? (
          <div className="mt-7">
            <h1 className="text-[18px] font-medium text-ink">Access ready</h1>
            <p className="mt-2 text-[13px] leading-6 text-ink2">
              Your password has been saved. Sign in with your staff email to
              continue.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white"
            >
              Continue to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-7 text-[18px] font-medium text-ink">
              {purpose === "reset" ? "Reset staff access" : "Set up staff access"}
            </h1>
            <p className="mt-2 text-[13px] leading-6 text-ink2">
              Create a private password for your Ferio staff account. This link
              can be used once.
            </p>

            {!loadingLink && (!purpose || !token) ? (
              <div className="mt-6">
                <p role="alert" className="text-[13px] text-rose-700">
                  This staff access link is incomplete or invalid.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex rounded-full border border-line px-5 py-2.5 text-[13px] text-ink"
                >
                  Return to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block text-[12px] text-ink2">
                  Password
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block text-[12px] text-ink2">
                  Confirm password
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className={inputClass}
                  />
                </label>
                {error && (
                  <p role="alert" className="text-[13px] text-rose-700">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting || loadingLink}
                  className="w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Save password"}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
