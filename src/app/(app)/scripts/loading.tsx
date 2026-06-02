export default function Loading() {
  return (
    <>
      <div
        className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-3xl mx-auto px-4 h-12" />
      </div>
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-3">
        <div className="h-8 w-full rounded-md bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
        <ul className="-mx-4 divide-y divide-neutral-200 dark:divide-neutral-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="px-4 py-3">
              <div className="h-4 w-3/5 rounded bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
              <div className="h-3 w-2/5 mt-2 rounded bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
