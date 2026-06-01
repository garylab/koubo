"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  name: string;
  isDefault: boolean;
  updatedAt: string;
};

export function CollectionRow({ id, name, isDefault, updatedAt }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const [busy, setBusy] = useState(false);

  async function rename() {
    const next = val.trim();
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    setBusy(false);
    setEditing(false);
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!confirm(`确定删除稿件集「${name}」及其下所有稿件？`)) return;
    setBusy(true);
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
          />
        ) : (
          <div className="font-medium truncate">
            {name}
            {isDefault && (
              <span className="ml-2 text-xs text-neutral-500">（默认）</span>
            )}
          </div>
        )}
        <div className="text-xs text-neutral-500 mt-0.5">
          更新于 {new Date(updatedAt).toLocaleString("zh-CN")}
        </div>
      </div>
      <div className="flex gap-3 text-xs shrink-0">
        {editing ? (
          <>
            <button
              onClick={rename}
              disabled={busy}
              className="text-neutral-900 dark:text-neutral-100 disabled:opacity-50"
            >
              保存
            </button>
            <button
              onClick={() => {
                setVal(name);
                setEditing(false);
              }}
              className="text-neutral-500"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              重命名
            </button>
            {!isDefault && (
              <button
                onClick={remove}
                disabled={busy}
                className="text-red-600 dark:text-red-400 disabled:opacity-50"
              >
                删除
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}
