"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Collection = {
  id: string;
  name: string;
  isDefault: boolean;
};

export function CollectionTabs({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("c") ?? null;

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function createCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) return;
    const created = (await res.json()) as { id: string };
    setName("");
    setCreating(false);
    router.push(`/scripts?c=${created.id}`);
    router.refresh();
  }

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
        <Tab href="/scripts" label="全部" active={active === null} />
        {collections.map((c) => (
          <Tab
            key={c.id}
            href={`/scripts?c=${c.id}`}
            label={c.name}
            active={active === c.id}
          />
        ))}
        {creating ? (
          <form onSubmit={createCollection} className="flex items-center gap-1 ml-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名称"
              className="rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm w-28"
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="text-xs rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-1 disabled:opacity-50"
            >
              {busy ? "…" : "建"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setName("");
              }}
              className="text-xs text-neutral-500 px-1"
            >
              ×
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="ml-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 px-2 py-2"
          >
            + 新建集
          </button>
        )}
        <div className="flex-1" />
        <Link
          href="/collections"
          className="text-xs text-neutral-500 hover:underline px-2 py-2 whitespace-nowrap"
        >
          管理
        </Link>
      </div>
    </div>
  );
}

function Tab({
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
        "px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors " +
        (active
          ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-medium"
          : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100")
      }
    >
      {label}
    </Link>
  );
}
