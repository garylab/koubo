"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  scriptId: string;
  brandId: string;
  initialTitle: string;
  initialContent: string;
  embeddingUpdatedAt: string | null;
};

export function ScriptEditor({
  scriptId,
  brandId,
  initialTitle,
  initialContent,
  embeddingUpdatedAt,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [savedContent, setSavedContent] = useState(initialContent);

  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const dirty = title !== savedTitle || content !== savedContent;

  // AI panel state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  async function save() {
    setBusy("save");
    const res = await fetch(`/api/scripts/${scriptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setBusy(null);
    if (!res.ok) return;
    setSavedTitle(title);
    setSavedContent(content);
    router.refresh();
  }

  async function remove() {
    if (!confirm("确定删除此稿件？")) return;
    setBusy("delete");
    const res = await fetch(`/api/scripts/${scriptId}`, { method: "DELETE" });
    if (res.ok) router.push(`/brands/${brandId}`);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="稿件标题"
          className="flex-1 text-xl font-semibold bg-transparent outline-none border-b border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 py-1"
        />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">
            {dirty ? "未保存" : embeddingUpdatedAt ? "已索引" : "已保存"}
          </span>
          <button
            onClick={runAi}
            disabled={!content.trim() || aiBusy}
            className="rounded-md border border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-300 px-2 py-1 hover:bg-violet-50 dark:hover:bg-violet-950 disabled:opacity-50"
          >
            ✨ AI 优化
          </button>
          <button
            onClick={save}
            disabled={!dirty || busy !== null}
            className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1 disabled:opacity-50"
          >
            {busy === "save" ? "保存中…" : "保存"}
          </button>
          <button
            onClick={remove}
            disabled={busy !== null}
            className="rounded-md border border-red-300 text-red-600 dark:border-red-900 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
          >
            删除
          </button>
        </div>
      </div>

      {aiOpen ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[60vh]">
          <div className="flex flex-col">
            <div className="text-xs text-neutral-500 mb-1">原文</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent p-3 text-sm leading-relaxed font-mono resize-none"
            />
          </div>
          <div className="flex flex-col">
            <div className="text-xs text-neutral-500 mb-1 flex items-center gap-2">
              AI 建议
              {aiBusy && <span className="text-violet-600">流式生成中…</span>}
            </div>
            <div className="flex-1 rounded-md border border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 p-3 text-sm leading-relaxed font-mono overflow-y-auto whitespace-pre-wrap">
              {aiError ? (
                <span className="text-red-600">{aiError}</span>
              ) : (
                aiSuggestion || (aiBusy ? "…" : "")
              )}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={accept}
                disabled={aiBusy || !aiSuggestion || !!aiError}
                className="rounded-md bg-violet-600 text-white px-3 py-1 text-xs disabled:opacity-50"
              >
                采纳建议
              </button>
              <button
                onClick={reject}
                className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs"
              >
                放弃
              </button>
              {!aiBusy && aiSuggestion && (
                <button
                  onClick={runAi}
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs"
                >
                  重新生成
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在此输入或粘贴你的视频稿…"
          className="w-full min-h-[60vh] rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent p-3 text-sm leading-relaxed font-mono resize-y"
        />
      )}
    </div>
  );
}
