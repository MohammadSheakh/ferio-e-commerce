import Link from "next/link";
import { platformApi } from "@/lib/platform-session";

interface DatabaseRow {
  tenantDatabaseId: string;
  organizationId?: string;
  organizationName: string;
  organizationStatus: string;
  dbStatus: string;
  schemaVersion: string;
  upToDate: boolean;
  diskSizeBytes?: string | null;
  diskSizeRecordedAt?: string | null;
}

function formatBytes(bytesStr?: string | null): string {
  if (!bytesStr) return "—";
  const bytes = Number(bytesStr);
  if (Number.isNaN(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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
            <th>Schema version</th><th>Fleet status</th><th>Disk Storage</th>
          </tr>
        </thead>
        <tbody>
          {fleet.databases.map((db) => (
            <tr key={db.tenantDatabaseId}>
              <td>
                {db.organizationId ? (
                  <Link
                    href={`/organizations/${db.organizationId}`}
                    style={{ textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    {db.organizationName}
                  </Link>
                ) : (
                  db.organizationName
                )}
              </td>
              <td><span className="statuspill">{db.organizationStatus}</span></td>
              <td><span className="statuspill">{db.dbStatus}</span></td>
              <td className="muted">{db.schemaVersion || "—"}</td>
              <td>
                <span className="statuspill">
                  {db.upToDate ? "UP TO DATE" : "MIGRATION REQUIRED"}
                </span>
              </td>
              <td>
                {db.diskSizeBytes ? (
                  <span>
                    <strong>{formatBytes(db.diskSizeBytes)}</strong>{" "}
                    {db.diskSizeRecordedAt && (
                      <span className="muted" style={{ fontSize: 11 }}>
                        ({new Date(db.diskSizeRecordedAt).toLocaleDateString()})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="muted">unmeasured</span>
                )}
              </td>
            </tr>
          ))}
          {fleet.databases.length === 0 && (
            <tr><td colSpan={6} className="muted">No tenant databases registered yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
