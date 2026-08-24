import Link from "next/link";
import { platformApi } from "@/lib/platform-session";
import { CreateOrganizationForm } from "./create-form";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export default async function OrganizationsPage() {
  let rows: OrgRow[] = [];
  try {
    const data = await platformApi<{ items: OrgRow[] }>("/platform/organizations");
    rows = data.items ?? [];
  } catch {
    /* error.tsx handles */
  }
  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Organizations</h1>
      <div style={{ height: 24 }} />
      <table>
        <thead>
          <tr><th>Name</th><th>Slug</th><th>Status</th><th>Created</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((org) => (
            <tr key={org.id}>
              <td>{org.name}</td>
              <td className="muted">{org.slug}</td>
              <td><span className="statuspill">{org.status}</span></td>
              <td className="muted">{new Date(org.createdAt).toISOString().slice(0, 10)}</td>
              <td style={{ textAlign: "right" }}>
                <Link href={`/organizations/${org.id}`} style={{ textDecoration: "underline" }}>
                  Manage
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
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
