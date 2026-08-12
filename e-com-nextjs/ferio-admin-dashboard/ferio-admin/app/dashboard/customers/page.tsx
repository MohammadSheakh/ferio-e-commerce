import Topbar from "@/components/Topbar";
import { customers } from "@/data/mock";

const segmentColor: Record<string, string> = {
  New: "bg-surface text-ink2",
  Repeat: "bg-blue-50 text-blue-700",
  VIP: "bg-emerald-50 text-emerald-700",
  "At risk": "bg-rose-50 text-rose-700",
};

export default function CustomersPage() {
  return (
    <>
      <Topbar title="Customers" subtitle={`${customers.length} in CRM`} />
      <div className="p-8">
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                <th className="px-5 py-3 font-normal">Customer</th>
                <th className="px-5 py-3 font-normal">Phone</th>
                <th className="px-5 py-3 font-normal">Orders</th>
                <th className="px-5 py-3 font-normal">Total spent</th>
                <th className="px-5 py-3 font-normal">Last order</th>
                <th className="px-5 py-3 font-normal">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((c) => (
                <tr key={c.id} className="text-[13px] text-ink/80">
                  <td className="px-5 py-3.5 text-ink">{c.name}</td>
                  <td className="px-5 py-3.5 text-ink2">{c.phone}</td>
                  <td className="px-5 py-3.5">{c.orders}</td>
                  <td className="px-5 py-3.5">৳{c.totalSpent.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-ink2">{c.lastOrder}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${segmentColor[c.segment]}`}>
                      {c.segment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
