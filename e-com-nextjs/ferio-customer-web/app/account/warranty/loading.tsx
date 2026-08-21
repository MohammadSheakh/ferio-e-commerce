export default function WarrantyLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 motion-safe:animate-pulse sm:px-6 sm:py-14">
      <div className="h-3 w-44 rounded bg-line" />
      <div className="mt-7 h-3 w-32 rounded bg-line" />
      <div className="mt-2 h-8 w-56 rounded bg-line" />
      <div className="mt-3 h-3 w-full max-w-2xl rounded bg-line" />
      <div className="mt-2 h-3 w-4/5 max-w-xl rounded bg-line" />

      <section className="mt-10 border-y border-line py-7">
        <div className="h-5 w-48 rounded bg-line" />
        <div className="mt-2 h-3 w-80 rounded bg-line" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="h-12 rounded-card border border-line" />
          <div className="h-12 rounded-card border border-line" />
          <div className="h-10 w-44 rounded-full bg-line sm:col-span-2" />
        </div>
      </section>

      <section className="mt-12">
        <div className="h-5 w-32 rounded bg-line" />
        <div className="mt-4 divide-y divide-line border-y border-line">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="py-6">
              <div className="flex justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-64 rounded bg-line" />
                  <div className="h-3 w-48 rounded bg-line" />
                </div>
                <div className="h-6 w-24 rounded-full bg-line" />
              </div>
              <div className="mt-4 h-3 w-full rounded bg-line" />
              <div className="mt-2 h-3 w-3/4 rounded bg-line" />
              <div className="mt-5 h-24 rounded-card border border-line" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
