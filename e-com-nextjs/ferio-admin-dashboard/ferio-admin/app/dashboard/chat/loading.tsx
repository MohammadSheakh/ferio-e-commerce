export default function ChatDeskLoading() {
  return (
    <main className="flex h-[calc(100vh-65px)] flex-col bg-paper motion-safe:animate-pulse">
      <div className="shrink-0 border-b border-line bg-white px-8 py-5">
        <div className="h-6 w-36 rounded bg-line" />
        <div className="mt-2 h-3.5 w-48 rounded bg-line" />
      </div>

      <div className="flex flex-1 overflow-hidden p-4 xl:p-8">
        <div className="flex w-full overflow-hidden border-y border-line bg-white">
          <aside className="flex w-80 shrink-0 flex-col border-r border-line bg-surface/40">
            <div className="flex gap-2 overflow-hidden border-b border-line p-3">
              <div className="h-7 w-16 rounded-full bg-ink" />
              <div className="h-7 w-20 rounded-full border border-line bg-white" />
              <div className="h-7 w-20 rounded-full border border-line bg-white" />
            </div>
            <div className="border-b border-line p-3">
              <div className="h-9 w-full rounded-card border border-line bg-white" />
            </div>
            <div className="flex-1 divide-y divide-line overflow-y-auto">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-3.5">
                  <div className="h-10 w-10 shrink-0 rounded-full border border-line bg-white" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-28 rounded bg-line" />
                      <div className="h-3 w-10 rounded bg-line" />
                    </div>
                    <div className="h-3 w-36 rounded bg-line" />
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full border border-line bg-surface" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded bg-line" />
                  <div className="h-3 w-24 rounded bg-line" />
                </div>
              </div>
              <div className="h-8 w-24 rounded-full border border-line bg-surface" />
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto bg-surface/20 p-6">
              <div className="max-w-md space-y-2 rounded-card border border-line bg-white p-4">
                <div className="h-3.5 w-48 rounded bg-line" />
                <div className="h-3.5 w-32 rounded bg-line" />
              </div>
              <div className="ml-auto max-w-md space-y-2 rounded-card bg-ink p-4">
                <div className="h-3.5 w-56 rounded bg-white/30" />
                <div className="h-3.5 w-40 rounded bg-white/30" />
              </div>
              <div className="max-w-md rounded-card border border-line bg-white p-4">
                <div className="h-3.5 w-40 rounded bg-line" />
              </div>
            </div>

            <div className="flex gap-3 border-t border-line bg-white p-4">
              <div className="h-11 flex-1 rounded-full border border-line bg-surface" />
              <div className="h-11 w-28 rounded-full bg-ink" />
            </div>
          </section>

          <aside className="hidden w-64 shrink-0 space-y-4 border-l border-line bg-surface/20 p-6 xl:block">
            <div className="h-3 w-32 rounded bg-line" />
            <div className="h-12 w-12 rounded-full border border-line bg-white" />
            <div className="space-y-2 border-y border-line py-4">
              <div className="h-3 w-full rounded bg-line" />
              <div className="h-3 w-5/6 rounded bg-line" />
              <div className="h-3 w-2/3 rounded bg-line" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
