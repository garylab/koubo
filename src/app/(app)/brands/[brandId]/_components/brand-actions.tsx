"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BrandActions({ brandId, name }: { brandId: string; name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);

  async function rename() {
    const next = val.trim();
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    const res = await fetch(`/api/brands/${brandId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    setEditing(false);
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!confirm(`确定删除品牌「${name}」及其所有稿件？`)) return;
    const res = await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
    if (res.ok) router.push("/brands");
  }

  if (editing) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
        />
        <button
          onClick={rename}
          className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-1 text-xs"
        >
          保存
        </button>
        <button
          onClick={() => {
            setVal(name);
            setEditing(false);
          }}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setEditing(true)}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900"
      >
        重命名
      </button>
      <button
        onClick={remove}
        className="rounded-md border border-red-300 text-red-600 dark:border-red-900 px-2 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950"
      >
        删除
      </button>
    </div>
  );
}
