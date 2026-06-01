import { BackButton } from "./back-button";
import { CreateCollectionForm } from "./create-collection-form";

export function CollectionsHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-3xl mx-auto px-4 min-h-12 flex flex-wrap items-center gap-2 py-1">
        <BackButton />
        <h1 className="font-semibold tracking-tight text-base mr-auto">
          稿件集
        </h1>
        <CreateCollectionForm />
      </div>
    </header>
  );
}
