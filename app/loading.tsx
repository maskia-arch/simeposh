export default function Loading() {
  return (
    <div
      className="w-full flex-1 min-h-[calc(100svh-5.25rem)] py-8 px-4 bg-slate-50/50 flex flex-col items-center justify-start"
      aria-busy="true"
      aria-label="Laden..."
    >
      <span className="sr-only">Laden…</span>
      <div className="w-full max-w-6xl space-y-8 motion-safe:animate-pulse">
        {/* Top banner placeholder */}
        <div className="h-40 w-full rounded-3xl bg-slate-200/80 shadow-xs" />

        {/* Content grid placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="h-4 w-32 rounded bg-slate-200" />
                </div>
                <div className="h-4 w-48 rounded bg-slate-100" />
                <div className="h-4 w-24 rounded bg-slate-100" />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="h-6 w-20 rounded bg-slate-200" />
                <div className="h-9 w-28 rounded-xl bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
