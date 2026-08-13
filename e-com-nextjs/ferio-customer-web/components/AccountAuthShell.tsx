import Link from "next/link";

export default function AccountAuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-[680px] max-w-6xl lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.65fr)]">
      <section className="flex flex-col justify-between border-b border-line bg-surface px-6 py-14 sm:px-12 lg:border-b-0 lg:border-r lg:px-16 lg:py-20">
        <div>
          <p className="text-[11px] uppercase tracking-eyebrow text-ink2">{eyebrow}</p>
          <h1 className="mt-4 max-w-lg text-[38px] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[48px]">
            {title}
          </h1>
          <p className="mt-6 max-w-md text-[14px] leading-7 text-ink2">{description}</p>
        </div>
        <div className="mt-14 border-t border-line pt-6 text-[12px] leading-6 text-ink2">
          <p>One account for orders, reviews, and warranty support.</p>
          <Link href="/products" className="mt-2 inline-block underline underline-offset-4 hover:text-ink">
            Continue browsing
          </Link>
        </div>
      </section>
      <section className="flex items-center px-6 py-14 sm:px-12 lg:px-16 lg:py-20">
        <div className="w-full">{children}</div>
      </section>
    </main>
  );
}
