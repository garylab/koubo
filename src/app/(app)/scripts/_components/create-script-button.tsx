import Link from "next/link";

export function CreateScriptButton({
  activeCollectionId,
}: {
  activeCollectionId: string | null;
}) {
  const href = activeCollectionId
    ? `/scripts/new?c=${activeCollectionId}`
    : "/scripts/new";
  return (
    <Link
      href={href}
      className="inline-block rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium"
    >
      新建稿件
    </Link>
  );
}
