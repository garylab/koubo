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
    <form onSubmit={onSubmit} className="py-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500 w-14 shrink-0">昵称</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none border-b border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 py-1"
        />
        {dirty && (
          <button
            type="submit"
            disabled={busy}
            className="text-sm text-neutral-900 dark:text-neutral-100 disabled:opacity-50"
          >
            {busy ? "…" : "保存"}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500 w-14 shrink-0">邮箱</span>
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {email}
        </span>
      </div>
      {msg && (
        <div
          className={
            "text-xs " +
            (msg.kind === "ok" ? "text-emerald-600" : "text-red-600")
          }
        >
          {msg.text}
        </div>
      )}
    </form>
  );
}
