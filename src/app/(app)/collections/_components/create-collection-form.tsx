"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCollectionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setErr(j?.error ?? "创建失败");
      return;
    }
    setName("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 py-3 text-sm"
      >
        + 新建稿件集
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 flex items-center gap-2"
    >
      <input
        autoFocus
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="稿件集名称"
        className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "…" : "创建"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        className="text-xs text-neutral-500 px-2"
      >
        取消
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </form>
  );
}
