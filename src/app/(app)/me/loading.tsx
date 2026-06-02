export default function Loading() {
  return (
    <>
      <div
        className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-3xl mx-auto px-4 h-12" />
      </div>
      <div className="max-w-3xl mx-auto px-4 pt-3 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-5 w-full rounded bg-neutral-100 dark:bg-neutral-900 animate-pulse"
          />
        ))}
      </div>
    </>
  );
}
