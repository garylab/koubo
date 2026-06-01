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
      <div className="py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 w-14 shrink-0">密码</span>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {msg?.kind === "ok" ? msg.text : "••••••••"}
          </span>
        </div>
        <button
          onClick={() => {
            setOpen(true);
            setMsg(null);
          }}
          className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          修改
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="py-3 space-y-3">
      <div className="text-sm text-neutral-500">修改密码</div>
      <input
        type="password"
        required
        placeholder="当前密码"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="password"
        required
        minLength={8}
        placeholder="新密码（至少 8 位）"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
      />
      <input
        type="password"
        required
        placeholder="确认新密码"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm"
      />
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
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="text-neutral-500"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={busy || !current || !next || !confirm}
            className="text-neutral-900 dark:text-neutral-100 disabled:opacity-30"
          >
            {busy ? "提交中…" : "确认"}
          </button>
        </div>
      </div>
    </form>
  );
}
