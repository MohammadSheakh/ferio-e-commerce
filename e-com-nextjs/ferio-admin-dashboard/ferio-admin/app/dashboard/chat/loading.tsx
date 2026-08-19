export default function ChatDeskLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-paper animate-pulse">
      {/* Topbar Skeleton Replica */}
      <div className="flex flex-col gap-4 border-b border-line px-8 py-5 xl:flex-row xl:items-center xl:justify-between bg-white shrink-0">
        <div>
          <div className="h-6 w-36 rounded bg-slate-300 font-semibold" />
          <div className="mt-1 h-3.5 w-48 rounded bg-slate-200" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <div className="h-3 w-12 rounded bg-emerald-200" />
          </div>
          {["/track", "/cart", "/checkout", "/products", "/"].map((route) => (
            <div
              key={route}
              className="flex items-center gap-1.5 rounded-full bg-[#18181b] px-3 py-1 border border-slate-800 shrink-0"
            >
              <div className="h-3 w-12 rounded bg-slate-700" />
              <div className="h-3 w-10 rounded bg-slate-600" />
            </div>
          ))}
        </div>
      </div>

      {/* Live Chat Split Desktop Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Conversations Sidebar Skeleton (w-80) */}
        <div className="w-80 border-r border-line bg-surface/40 p-4 space-y-4 shrink-0 flex flex-col">
          <div className="h-10 w-full rounded-full border border-line bg-paper" />
          <div className="flex gap-2 border-b border-line pb-2">
            <div className="h-7 w-16 rounded-full bg-[#18181b]" />
            <div className="h-7 w-20 rounded-full border border-line bg-paper" />
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-card bg-paper border border-line items-center shadow-2xs"
              >
                <div className="relative h-10 w-10 rounded-full bg-slate-200 shrink-0 border border-line">
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 rounded bg-slate-300 font-semibold" />
                    <div className="h-3 w-10 rounded bg-slate-200" />
                  </div>
                  <div className="h-3 w-36 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Inbox Area Skeleton */}
        <div className="flex-1 flex flex-col bg-paper">
          {/* Chat Header */}
          <div className="border-b border-line p-4 flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0 border border-line" />
              <div className="space-y-1">
                <div className="h-4 w-36 rounded bg-slate-300 font-semibold" />
                <div className="h-3 w-24 rounded bg-slate-200" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-full border border-line bg-surface" />
              <div className="h-8 w-8 rounded-full border border-line bg-surface" />
            </div>
          </div>

          {/* Chat Message History Thread Skeleton */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-surface/20">
            {/* Left Guest Message Bubble */}
            <div className="flex gap-3 max-w-md items-end">
              <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0 border border-line" />
              <div className="rounded-2xl rounded-bl-xs bg-white border border-line p-4 space-y-2 shadow-xs">
                <div className="h-3.5 w-48 rounded bg-slate-300" />
                <div className="h-3.5 w-32 rounded bg-slate-200" />
                <div className="h-2.5 w-12 rounded bg-slate-200 text-[10px]" />
              </div>
            </div>

            {/* Right Admin Support Message Bubble */}
            <div className="flex gap-3 max-w-md justify-end ml-auto items-end">
              <div className="rounded-2xl rounded-br-xs bg-[#18181b] text-white p-4 space-y-2 shadow-xs">
                <div className="h-3.5 w-56 rounded bg-slate-700" />
                <div className="h-3.5 w-40 rounded bg-slate-700" />
                <div className="h-2.5 w-12 rounded bg-slate-600 ml-auto" />
              </div>
            </div>

            {/* Left Guest Message Bubble */}
            <div className="flex gap-3 max-w-md items-end">
              <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0 border border-line" />
              <div className="rounded-2xl rounded-bl-xs bg-white border border-line p-4 space-y-1.5 shadow-xs">
                <div className="h-3.5 w-40 rounded bg-slate-300" />
              </div>
            </div>
          </div>

          {/* Message Input Bar */}
          <div className="border-t border-line p-4 flex gap-3 bg-white">
            <div className="h-11 flex-1 rounded-full border border-line bg-surface px-4 flex items-center" />
            <div className="h-11 w-28 rounded-full bg-[#18181b]" />
          </div>
        </div>
      </div>
    </div>
  );
}
