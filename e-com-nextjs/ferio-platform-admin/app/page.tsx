import { platformApi } from "@/lib/platform-session";

interface Dashboard {
  organizations: Record<string, number>;
  subscriptions: Record<string, number>;
  tenantDatabases: Record<string, number>;
  provisioningFailures: number;
  activeSupportGrants: number;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <p className="eyebrow">{label}</p>
      <div className="stat">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  let data: Dashboard | null = null;
  try {
    data = await platformApi<Dashboard>("/platform/dashboard");
  } catch {
    data = null;
  }
  if (!data) {
    return (
      <>
        <p className="eyebrow">Dashboard</p>
        <h1 className="h1">Control plane is unreachable.</h1>
        <p className="muted">Retry shortly; no tenant data is affected.</p>
      </>
    );
  }
  const orgs = data.organizations ?? {};
  const totalOrgs = Object.values(orgs).reduce((a, b) => a + b, 0);
  const activeSubs = data.subscriptions?.ACTIVE ?? 0;
  const dbsReady = data.tenantDatabases?.READY ?? 0;

  return (
    <>
      <p className="eyebrow">Platform Dashboard</p>
      <h1 className="h1">Fleet Overview</h1>
      <div style={{ height: 24 }} />
      <div className="grid3">
        <Stat label="Organizations" value={totalOrgs} />
        <Stat label="Active subscriptions" value={activeSubs} />
        <Stat label="Tenant DBs ready" value={dbsReady} />
      </div>
      <div style={{ height: 20 }} />
      <div className="grid3">
        <Stat label="Provisioning failures" value={data.provisioningFailures} />
        <Stat label="Active support grants" value={data.activeSupportGrants} />
        <Stat label="Suspended orgs" value={orgs.SUSPENDED ?? 0} />
      </div>
    </>
  );
}
