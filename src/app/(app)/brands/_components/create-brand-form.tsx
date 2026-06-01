"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateBrandForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error ?? "创建失败");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        required
        placeholder="品牌名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? "创建中…" : "新建品牌"}
      </button>
      {error && <span className="self-center text-xs text-red-600">{error}</span>}
    </form>
  );
}
