import Link from "next/link";

export default function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
        {label}
      </p>
      <p className="mt-3 text-[26px] font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint && <p className="mt-1 text-[12px] text-ink2">{hint}</p>}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-card border border-line p-5 transition hover:border-ink/40"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-card border border-line p-5">{content}</div>
  );
}
