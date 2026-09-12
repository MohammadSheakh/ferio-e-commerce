import { platformApi } from "@/lib/platform-session";

interface QueueHealth {
  name: string;
  available: boolean;
  counts: Record<string, number> | null;
}

interface SystemHealth {
  generatedAt: string;
  runtimeStatus: string;
  database: { available: boolean; latencyMs: number | null; pool?: Record<string, number> };
  queues: QueueHealth[];
  tenantDatabases: Record<string, number>;
  backup: { status: string; restoreStatus: string; protectedStorage: boolean; lastSuccessAt: string | null; lastRestoreVerifiedAt: string | null };
  centralBackup: { status?: string; restoreStatus?: string } | null;
  support: { activeGrants: number };
  alerts: string[];
}

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default async function SystemHealthPage() {
  let health: SystemHealth | null = null;
  try {
    health = await platformApi<SystemHealth>("/platform/system-health");
  } catch {
    health = null;
  }
  if (!health) {
    return (
      <>
        <p className="eyebrow">SaaS Operations</p>
        <h1 className="h1">System health is unavailable.</h1>
        <p className="muted">Retry shortly; no tenant data is affected.</p>
      </>
    );
  }
  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">System Health <span className="statuspill">{health.runtimeStatus}</span></h1>
      <p className="muted">Observed {dateTime(health.generatedAt)}</p>
      <div className="grid3">
        <div className="card"><p className="eyebrow">Control-plane DB</p><div className="stat">{health.database.available ? "AVAILABLE" : "DOWN"}</div><p className="muted">{health.database.latencyMs ?? "—"} ms probe</p></div>
        <div className="card"><p className="eyebrow">Active support grants</p><div className="stat">{health.support.activeGrants}</div></div>
        <div className="card"><p className="eyebrow">Tenant databases</p><div className="stat">{Object.values(health.tenantDatabases).reduce((total, count) => total + count, 0)}</div></div>
      </div>
      <div className="card">
        <p className="eyebrow">Queue probes</p>
        <table><thead><tr><th>Queue</th><th>Availability</th><th>Waiting</th><th>Active</th><th>Failed</th></tr></thead><tbody>
          {health.queues.map((queue) => <tr key={queue.name}><td>{queue.name}</td><td><span className="statuspill">{queue.available ? "AVAILABLE" : "UNAVAILABLE"}</span></td><td>{queue.counts?.waiting ?? "—"}</td><td>{queue.counts?.active ?? "—"}</td><td>{queue.counts?.failed ?? "—"}</td></tr>)}
        </tbody></table>
      </div>
      <div className="card">
        <p className="eyebrow">Backup posture</p>
        <p>Database backup: <strong>{health.backup.status}</strong> · restore: <strong>{health.backup.restoreStatus}</strong> · protected storage: <strong>{health.backup.protectedStorage ? "yes" : "no"}</strong></p>
        <p className="muted">Last backup: {dateTime(health.backup.lastSuccessAt)} · last restore verification: {dateTime(health.backup.lastRestoreVerifiedAt)}</p>
        {health.centralBackup && <p className="muted">Central ledger: {health.centralBackup.status ?? "unknown"} · restore {health.centralBackup.restoreStatus ?? "unknown"}</p>}
      </div>
      <div className="card">
        <p className="eyebrow">Alerts</p>
        {health.alerts.length === 0 ? <p className="muted">No active alerts.</p> : <ul>{health.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul>}
      </div>
    </>
  );
}
