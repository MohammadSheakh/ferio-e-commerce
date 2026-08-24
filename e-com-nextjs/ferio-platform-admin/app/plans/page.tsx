import { platformApi } from "@/lib/platform-session";
import { CreatePlanForm } from "./create-form";

interface PlanRow {
  id: string;
  key: string;
  displayName: string;
  billingInterval: string;
  amountMinor: number;
  entitlements: Array<{ featureKey: string; enabled: boolean; limit?: number | null }>;
}

export default async function PlansPage() {
  let rows: PlanRow[] = [];
  try {
    rows = await platformApi<PlanRow[]>("/platform/plans");
  } catch {
    /* handled by error boundary */
  }
  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Plans</h1>
      <div style={{ height: 24 }} />
      <table>
        <thead>
          <tr><th>Key</th><th>Name</th><th>Billing</th><th>Amount (minor)</th><th>Entitlements</th></tr>
        </thead>
        <tbody>
          {rows.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.key}</td>
              <td>{plan.displayName}</td>
              <td>{plan.billingInterval}</td>
              <td>{plan.amountMinor}</td>
              <td className="muted">
                {plan.entitlements
                  .map((e) => `${e.featureKey}${e.limit != null ? `≤${e.limit}` : ""}`)
                  .join(", ") || "—"}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="muted">No plans yet — define the catalog below.</td></tr>
          )}
        </tbody>
      </table>
      <div style={{ height: 32 }} />
      <div className="card">
        <p className="eyebrow">Create Plan</p>
        <CreatePlanForm />
      </div>
    </>
  );
}
