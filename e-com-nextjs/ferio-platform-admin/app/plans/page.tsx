import { platformApi } from "@/lib/platform-session";
import { CreatePlanForm } from "./create-form";
import { PlanEditor, type EditablePlan } from "./plan-editor";

export default async function PlansPage() {
  let rows: EditablePlan[] = [];
  try {
    rows = await platformApi<EditablePlan[]>("/platform/plans");
  } catch {
    /* handled by error boundary */
  }
  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Plans</h1>
      <div style={{ height: 24 }} />
      {rows.length > 0 ? rows.map((plan) => <PlanEditor key={plan.id} plan={plan} />) : (
        <div className="empty-state">No plans yet. Create the first plan below.</div>
      )}
      <div style={{ height: 32 }} />
      <div className="card">
        <p className="eyebrow">Create Plan</p>
        <CreatePlanForm />
      </div>
    </>
  );
}
