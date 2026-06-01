"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const dirty = name.trim() !== savedName && name.trim().length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setMsg(null);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message ?? "更新失败" });
      return;
    }
    setSavedName(name.trim());
    setMsg({ kind: "ok", text: "已保存" });
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
    >
      <div>
        <label className="text-xs text-neutral-500">昵称</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-neutral-500">邮箱</label>
        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {email}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        {msg ? (
          <span
            className={
              "text-xs " +
              (msg.kind === "ok" ? "text-emerald-600" : "text-red-600")
            }
          >
            {msg.text}
          </span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={!dirty || busy}
          className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {busy ? "保存中…" : "保存"}
        </button>
      </div>
    </form>
  );
}
