"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const REVEAL = 88;

type Axis = null | "h" | "v";

type Props = {
  id: string;
  name: string;
  isDefault: boolean;
};

export function CollectionRow({ id, name, isDefault }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const [busy, setBusy] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<Axis>(null);
  const active = useRef(false);

  function begin(clientX: number, clientY: number) {
    if (editing || isDefault) return;
    startX.current = clientX;
    startY.current = clientY;
    startOffset.current = dragX;
    axis.current = null;
    active.current = true;
  }
  function move(clientX: number, clientY: number) {
    if (!active.current) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;
    if (axis.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "v") {
        active.current = false;
        return;
      }
    }
    if (axis.current !== "h") return;
    const next = Math.max(-REVEAL, Math.min(0, startOffset.current + dx));
    setDragX(next);
  }
  function end() {
    const wasH = axis.current === "h";
    active.current = false;
    axis.current = null;
    if (!wasH) return;
    if (dragX < -REVEAL / 2) {
      setDragX(-REVEAL);
      setOpen(true);
    } else {
      setDragX(0);
      setOpen(false);
    }
  }

  async function rename() {
    const next = val.trim();
    if (!next || next === name) {
      setEditing(false);
      setVal(name);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    setBusy(false);
    setEditing(false);
    if (res.ok) router.refresh();
  }

  async function remove() {
    if (!confirm(`确定删除稿件集「${name}」及其下所有稿件？`)) return;
    setBusy(true);
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  function startEdit() {
    if (open) {
      setDragX(0);
      setOpen(false);
      return;
    }
    setEditing(true);
  }

  return (
    <li className="relative overflow-hidden">
      {!isDefault && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          style={{
            opacity: Math.min(1, -dragX / REVEAL),
            pointerEvents: dragX < 0 ? "auto" : "none",
          }}
          className="absolute right-0 top-0 bottom-0 w-[88px] flex items-center justify-center bg-red-600 text-white text-sm disabled:opacity-50"
        >
          删除
        </button>
      )}

      <div
        onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={end}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") return;
          begin(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
          if (axis.current === "h" && active.current) {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }
          move(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "touch") return;
          end();
        }}
        onPointerCancel={end}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragX === -REVEAL || dragX === 0 ? "transform 0.18s" : "none",
        }}
        className="relative bg-white dark:bg-neutral-950 px-4 py-3 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onBlur={rename}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename();
                if (e.key === "Escape") {
                  setVal(name);
                  setEditing(false);
                }
              }}
              disabled={busy}
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-base"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="font-medium truncate text-left w-full hover:text-neutral-600 dark:hover:text-neutral-400"
            >
              {name}
              {isDefault && (
                <span className="ml-2 text-xs text-neutral-500 font-normal">（默认）</span>
              )}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
