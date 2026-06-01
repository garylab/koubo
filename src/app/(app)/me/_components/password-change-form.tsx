"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function PasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ kind: "err", text: "新密码至少 8 位" });
      return;
    }
    if (next !== confirm) {
      setMsg({ kind: "err", text: "两次新密码不一致" });
      return;
    }
    setBusy(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: false,
    });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: error.message ?? "修改失败" });
      return;
    }
    reset();
    setOpen(false);
    setMsg({ kind: "ok", text: "密码已更新" });
  }

  if (!open) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">密码</div>
          <div className="text-xs text-neutral-500">
            {msg?.kind === "ok"
              ? msg.text
              : "通过邮箱密码登录的账户可以修改密码"}
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          修改密码
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
    >
      <div className="text-sm font-medium">修改密码</div>
      <div>
        <label className="text-xs text-neutral-500">当前密码</label>
        <input
          type="password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-neutral-500">新密码（至少 8 位）</label>
        <input
          type="password"
          required
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-neutral-500">确认新密码</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
        />
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={busy || !current || !next || !confirm}
            className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {busy ? "提交中…" : "确认"}
          </button>
        </div>
      </div>
    </form>
  );
}
