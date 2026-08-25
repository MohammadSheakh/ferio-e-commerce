import { platformApi } from "@/lib/platform-session";
import { OrgActions } from "./org-actions";
import { UsageCard, type UsageMetricRow } from "./usage-card";

// TODO(brutal-audit #8 follow-up): replace with contract-derived type once
// this endpoint declares an @ApiOkResponse schema.
type UsageResponse = { organizationId: string; periodKey: string; metrics: UsageMetricRow[] };

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  domains: Array<{ id: string; hostname: string; type: string; status: string; isPrimary: boolean }>;
  databases: Array<{ id: string; status: string; schemaVersion?: string; databaseName: string; lastHealthy?: boolean | null }>;
  subscription?: { status: string; plan: { displayName: string; key: string } } | null;
  members: Array<{ id: string; email: string; role: string; isActive: boolean }>;
}

interface ProvisioningRun {
  id: string;
  status: string;
  createdAt: string;
  steps: Array<{ id: string; name: string; status: string }>;
}

export default async function OrganizationDetail({ params }: { params: { id: string } }) {
  let org: OrgDetail;
  let runs: ProvisioningRun[];
  let usage: { organizationId: string; periodKey: string; metrics: UsageMetricRow[] };
  try {
    [org, runs, usage] = await Promise.all([
      platformApi<OrgDetail>(`/platform/organizations/${params.id}`),
      platformApi<ProvisioningRun[]>(`/platform/organizations/${params.id}/provisioning-runs`),
      platformApi<UsageResponse>(
        `/platform/organizations/${params.id}/usage`,
      ),
    ]);
  } catch (error) {
    return (
      <>
        <p className="eyebrow">Organization</p>
        <h1 className="h1">Unavailable.</h1>
        <p className="muted">{(error as Error).message}</p>
      </>
    );
  }
  const db = org.databases?.[0];
  return (
    <>
      <p className="eyebrow">Organization</p>
      <h1 className="h1">{org.name}</h1>
      <p className="muted">{org.slug} · <span className="statuspill">{org.status}</span></p>
      <div style={{ height: 20 }} />
      <OrgActions organizationId={org.id} status={org.status} />

      <div style={{ height: 28 }} />
      <UsageCard
        organizationId={org.id}
        periodKey={usage.periodKey}
        metrics={usage.metrics ?? []}
      />

      <div style={{ height: 28 }} />
      <div className="card">
        <p className="eyebrow">Subscription</p>
        {org.subscription ? (
          <p>
            Plan <strong>{org.subscription.plan.displayName}</strong> ({org.subscription.plan.key}) ·{" "}
            <span className="statuspill">{org.subscription.status}</span>
          </p>
        ) : (
          <p className="muted">No subscription yet.</p>
        )}
      </div>

      <div className="card">
        <p className="eyebrow">Domains</p>
        <table>
          <thead><tr><th>Hostname</th><th>Type</th><th>Status</th><th>Primary</th></tr></thead>
          <tbody>
            {(org.domains ?? []).map((d) => (
              <tr key={d.id}>
                <td>{d.hostname}</td><td>{d.type}</td>
                <td><span className="statuspill">{d.status}</span></td>
                <td>{d.isPrimary ? "yes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <p className="eyebrow">Tenant Database</p>
        {db ? (
          <p>
            {db.databaseName} · <span className="statuspill">{db.status}</span>{" "}
            {db.schemaVersion ? <>· schema {db.schemaVersion}</> : null}
            {db.lastHealthy === false ? " · ⚠ last health check failed" : ""}
          </p>
        ) : (
          <p className="muted">Not provisioned yet — run provisioning.</p>
        )}
      </div>

      <div className="card">
        <p className="eyebrow">Members (platform metadata)</p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(org.members ?? []).map((m) => (
            <li key={m.id}>
              {m.email} · {m.role}
              {!m.isActive && " (inactive)"}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <p className="eyebrow">Provisioning timeline</p>
        {runs.length === 0 && <p className="muted">No provisioning runs yet.</p>}
        {runs.map((run) => (
          <div key={run.id} style={{ marginBottom: 16 }}>
            <p style={{ margin: 0 }}>
              <strong>{run.status}</strong>{" "}
              <span className="muted">{new Date(run.createdAt).toLocaleString()}</span>
            </p>
            <ol style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
              {run.steps.map((step) => (
                <li key={step.id}>
                  {step.name}: {step.status}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </>
  );
}
