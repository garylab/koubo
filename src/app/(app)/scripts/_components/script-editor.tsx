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
  scriptId: number | null; // null = creating
  initialCollectionId: number;
  initialTitle: string;
  initialContent: string;
  embeddingUpdatedAt: string | null;
  collections: { id: number; name: string }[];
};

export function ScriptEditor({
  scriptId,
  initialCollectionId,
  initialTitle,
  initialContent,
  collections,
}: Props) {
  const router = useRouter();
  const isNew = scriptId === null;
  const storageKey = `koubo:draft:${scriptId ?? "new"}`;

  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [collectionId, setCollectionId] = useState(initialCollectionId);
  const [savedCollectionId, setSavedCollectionId] = useState(initialCollectionId);
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved">("idle");
  const restoredOnce = useRef(false);

  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function selectAll() {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }

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
    : content !== savedContent ||
      collectionId !== savedCollectionId ||
      title !== savedTitle;
  const canSave = dirty && hasContent;

  // When the server-generated title arrives (after defer-create) and the
  // user hasn't typed their own, adopt it.
  useEffect(() => {
    if (!initialTitle) return;
    if (title === "" || title === savedTitle) {
      setTitle(initialTitle);
      setSavedTitle(initialTitle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTitle]);

  // On mount, reconcile local draft with the server-rendered initialContent.
  // The Next.js client router cache can serve a stale RSC payload after we've
  // autosaved (so initialContent might be older than what we actually have).
  // Treat localStorage as the source of truth when it diverges; clear it only
  // when the server caught up.
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;
    if (typeof window === "undefined") return;
    const draft = window.localStorage.getItem(storageKey);
    if (draft == null) return;
    if (draft === initialContent) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    setContent(draft);
    setSavedContent(draft);
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
    if (
      content === savedContent &&
      collectionId === savedCollectionId &&
      title === savedTitle
    )
      return;
    const t = setTimeout(async () => {
      setAutosave("saving");
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, collectionId, title }),
      });
      if (!res.ok) {
        setAutosave("idle");
        return;
      }
      setSavedContent(content);
      setSavedCollectionId(collectionId);
      setSavedTitle(title);
      // Don't clear the draft yet — keep it so a stale RSC payload on the
      // next mount can be corrected. It'll be cleared on the next mount when
      // initialContent (fresh from server) matches.
      setAutosave("saved");
      markScriptsDirty();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [
    content,
    collectionId,
    title,
    savedContent,
    savedCollectionId,
    savedTitle,
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
  const [aiMode, setAiMode] = useState<AiMode | "custom">("optimize");
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const aiMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!aiMenuRef.current || aiMenuRef.current.contains(e.target as Node)) return;
      setAiMenuOpen(false);
      setCustomOpen(false);
    }
    if (aiMenuOpen || customOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [aiMenuOpen, customOpen]);

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
      const data = (await res.json()) as { id: number };
      window.localStorage.removeItem(storageKey);
      markScriptsDirty();
      router.replace(`/scripts/${data.id}`);
      return;
    }
    const res = await fetch(`/api/scripts/${scriptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, collectionId, title }),
    });
    setBusy(null);
    if (!res.ok) return;
    setSavedContent(content);
    setSavedCollectionId(collectionId);
    setSavedTitle(title);
    // Same as autosave: keep the draft until the next mount can confirm
    // server is up to date.
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
      window.localStorage.removeItem(storageKey);
      markScriptsDirty();
      router.push("/scripts");
    }
  }

  async function runAi(mode: AiMode | "custom" = aiMode) {
    if (!content.trim()) return;
    if (mode === "custom" && !customPrompt.trim()) return;
    setAiMode(mode);
    setAiMenuOpen(false);
    setCustomOpen(false);
    setAiOpen(true);
    setAiSuggestion("");
    setAiError(null);
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "custom"
            ? { content, mode, customPrompt: customPrompt.trim() }
            : { content, mode },
        ),
      });
      const j = (await res.json().catch(() => null)) as
        | { content?: string; error?: string }
        | null;
      if (!res.ok || !j?.content) {
        setAiError(j?.error ?? `请求失败 (${res.status})`);
        return;
      }
      setAiSuggestion(j.content);
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

          <button
            type="button"
            onClick={selectAll}
            disabled={!hasContent}
            aria-label="全选内容"
            className="w-10 h-10 inline-flex items-center justify-center rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
              <path
                d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>

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

          {!isNew && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 20))}
              placeholder="稿件标题"
              maxLength={20}
              className="max-w-3xl mx-auto w-full px-4 pt-6 bg-transparent text-xl font-semibold outline-none"
            />
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入或粘贴你的视频稿…"
            autoFocus={isNew}
            className="max-w-3xl mx-auto w-full px-4 pt-4 pb-40 bg-transparent text-lg leading-relaxed outline-none resize-none min-h-[60dvh]"
          />

          {canSave && (
            <button
              type="button"
              onClick={save}
              disabled={busy !== null}
              className="fixed left-4 z-40 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-5 h-10 text-sm font-medium shadow-lg disabled:opacity-40"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}
            >
              {busy === "save" ? "…" : "保存"}
            </button>
          )}

          <div
            ref={aiMenuRef}
            className="fixed right-4 z-40"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}
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
            {aiMenuOpen && !customOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-max rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-md py-1">
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
                <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                <button
                  type="button"
                  onClick={() => {
                    setAiMenuOpen(false);
                    setCustomOpen(true);
                  }}
                  className="block w-full text-left whitespace-nowrap px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <span className="text-neutral-900 dark:text-neutral-100">自定义…</span>
                  <span className="text-xs text-neutral-500 ml-1">/ 用自己的指令</span>
                </button>
              </div>
            )}
            {customOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-80 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-md p-3 space-y-2">
                <div className="text-xs text-neutral-500">
                  自定义指令（描述你想让 AI 怎么改）
                </div>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value.slice(0, 500))}
                  placeholder="例如：把整段改成更年轻、带点自嘲的语气；保留所有数字"
                  className="w-full h-24 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent p-2 text-sm outline-none resize-none focus:border-violet-500"
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>{customPrompt.length}/500</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomOpen(false)}
                      className="px-2 py-1 text-neutral-500"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => runAi("custom")}
                      disabled={!customPrompt.trim()}
                      className="rounded bg-violet-600 text-white px-3 py-1 disabled:opacity-40"
                    >
                      生成
                    </button>
                  </div>
                </div>
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
  mode: AiMode | "custom";
  content: string;
  onChange: (v: string) => void;
  aiSuggestion: string;
  aiBusy: boolean;
  aiError: string | null;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
}) {
  const modeLabel = mode === "custom" ? "自定义" : AI_MODE_LABEL[mode];
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
          AI 建议 · {modeLabel}
          {aiBusy && <span className="text-violet-600">生成中…</span>}
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
