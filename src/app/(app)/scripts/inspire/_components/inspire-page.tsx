"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markScriptsDirty } from "@/lib/list-refresh";

type Draft = { title: string; content: string };

export function InspirePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function inspire() {
    setBusy(true);
    setError(null);
    setDraft(null);
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
      const data = (await res.json()) as Draft;
      setDraft(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!draft) return;
    setAccepting(true);
    const res = await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: draft.content,
        title: draft.title,
        source: "ai",
      }),
    });
    setAccepting(false);
    if (!res.ok) {
      setError("创建失败");
      return;
    }
    markScriptsDirty();
    setDraft(null);
    setToast("已采纳，新增一条稿件");
    setTimeout(() => setToast(null), 2000);
    inspire();
  }

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

      <div className="max-w-3xl mx-auto px-4 pt-10 pb-40 min-h-[60dvh]">
        {!draft && !busy && !error && (
          <div className="py-10 text-center text-sm text-neutral-500">
            点击下方的「启发」按钮，AI 会从你已有的稿件里推一个新的创意。
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
        {!busy && draft && (
          <div className="space-y-3">
            <div className="text-2xl font-semibold">{draft.title || "(无标题)"}</div>
            <div className="text-lg leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">
              {draft.content}
            </div>
          </div>
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
          disabled={busy || accepting}
          className="rounded-full bg-violet-600 text-white px-5 h-10 text-sm font-medium shadow-lg shadow-violet-600/30 disabled:opacity-40"
        >
          {busy ? "…" : draft ? "再启发" : "启发"}
        </button>
        {draft && (
          <button
            type="button"
            onClick={accept}
            disabled={busy || accepting}
            className="rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 h-10 text-sm font-medium shadow-lg disabled:opacity-40"
          >
            {accepting ? "…" : "采纳"}
          </button>
        )}
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
