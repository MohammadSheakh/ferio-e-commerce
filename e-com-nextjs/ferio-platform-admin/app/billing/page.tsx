import { platformApi } from "@/lib/platform-session";

interface InvoiceRow {
  id: string;
  number: string;
  organizationName: string;
  periodStart: string;
  periodEnd: string;
  amountMinor: number;
  currency: string;
  paid: boolean;
  createdAt: string;
}

interface AttemptRow {
  id: string;
  invoiceNumber: string;
  provider: string;
  reference: string;
  status: string;
  amountMinor: number;
  createdAt: string;
}

function money(amountMinor: number, currency = "BDT") {
  const symbol = currency === "BDT" ? "৳" : `${currency} `;
  return `${symbol}${(amountMinor / 100).toFixed(2)}`;
}

function dateOnly(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "—";
}

export default async function BillingPage() {
  let invoices: InvoiceRow[] = [];
  let attempts: AttemptRow[] = [];
  try {
    const [invoiceData, attemptData] = await Promise.all([
      platformApi<{ items: InvoiceRow[] }>("/platform/billing/invoices"),
      platformApi<{ items: AttemptRow[] }>("/platform/billing/payment-attempts"),
    ]);
    invoices = invoiceData.items ?? [];
    attempts = attemptData.items ?? [];
  } catch {
    /* error.tsx handles control-plane outages */
  }

  return (
    <>
      <p className="eyebrow">SaaS Operations</p>
      <h1 className="h1">Billing</h1>
      <div style={{ height: 24 }} />

      <h2 className="eyebrow">Invoices</h2>
      <table>
        <thead>
          <tr>
            <th>Number</th><th>Organization</th><th>Period</th>
            <th>Amount</th><th>Status</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.number}</td>
              <td>{invoice.organizationName}</td>
              <td className="muted">
                {dateOnly(invoice.periodStart)} → {dateOnly(invoice.periodEnd)}
              </td>
              <td>{money(invoice.amountMinor, invoice.currency)}</td>
              <td>
                <span className="statuspill">{invoice.paid ? "PAID" : "OPEN"}</span>
              </td>
              <td className="muted">{dateOnly(invoice.createdAt)}</td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr><td colSpan={6} className="muted">No invoices yet.</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ height: 32 }} />
      <h2 className="eyebrow">Payment attempts</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice</th><th>Provider</th><th>Reference</th>
            <th>Amount</th><th>Status</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => (
            <tr key={attempt.id}>
              <td>{attempt.invoiceNumber}</td>
              <td>{attempt.provider}</td>
              <td className="muted">{attempt.reference}</td>
              <td>{money(attempt.amountMinor)}</td>
              <td><span className="statuspill">{attempt.status}</span></td>
              <td className="muted">{dateOnly(attempt.createdAt)}</td>
            </tr>
          ))}
          {attempts.length === 0 && (
            <tr><td colSpan={6} className="muted">No payment attempts yet.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
