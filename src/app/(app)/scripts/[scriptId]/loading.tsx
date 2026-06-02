export default function Loading() {
  return (
    <div className="flex flex-col">
      <div
        className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-3xl mx-auto px-2 h-12" />
      </div>
      <div className="max-w-3xl mx-auto w-full px-4 pt-6">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-16 rounded-full bg-neutral-100 dark:bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
        <div className="pt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
