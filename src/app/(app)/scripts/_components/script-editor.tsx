"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AI_MODES,
  AI_MODE_HINT,
  AI_MODE_LABEL,
  type AiMode,
} from "@/lib/ai-modes";
import { markScriptsDirty } from "@/lib/list-refresh";

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
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!hasContent) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

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
      markScriptsDirty();
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
  const [aiMode, setAiMode] = useState<AiMode>("optimize");
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!aiMenuRef.current || aiMenuRef.current.contains(e.target as Node)) return;
      setAiMenuOpen(false);
    }
    if (aiMenuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [aiMenuOpen]);

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
      markScriptsDirty();
      router.replace(`/scripts/${data.id}`);
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
    markScriptsDirty();
  }

  async function remove() {
    if (isNew) {
      router.back();
      return;
    }
    if (!confirm("确定删除此稿件？")) return;
    setBusy("delete");
    const res = await fetch(`/api/scripts/${scriptId}`, { method: "DELETE" });
    if (res.ok) {
      markScriptsDirty();
      router.push("/scripts");
    }
  }

  async function runAi(mode: AiMode = aiMode) {
    if (!content.trim()) return;
    setAiMode(mode);
    setAiMenuOpen(false);
    setAiOpen(true);
    setAiSuggestion("");
    setAiError(null);
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mode }),
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

          {!isNew && autosave !== "idle" && (
            <span className="text-xs text-neutral-500 px-1">
              {autosave === "saving" ? "保存中…" : "已保存"}
            </span>
          )}

          {canSave && (
            <button
              type="button"
              onClick={save}
              disabled={busy !== null}
              className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 h-9 text-sm font-medium disabled:opacity-30"
            >
              {busy === "save" ? "…" : "保存"}
            </button>
          )}

          <button
            type="button"
            onClick={copy}
            disabled={!hasContent}
            aria-label="复制全部内容"
            className="w-10 h-10 inline-flex items-center justify-center rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-30"
          >
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-emerald-600" aria-hidden>
                <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>

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
          mode={aiMode}
          content={content}
          onChange={setContent}
          aiSuggestion={aiSuggestion}
          aiBusy={aiBusy}
          aiError={aiError}
          onAccept={accept}
          onReject={reject}
          onRetry={() => runAi(aiMode)}
        />
      ) : (
        <>
          <div className="max-w-3xl mx-auto w-full px-4 pt-6 flex flex-wrap gap-2">
            {collections.map((c) => {
              const active = collectionId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCollectionId(c.id)}
                  className={
                    "rounded-full px-3 py-1 text-sm border transition-colors " +
                    (active
                      ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100")
                  }
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入或粘贴你的视频稿…"
            autoFocus={isNew}
            className="max-w-3xl mx-auto w-full px-4 pt-6 pb-40 bg-transparent text-lg leading-relaxed outline-none resize-none min-h-[60dvh]"
          />

          <div
            ref={aiMenuRef}
            className="fixed left-1/2 -translate-x-1/2 z-40"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 9rem)" }}
          >
            <button
              type="button"
              onClick={() => setAiMenuOpen((v) => !v)}
              disabled={!hasContent || aiBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white px-4 h-10 text-sm font-medium shadow-lg shadow-violet-600/30 hover:bg-violet-700 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              AI
            </button>
            {aiMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-md py-1">
                {AI_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => runAi(m)}
                    className="block w-full text-left whitespace-nowrap px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    <span className="text-neutral-900 dark:text-neutral-100">
                      {AI_MODE_LABEL[m]}
                    </span>
                    <span className="text-xs text-neutral-500 ml-1">
                      / {AI_MODE_HINT[m]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AICompare({
  mode,
  content,
  onChange,
  aiSuggestion,
  aiBusy,
  aiError,
  onAccept,
  onReject,
  onRetry,
}: {
  mode: AiMode;
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
          AI 建议 · {AI_MODE_LABEL[mode]}
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
