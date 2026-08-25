import { platformApi } from "@/lib/platform-session";

interface SubscriptionRow {
  id: string;
  organizationName: string;
  organizationSlug: string;
  planKey: string;
  planName: string;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
}

export default async function SubscriptionsPage() {
  let rows: SubscriptionRow[] = [];
  try {
    const data = await platformApi<{ items: SubscriptionRow[] }>(
      "/platform/subscriptions",
    );
    rows = data.items ?? [];
  } catch {
    /* error.tsx handles */
  }
  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Subscriptions</h1>
      <div style={{ height: 24 }} />
      <table>
        <thead>
          <tr>
            <th>Organization</th><th>Plan</th><th>Status</th>
            <th>Renews / Ends</th><th>Cancel at period end</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.organizationName}
                <span className="muted" style={{ marginLeft: 8 }}>/{row.organizationSlug}</span>
              </td>
              <td>{row.planName} <span className="muted">({row.planKey})</span></td>
              <td><span className="statuspill">{row.status}</span></td>
              <td className="muted">
                {row.currentPeriodEnd
                  ? new Date(row.currentPeriodEnd).toISOString().slice(0, 10)
                  : "—"}
              </td>
              <td>{row.cancelAtPeriodEnd ? "Yes" : "No"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="muted">No subscriptions yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
