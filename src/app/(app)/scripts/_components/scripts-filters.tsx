"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SCRIPTS_DIRTY_KEY } from "@/lib/list-refresh";

const STORAGE_KEY = "koubo:scripts-filters";

const FILTER_KEYS = ["c", "s", "sort"] as const;
import {
  SCRIPT_STATUSES,
  SCRIPT_STATUS_LABEL,
  type ScriptStatus,
} from "@/lib/script-status";

type Collection = { id: number; name: string };
export type SortKey = "updated" | "created";

const SORT_LABEL: Record<SortKey, string> = {
  updated: "修改时间",
  created: "创建时间",
};

export function ScriptsFilters({
  collections,
  collectionId,
  statuses,
  sort,
}: {
  collections: Collection[];
  collectionId: number | null;
  statuses: ScriptStatus[];
  sort: SortKey;
}) {
  const router = useRouter();
  const params = useSearchParams();

  // Restore saved filters when landing on /scripts with no filter params.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasAny = FILTER_KEYS.some((k) => params.has(k));
    if (hasAny) return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    router.replace(`/scripts?${saved}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If a mutation elsewhere left a "dirty" flag, refresh on arrival so we
  // don't show a stale router-cached payload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SCRIPTS_DIRTY_KEY)) {
      window.localStorage.removeItem(SCRIPTS_DIRTY_KEY);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist current filter params whenever they change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const usp = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) usp.set(k, v);
    }
    const qs = usp.toString();
    if (qs) window.localStorage.setItem(STORAGE_KEY, qs);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [params]);

  function update(next: Record<string, string | null>) {
    const usp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") usp.delete(k);
      else usp.set(k, v);
    }
    const qs = usp.toString();
    router.push(qs ? `/scripts?${qs}` : "/scripts");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">稿件集</span>
      <select
        value={collectionId ?? ""}
        onChange={(e) => update({ c: e.target.value || null })}
        className="bg-transparent text-sm text-neutral-500 dark:text-neutral-400 px-1 py-1.5 outline-none cursor-pointer"
      >
        <option value="">全部</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-4">状态</span>
      <StatusMultiSelect
        value={statuses}
        onChange={(next) => {
          const s =
            next.length === SCRIPT_STATUSES.length
              ? "all"
              : next.length === 0
                ? "none"
                : next.join(",");
          update({ s });
        }}
      />

      <div className="ml-auto flex items-center gap-1">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">排序</span>
        <select
          value={sort}
          onChange={(e) => update({ sort: e.target.value === "created" ? null : e.target.value })}
          className="bg-transparent text-sm text-neutral-500 dark:text-neutral-400 px-1 py-1.5 outline-none cursor-pointer"
        >
          {(["created", "updated"] as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StatusMultiSelect({
  value,
  onChange,
}: {
  value: ScriptStatus[];
  onChange: (next: ScriptStatus[]) => void;
}) {
  const [open, setOpen] = useState(false);
  // Draft holds pending changes while the panel is open; only committed to
  // the URL when the user clicks 确定.
  const [draft, setDraft] = useState<ScriptStatus[]>(value);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Reset draft to the committed value each time the panel opens.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  function toggle(s: ScriptStatus) {
    setDraft((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  const draftAll = draft.length === SCRIPT_STATUSES.length;
  const committedAll = value.length === SCRIPT_STATUSES.length;
  const label = committedAll
    ? "全部"
    : value.length === 0
      ? "无"
      : value.length === 1
        ? SCRIPT_STATUS_LABEL[value[0]]
        : `${value.length} 个`;

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 bg-transparent text-sm text-neutral-500 dark:text-neutral-400 px-1 py-1.5"
      >
        {label}
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-neutral-500" aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 min-w-[11rem] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-md py-1">
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <input
              type="checkbox"
              checked={draftAll}
              ref={(el) => {
                if (el) el.indeterminate = !draftAll && draft.length > 0;
              }}
              onChange={() =>
                setDraft(draftAll ? [] : [...SCRIPT_STATUSES])
              }
              className="accent-neutral-900 dark:accent-neutral-100"
            />
            全部
          </label>
          {SCRIPT_STATUSES.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <input
                type="checkbox"
                checked={draft.includes(s)}
                onChange={() => toggle(s)}
                className="accent-neutral-900 dark:accent-neutral-100"
              />
              {SCRIPT_STATUS_LABEL[s]}
            </label>
          ))}
          <div className="flex items-center justify-end gap-1 px-2 pt-1.5 pb-1 border-t border-neutral-200 dark:border-neutral-800 mt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              取消
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1 text-xs font-medium"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
