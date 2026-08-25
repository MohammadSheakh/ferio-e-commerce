"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "18px", fontWeight: 500 }}>
          Ferio is temporarily unavailable.
        </h1>
        <p style={{ fontSize: "14px", color: "#6e6e73" }}>
          An unexpected error occurred. Please try again.
        </p>
        {error.digest ? (
          <p style={{ fontSize: "12px", color: "#6e6e73" }}>
            Reference: {error.digest}
          </p>
        ) : null}
        <button
          onClick={reset}
          style={{
            background: "#111114",
            color: "#ffffff",
            borderRadius: "9999px",
            padding: "8px 20px",
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
