"use client";
import { useState, FormEvent } from "react";
import {
  readJsonRecord,
  responseDataString,
  responseMessage,
} from "@/lib/client-response";

export function StartMigrationForm() {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/platform/migrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canaryOrganizationId: String(form.get("canary") || "") || undefined,
          concurrencyLimit: Number(form.get("concurrency") || 2),
          failureThreshold: Number(form.get("threshold") || 3),
        }),
      });
      const data = await readJsonRecord(res);
      if (res.ok) {
        setMessage(`Run ${responseDataString(data, "runId")} queued.`);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMessage(responseMessage(data, "Failed to start."));
      }
    } catch {
      setMessage("Failed to start: control plane unavailable.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid3">
        <div>
          <label htmlFor="canary">Canary organization ID (optional)</label>
          <input id="canary" name="canary" className="input" placeholder="first tenant in queue if empty" />
        </div>
        <div>
          <label htmlFor="concurrency">Batch size</label>
          <input id="concurrency" name="concurrency" type="number" min={1} max={10} defaultValue={2} className="input" />
        </div>
        <div>
          <label htmlFor="threshold">Failure threshold (pause)</label>
          <input id="threshold" name="threshold" type="number" min={1} max={25} defaultValue={3} className="input" />
        </div>
      </div>
      <div style={{ height: 16 }} />
      <button className="pill" disabled={working}>{working ? "Queueing…" : "Start migration run"}</button>
      {message && <span style={{ marginLeft: 12, fontSize: 13, color: "#6e6e73" }}>{message}</span>}
    </form>
  );
}

export function MigrationActions({ runId, status }: { runId: string; status: string }) {
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function call(action: string) {
    setWorking(action);
    setMessage("");
    try {
      const response = await fetch(`/api/platform/migrations/${runId}/${action.toLowerCase()}`, { method: "POST" });
      if (!response.ok) {
        const data = await readJsonRecord(response);
        throw new Error(responseMessage(data, `${action} failed.`));
      }
      window.location.reload();
    } catch (error) {
      setWorking(null);
      setMessage(error instanceof Error ? error.message : `${action} failed.`);
    }
  }
  return (
    <div className="row">
      {status !== "PAUSED" && (
        <button className="pill" style={{ background: "#fff", color: "#111114", border: "1px solid #e8e8ea" }}
          disabled={working !== null} onClick={() => call("pause")}>Pause</button>
      )}
      {status === "PAUSED" && (
        <button className="pill" disabled={working !== null} onClick={() => call("resume")}>
          {working === "resume" ? "Resuming…" : "Resume rollout"}
        </button>
      )}
      {message && <span style={{ fontSize: 13, color: "#b42318" }}>{message}</span>}
    </div>
  );
}
