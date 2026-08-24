"use client";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NODE_ENV === "development") console.error(error);
  return (
    <div style={{ padding: "80px 24px", textAlign: "center" }}>
      <h2 style={{ fontWeight: 500 }}>This section could not load.</h2>
      <p style={{ color: "#6e6e73", fontSize: 14 }}>
        Something went wrong on our side — please try again.
      </p>
      <button onClick={reset} className="pill">Try again</button>
    </div>
  );
}
