"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const AUTOSAVE_DELAY = 1500;

type Props = {
  scriptId: string | null; // null = creating
  initialCollectionId: string;
  initialContent: string;
  embeddingUpdatedAt: string | null;
  collections: { id: string; name: string }[];
};

export function ScriptEditor({
  scriptId,
  initialCollectionId,
  initialContent,
  collections,
}: Props) {
  const router = useRouter();
  const isNew = scriptId === null;
  const storageKey = `koubo:draft:${scriptId ?? "new"}`;

  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [collectionId, setCollectionId] = useState(initialCollectionId);
  const [savedCollectionId, setSavedCollectionId] = useState(initialCollectionId);
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved">("idle");
  const restoredOnce = useRef(false);

  const [busy, setBusy] = useState<"save" | "delete" | null>(null);

  const hasContent = content.trim().length > 0;
  const dirty = isNew
    ? hasContent
    : content !== savedContent || collectionId !== savedCollectionId;
  const canSave = dirty && hasContent;

  // Restore local draft on mount (only if it differs from server content).
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;
    if (typeof window === "undefined") return;
    const draft = window.localStorage.getItem(storageKey);
    if (draft && draft !== initialContent) {
      setContent(draft);
    }
  }, [storageKey, initialContent]);

  // Mirror content to localStorage so nothing is lost on tab close / crash.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (content === initialContent || !content) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, content);
  }, [content, initialContent, storageKey]);

  // Debounced server autosave for existing scripts.
  useEffect(() => {
    if (isNew || !hasContent) return;
    if (content === savedContent && collectionId === savedCollectionId) return;
    const t = setTimeout(async () => {
      setAutosave("saving");
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, collectionId }),
      });
      if (!res.ok) {
        setAutosave("idle");
        return;
      }
      setSavedContent(content);
      setSavedCollectionId(collectionId);
      window.localStorage.removeItem(storageKey);
      setAutosave("saved");
      router.refresh();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [
    content,
    collectionId,
    savedContent,
    savedCollectionId,
    hasContent,
    isNew,
    scriptId,
    storageKey,
    router,
  ]);

  // Drop "已保存" badge back to idle after a short while.
  useEffect(() => {
    if (autosave !== "saved") return;
    const t = setTimeout(() => setAutosave("idle"), 1500);
    return () => clearTimeout(t);
  }, [autosave]);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  async function save() {
    if (!canSave) return;
    setBusy("save");
    if (isNew) {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, collectionId }),
      });
      setBusy(null);
      if (!res.ok) return;
      const data = (await res.json()) as { id: string };
      window.localStorage.removeItem(storageKey);
      router.push(`/scripts/${data.id}`);
      return;
    }
    const res = await fetch(`/api/scripts/${scriptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, collectionId }),
    });
    setBusy(null);
    if (!res.ok) return;
    setSavedContent(content);
    setSavedCollectionId(collectionId);
    window.localStorage.removeItem(storageKey);
    router.refresh();
  }

  async function remove() {
    if (isNew) {
      router.back();
      return;
    }
    if (!confirm("确定删除此稿件？")) return;
    setBusy("delete");
    const res = await fetch(`/api/scripts/${scriptId}`, { method: "DELETE" });
    if (res.ok) router.push("/scripts");
  }

  async function runAi() {
    if (!content.trim()) return;
    setAiOpen(true);
    setAiSuggestion("");
    setAiError(null);
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setAiError(j?.error ?? `请求失败 (${res.status})`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAiSuggestion(acc);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setAiBusy(false);
    }
  }

  function accept() {
    setContent(aiSuggestion);
    setAiOpen(false);
    setAiSuggestion("");
  }

  function reject() {
    setAiOpen(false);
    setAiSuggestion("");
    setAiError(null);
  }

  return (
    <div className="flex flex-col">
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

          <div className="flex-1" />

          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            aria-label={isNew ? "取消" : "删除"}
            className="w-10 h-10 inline-flex items-center justify-center rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-30"
          >
            {isNew ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
                <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {aiOpen ? (
        <AICompare
          content={content}
          onChange={setContent}
          aiSuggestion={aiSuggestion}
          aiBusy={aiBusy}
          aiError={aiError}
          onAccept={accept}
          onReject={reject}
          onRetry={runAi}
        />
      ) : (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入或粘贴你的视频稿…"
            autoFocus={isNew}
            className="max-w-3xl mx-auto w-full px-4 py-4 bg-transparent text-base leading-relaxed outline-none resize-none min-h-[50dvh]"
          />

          <div className="max-w-3xl mx-auto w-full px-4 py-4 space-y-4 border-t border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="text-xs text-neutral-500 mb-2">稿件集</div>
              <div className="flex flex-wrap gap-2">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCollectionId(c.id)}
                    className={
                      "rounded-full px-3 py-1 text-sm border transition-colors " +
                      (collectionId === c.id
                        ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100"
                        : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900")
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

<div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={runAi}
                disabled={!hasContent || aiBusy}
                className="inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                AI 优化
              </button>

              <div className="flex-1" />

              {!isNew && autosave !== "idle" && (
                <span className="text-xs text-neutral-500">
                  {autosave === "saving" ? "保存中…" : "已保存"}
                </span>
              )}

              <button
                type="button"
                onClick={save}
                disabled={!canSave || busy !== null}
                className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 h-9 text-sm font-medium disabled:opacity-30"
              >
                {busy === "save" ? "…" : "保存"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AICompare({
  content,
  onChange,
  aiSuggestion,
  aiBusy,
  aiError,
  onAccept,
  onReject,
  onRetry,
}: {
  content: string;
  onChange: (v: string) => void;
  aiSuggestion: string;
  aiBusy: boolean;
  aiError: string | null;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-3 space-y-3">
      <section>
        <div className="text-xs text-neutral-500 mb-1">原文</div>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[30vh] rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent p-3 text-base leading-relaxed font-mono resize-y"
        />
      </section>
      <section>
        <div className="text-xs text-neutral-500 mb-1 flex items-center gap-2">
          AI 建议
          {aiBusy && <span className="text-violet-600">流式生成中…</span>}
        </div>
        <div className="w-full min-h-[30vh] rounded-md border border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/30 p-3 text-sm leading-relaxed font-mono overflow-y-auto whitespace-pre-wrap">
          {aiError ? (
            <span className="text-red-600">{aiError}</span>
          ) : (
            aiSuggestion || (aiBusy ? "…" : "")
          )}
        </div>
      </section>
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={onAccept}
          disabled={aiBusy || !aiSuggestion || !!aiError}
          className="rounded-md bg-violet-600 text-white px-4 py-1.5 disabled:opacity-50"
        >
          采纳建议
        </button>
        <button
          type="button"
          onClick={onReject}
          className="text-neutral-500"
        >
          放弃
        </button>
        {!aiBusy && aiSuggestion && (
          <button
            type="button"
            onClick={onRetry}
            className="text-neutral-500 ml-auto"
          >
            重新生成
          </button>
        )}
      </div>
    </div>
  );
}
