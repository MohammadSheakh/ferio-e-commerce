import { platformApi } from "@/lib/platform-session";
import { FeatureFlagForm } from "./flag-form";

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  note?: string | null;
  updatedAt: string;
}

export default async function FeatureFlagsPage() {
  const flags = await platformApi<FeatureFlag[]>("/platform/feature-flags");
  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Platform Feature Flags</h1>
      <p className="muted">Changes are audited by the control plane and apply only to platform-level gates.</p>
      <FeatureFlagForm />
      <div className="card">
        <table><thead><tr><th>Key</th><th>State</th><th>Note</th><th>Updated</th></tr></thead><tbody>
          {flags.map((flag) => <tr key={flag.id}><td>{flag.key}</td><td><span className="statuspill">{flag.enabled ? "ENABLED" : "DISABLED"}</span></td><td className="muted">{flag.note ?? "—"}</td><td className="muted">{new Date(flag.updatedAt).toISOString().slice(0, 16).replace("T", " ")}</td></tr>)}
          {flags.length === 0 && <tr><td colSpan={4} className="muted">No platform flags configured.</td></tr>}
        </tbody></table>
      </div>
    </>
  );
}
