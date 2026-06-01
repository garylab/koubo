"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Collection = { id: string; name: string };

export function CollectionChips({ collections }: { collections: Collection[] }) {
  const params = useSearchParams();
  const active = params.get("c") ?? null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 py-1">
      <Chip href="/scripts" label="全部" active={active === null} />
      {collections.map((c) => (
        <Chip
          key={c.id}
          href={`/scripts?c=${c.id}`}
          label={c.name}
          active={active === c.id}
        />
      ))}
    </div>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "shrink-0 rounded-full px-3 py-1 text-sm whitespace-nowrap border transition-colors " +
        (active
          ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100"
          : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900")
      }
    >
      {label}
    </Link>
  );
}
