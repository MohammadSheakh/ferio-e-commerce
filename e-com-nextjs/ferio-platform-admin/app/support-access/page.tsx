import { platformApi } from "@/lib/platform-session";
import { RevokeButton } from "./revoke-button";

interface GrantRow {
  id: string;
  organizationId: string;
  reason: string;
  expiresAt: string;
}

export default async function SupportAccessPage() {
  let rows: GrantRow[] = [];
  try {
    rows = await platformApi<GrantRow[]>("/platform/support-access");
  } catch {
    /* error boundary */
  }
  return (
    <>
      <p className="eyebrow">Security</p>
      <h1 className="h1">Active Support Grants</h1>
      <p className="muted">
        Every grant is reason-bound and time-bound. Operators have zero tenant-data access without one.
      </p>
      <div style={{ height: 20 }} />
      <table>
        <thead><tr><th>Organization</th><th>Reason</th><th>Expires</th><th /></tr></thead>
        <tbody>
          {rows.map((grant) => (
            <tr key={grant.id}>
              <td className="muted">{grant.organizationId}</td>
              <td>{grant.reason}</td>
              <td>{new Date(grant.expiresAt).toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>
                <RevokeButton grantId={grant.id} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="muted">No active grants.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
