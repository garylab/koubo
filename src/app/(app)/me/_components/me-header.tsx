export function MeHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center">
        <h1 className="font-semibold tracking-tight text-base">我的</h1>
      </div>
    </header>
  );
}
