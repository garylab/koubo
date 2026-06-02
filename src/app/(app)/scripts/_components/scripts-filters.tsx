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

type Collection = { id: string; name: string };
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
  collectionId: string | null;
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
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={collectionId ?? ""}
        onChange={(e) => update({ c: e.target.value || null })}
        className="bg-transparent text-sm text-neutral-500 dark:text-neutral-400 px-1 py-1.5 outline-none cursor-pointer"
      >
        <option value="">全部稿件集</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <StatusMultiSelect
        value={statuses}
        onChange={(next) =>
          update({ s: next.length === SCRIPT_STATUSES.length ? null : next.join(",") })
        }
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
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggle(s: ScriptStatus) {
    if (value.includes(s)) onChange(value.filter((x) => x !== s));
    else onChange([...value, s]);
  }

  const allSelected = value.length === SCRIPT_STATUSES.length;
  const label = allSelected
    ? "全部状态"
    : value.length === 0
      ? "未选状态"
      : value.length === 1
        ? SCRIPT_STATUS_LABEL[value[0]]
        : `${value.length} 个状态`;

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
        <div className="absolute z-20 mt-1 min-w-[10rem] rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-md py-1">
          {SCRIPT_STATUSES.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <input
                type="checkbox"
                checked={value.includes(s)}
                onChange={() => toggle(s)}
                className="accent-neutral-900 dark:accent-neutral-100"
              />
              {SCRIPT_STATUS_LABEL[s]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
