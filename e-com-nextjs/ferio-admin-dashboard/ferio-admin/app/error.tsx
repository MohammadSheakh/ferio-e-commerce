"use client";

import { useEffect } from "react";

export default function Error({
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "16px", fontWeight: 500 }}>
        This section could not load.
      </h2>
      <p style={{ fontSize: "14px", color: "#6e6e73" }}>
        Something went wrong on our side. Your data is safe — please try again.
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
    </div>
  );
}
