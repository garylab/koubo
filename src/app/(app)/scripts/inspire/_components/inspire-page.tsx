"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markScriptsDirty } from "@/lib/list-refresh";

type Item = {
  title: string;
  // "idle" | "adding" | "added" — per-title state, so the user can add
  // multiple in a row without clobbering each other's feedback.
  state: "idle" | "adding" | "added";
};

export function InspirePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function inspire() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scripts/inspire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(j?.error ?? `请求失败 (${res.status})`);
        return;
      }
      const data = (await res.json()) as { titles?: string[] };
      const titles = (data.titles ?? []).filter((t) => t.trim());
      setItems(titles.map((t) => ({ title: t, state: "idle" })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }

  async function add(index: number) {
    const item = items[index];
    if (!item || item.state !== "idle") return;
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, state: "adding" } : it)),
    );
    const res = await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        content: "",
        source: "ai",
      }),
    });
    if (!res.ok) {
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, state: "idle" } : it)),
      );
      setError("加入失败");
      return;
    }
    markScriptsDirty();
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, state: "added" } : it)),
    );
    setToast("已加入库");
    setTimeout(() => setToast(null), 1500);
  }

  const empty = !busy && items.length === 0 && !error;

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-3xl mx-auto px-2 h-12 flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="返回"
            className="w-10 h-10 inline-flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="font-semibold tracking-tight text-base ml-1">AI 启发</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-40 min-h-[60dvh]">
        {empty && (
          <div className="py-10 text-center text-sm text-neutral-500">
            点击下方的「启发」按钮，AI 会从你已有的稿件里推 7 个新的口播主题。
          </div>
        )}
        {busy && (
          <div className="py-10 text-center text-sm text-neutral-500">
            正在从你的稿件里找灵感…
          </div>
        )}
        {!busy && error && (
          <div className="py-4 text-sm text-red-600">{error}</div>
        )}
        {items.length > 0 && (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {items.map((it, i) => (
              <li
                key={`${i}-${it.title}`}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-950"
              >
                <span className="flex-1 text-base text-neutral-900 dark:text-neutral-100">
                  {it.title}
                </span>
                <button
                  type="button"
                  onClick={() => add(i)}
                  disabled={it.state !== "idle"}
                  aria-label={it.state === "added" ? "已加入库" : "加入库"}
                  className={
                    it.state === "added"
                      ? "w-9 h-9 inline-flex items-center justify-center rounded-full bg-emerald-500 text-white"
                      : "w-9 h-9 inline-flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/40 dark:hover:text-violet-300 disabled:opacity-40"
                  }
                >
                  {it.state === "adding" ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 animate-spin" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="42" strokeDashoffset="12" />
                    </svg>
                  ) : it.state === "added" ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
                      <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating action bar */}
      <div
        className="fixed inset-x-0 z-40 flex justify-center gap-3 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}
      >
        <button
          type="button"
          onClick={inspire}
          disabled={busy}
          className="rounded-full bg-violet-600 text-white px-5 h-10 text-sm font-medium shadow-lg shadow-violet-600/30 disabled:opacity-40"
        >
          {busy ? "…" : items.length > 0 ? "再启发" : "启发"}
        </button>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 rounded-md bg-neutral-900 text-white text-sm px-4 py-2 shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 13rem)" }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
