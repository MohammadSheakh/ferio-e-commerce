export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-line p-5">
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">{label}</p>
      <p className="mt-3 text-[26px] font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-ink2">{hint}</p>}
    </div>
  );
}
