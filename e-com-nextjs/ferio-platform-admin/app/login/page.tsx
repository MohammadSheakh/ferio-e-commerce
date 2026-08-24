"use client";
import { useState, FormEvent } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (response.ok) {
      window.location.assign("/");
      return;
    }
    const data = await response.json().catch(() => ({}));
    setError(data.message || "Platform sign-in failed.");
    setWorking(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={submit} className="card" style={{ width: 360 }}>
        <p className="eyebrow">Ferio Platform</p>
        <h1 className="h1">Operator Sign In</h1>
        <div style={{ height: 20 }} />
        {error && (
          <div style={{ border: "1px solid #f3c1c1", background: "#fdf2f2", color: "#8a1f1f", borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <label htmlFor="email">Operator email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="username" />
        <div style={{ height: 14 }} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required className="input" autoComplete="current-password" />
        <div style={{ height: 20 }} />
        <button className="pill" disabled={working} style={{ width: "100%" }}>
          {working ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
