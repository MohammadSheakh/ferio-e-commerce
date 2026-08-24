import { platformApi } from "@/lib/platform-session";
import { MigrationActions, StartMigrationForm } from "./migration-forms";

interface RunRow {
  id: string;
  status: string;
  concurrencyLimit: number;
  failureThreshold: number;
  createdAt: string;
  results: Array<{ tenantDatabaseId: string; success: boolean; toVersion: string }>;
}

export default async function MigrationsPage() {
  let runs: RunRow[] = [];
  try {
    runs = await platformApi<RunRow[]>("/platform/migrations");
  } catch {
    /* error boundary */
  }
  return (
    <>
      <p className="eyebrow">Tenant Operations</p>
      <h1 className="h1">Schema Migrations</h1>
      <p className="muted">
        Canary first, then bounded batches. A paused rollout resumes from its recorded results.
      </p>
      <div style={{ height: 20 }} />
      <div className="card">
        <p className="eyebrow">Start a migration run</p>
        <StartMigrationForm />
      </div>
      {runs.map((run) => (
        <div key={run.id} className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <span className="statuspill">{run.status}</span>{" "}
              <strong>batch ≤{run.concurrencyLimit}</strong>{" "}
              <span className="muted">
                · threshold {run.failureThreshold} · {new Date(run.createdAt).toLocaleString()}
              </span>
            </div>
            {(run.status === "CANARY" || run.status === "BATCHING" || run.status === "PAUSED") && (
              <MigrationActions runId={run.id} status={run.status} />
            )}
          </div>
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Tenant DB</th><th>Result</th><th>To version</th></tr></thead>
            <tbody>
              {run.results.map((result, index) => (
                <tr key={`${run.id}-${index}`}>
                  <td className="muted">{result.tenantDatabaseId}</td>
                  <td><span className="statuspill">{result.success ? "SUCCESS" : "FAILED"}</span></td>
                  <td>{result.toVersion}</td>
                </tr>
              ))}
              {run.results.length === 0 && (
                <tr><td colSpan={3} className="muted">No tenants attempted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
