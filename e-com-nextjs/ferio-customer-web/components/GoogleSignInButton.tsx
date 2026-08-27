"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            callback(response: { credential?: string }): void;
          }): void;
          renderButton(
            element: HTMLElement,
            options: Record<string, string | number>,
          ): void;
        };
      };
    };
  }
}

function destination() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/account/orders";
}

export default function GoogleSignInButton() {
  const container = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initialize = useCallback(() => {
    if (!clientId || !window.google || !container.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        if (!credential) {
          setMessage("Google sign-in was cancelled.");
          return;
        }
        setMessage("Signing you in…");
        const response = await fetch("/api/account/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: credential }),
        });
        const payload = await response.json();
        if (response.ok) {
          window.location.assign(destination());
          return;
        }
        setMessage(payload.message || "Google sign-in failed.");
      },
    });
    container.current.replaceChildren();
    window.google.accounts.id.renderButton(container.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: Math.min(container.current.clientWidth || 360, 400),
    });
  }, [clientId]);

  if (!clientId) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="w-full rounded-full border border-line px-5 py-3 text-[13px] text-ink2 disabled:cursor-not-allowed"
        >
          Google sign-in unavailable
        </button>
        <p className="mt-2 text-[11px] leading-5 text-ink2">
          Google sign-in will be available after account configuration.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initialize}
        onReady={initialize}
      />
      <div ref={container} className="min-h-10 w-full" />
      {message ? (
        <p aria-live="polite" className="mt-3 text-[12px] text-ink2">
          {message}
        </p>
      ) : null}
    </div>
  );
}
