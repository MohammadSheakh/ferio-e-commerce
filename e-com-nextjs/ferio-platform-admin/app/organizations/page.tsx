import { platformApi } from "@/lib/platform-session";
import { CreateOrganizationForm } from "./create-form";
import { OrgRowActions } from "./org-row-actions";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export default async function OrganizationsPage() {
  let rows: OrgRow[] = [];
  let errorMsg = "";
  try {
    const data = await platformApi<{ items: OrgRow[] }>("/platform/organizations");
    rows = data.items ?? [];
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Unable to load organizations.";
  }

  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Organizations</h1>
      <div style={{ height: 24 }} />
      {errorMsg && (
        <div
          className="card"
          style={{
            background: "#fef2f2",
            borderColor: "#fecaca",
            color: "#991b1b",
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>
            {errorMsg === "Too Many Requests"
              ? "Rate limit reached — please wait a moment and refresh."
              : errorMsg}
          </p>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Created</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((org) => (
            <tr key={org.id}>
              <td>{org.name}</td>
              <td className="muted">{org.slug}</td>
              <td><span className="statuspill">{org.status}</span></td>
              <td className="muted">{new Date(org.createdAt).toISOString().slice(0, 10)}</td>
              <td style={{ textAlign: "right" }}>
                <OrgRowActions organizationId={org.id} status={org.status} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && !errorMsg && (
            <tr><td colSpan={5} className="muted">No organizations yet — create the first below.</td></tr>
          )}
        </tbody>
      </table>
      <div style={{ height: 32 }} />
      <div className="card">
        <p className="eyebrow">Create Organization</p>
        <CreateOrganizationForm />
      </div>
    </>
  );
}
