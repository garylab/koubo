"use client";

import { useEffect, useState } from "react";
import { markScriptsDirty } from "@/lib/list-refresh";
import { useRouter } from "next/navigation";

type Item = {
  title: string;
  state: "idle" | "adding" | "added";
};

export function InspireLauncher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // Lock body scroll while the sheet is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

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
    router.refresh();
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, state: "added" } : it)),
    );
    setToast("已加入库");
    setTimeout(() => setToast(null), 1500);
  }

  async function openSheet() {
    setOpen(true);
    if (items.length === 0 && !busy) await inspire();
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label="AI 启发"
        className="fixed right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white px-4 h-10 text-sm font-medium shadow-lg shadow-violet-600/30 hover:bg-violet-700"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
          <path
            d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .9 1.6h5.2c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        启发
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full sm:max-w-lg max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 h-12 border-b border-neutral-200 dark:border-neutral-800">
              <span className="font-semibold text-base">AI 启发</span>
              <span className="text-xs text-neutral-500">点 + 加入库，可无限点</span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {busy && items.length === 0 && (
                <div className="py-8 text-center text-sm text-neutral-500">
                  正在从你的稿件里找灵感…
                </div>
              )}
              {!busy && error && (
                <div className="py-3 text-sm text-red-600 px-1">{error}</div>
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

            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
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
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-16 rounded-md bg-neutral-900 text-white text-sm px-4 py-2 shadow-lg">
                {toast}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
