import { platformApi } from "@/lib/platform-session";

interface DomainRow {
  id: string;
  hostname: string;
  type: string;
  status: string;
  isPrimary: boolean;
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  healthy: boolean;
  issue: string | null;
}

interface DomainHealth {
  totalDomains: number;
  healthyCount: number;
  unhealthyCount: number;
  byStatus: Record<string, number>;
  domains: DomainRow[];
}

export default async function DomainHealthPage() {
  let health: DomainHealth | null = null;
  try {
    health = await platformApi<DomainHealth>("/platform/domain-health");
  } catch {
    health = null;
  }
  if (!health) {
    return (
      <>
        <p className="eyebrow">SaaS Operations</p>
        <h1 className="h1">Domain health is unavailable.</h1>
        <p className="muted">Retry shortly; no tenant data is affected.</p>
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Domain Health</h1>
      <div style={{ height: 16 }} />
      <div className="grid3">
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="eyebrow">Healthy routes</p>
          <div className="stat">{health.healthyCount}/{health.totalDomains}</div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="eyebrow">Needs attention</p>
          <div className="stat">{health.unhealthyCount}</div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <p className="eyebrow">Active records</p>
          <div className="stat">{health.byStatus.ACTIVE ?? 0}</div>
        </div>
      </div>
      <div style={{ height: 24 }} />
      <table>
        <thead>
          <tr>
            <th>Hostname</th><th>Organization</th><th>Type</th>
            <th>Domain status</th><th>Route health</th><th>Issue</th>
          </tr>
        </thead>
        <tbody>
          {health.domains.map((domain) => (
            <tr key={domain.id}>
              <td>{domain.hostname}{domain.isPrimary ? " · primary" : ""}</td>
              <td>{domain.organizationName}</td>
              <td className="muted">{domain.type}</td>
              <td><span className="statuspill">{domain.status}</span></td>
              <td><span className="statuspill">{domain.healthy ? "HEALTHY" : "ATTENTION"}</span></td>
              <td className="muted">{domain.issue ?? "—"}</td>
            </tr>
          ))}
          {health.domains.length === 0 && (
            <tr><td colSpan={6} className="muted">No tenant domains registered yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
