"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui", padding: 80, textAlign: "center" }}>
      <h2 style={{ fontWeight: 500 }}>Ferio Platform Admin failed to load.</h2>
      <button onClick={reset} style={{ background: "#111114", color: "#fff", border: "none", borderRadius: 9999, padding: "8px 20px" }}>Try again</button>
    </body></html>
  );
}
