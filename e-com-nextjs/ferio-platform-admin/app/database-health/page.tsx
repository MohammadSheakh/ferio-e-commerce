import { platformApi } from "@/lib/platform-session";

interface DatabaseRow {
  tenantDatabaseId: string;
  organizationName: string;
  organizationStatus: string;
  dbStatus: string;
  schemaVersion: string;
  upToDate: boolean;
}

interface FleetHealth {
  canonicalHead: string | null;
  totalDatabases: number;
  upToDateCount: number;
  databases: DatabaseRow[];
}

export default async function DatabaseHealthPage() {
  let fleet: FleetHealth | null = null;
  try {
    fleet = await platformApi<FleetHealth>("/platform/database-health");
  } catch {
    fleet = null;
  }
  if (!fleet) {
    return (
      <>
        <p className="eyebrow">SaaS Operations</p>
        <h1 className="h1">Fleet health is unavailable.</h1>
        <p className="muted">Retry shortly; no tenant data is affected.</p>
      </>
    );
  }

  const behind = fleet.totalDatabases - fleet.upToDateCount;

  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Database Health</h1>
      <div style={{ height: 16 }} />
      <div className="card" style={{ marginBottom: 0 }}>
        <p className="eyebrow">Fleet schema status</p>
        <div className="stat">
          {fleet.upToDateCount}/{fleet.totalDatabases} up to date
        </div>
        {behind > 0 && (
          <p className="muted">{behind} database(s) behind canonical head — run a migration rollout.</p>
        )}
        <p className="muted">Canonical head: {fleet.canonicalHead ?? "no migrations found"}</p>
      </div>
      <div style={{ height: 24 }} />
      <table>
        <thead>
          <tr>
            <th>Organization</th><th>Org status</th><th>DB status</th>
            <th>Schema version</th><th>Fleet status</th>
          </tr>
        </thead>
        <tbody>
          {fleet.databases.map((db) => (
            <tr key={db.tenantDatabaseId}>
              <td>{db.organizationName}</td>
              <td><span className="statuspill">{db.organizationStatus}</span></td>
              <td><span className="statuspill">{db.dbStatus}</span></td>
              <td className="muted">{db.schemaVersion || "—"}</td>
              <td>
                <span className="statuspill">
                  {db.upToDate ? "UP TO DATE" : "MIGRATION REQUIRED"}
                </span>
              </td>
            </tr>
          ))}
          {fleet.databases.length === 0 && (
            <tr><td colSpan={5} className="muted">No tenant databases registered yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
