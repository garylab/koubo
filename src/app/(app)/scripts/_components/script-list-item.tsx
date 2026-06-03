"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  SCRIPT_STATUSES,
  SCRIPT_STATUS_LABEL,
  type ScriptStatus,
} from "@/lib/script-status";
import { formatRelative } from "@/lib/relative-time";
import { markScriptsDirty } from "@/lib/list-refresh";

const REVEAL = 88;
const STATUS_TONE: Record<ScriptStatus, string> = {
  unrecorded: "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400",
  recording: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  recorded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  published: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

type Props = {
  id: string;
  title: string;
  preview: string;
  collectionName: string;
  time: number;
  status: ScriptStatus;
};

type Axis = null | "h" | "v";

export function ScriptListItem({ id, title, preview, collectionName, time, status }: Props) {
  const [timeLabel, setTimeLabel] = useState(() => formatRelative(time));
  useEffect(() => {
    setTimeLabel(formatRelative(time));
    const tick = setInterval(() => setTimeLabel(formatRelative(time)), 30_000);
    return () => clearInterval(tick);
  }, [time]);

  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<ScriptStatus>(status);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<Axis>(null);
  const active = useRef(false);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (badgeRef.current?.contains(t)) return;
      if (menuWrapRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !badgeRef.current) return;
    const r = badgeRef.current.getBoundingClientRect();
    setMenuPos({ left: r.left, top: r.bottom + 4 });
    function onScroll() {
      setMenuOpen(false);
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [menuOpen]);

  function begin(clientX: number, clientY: number) {
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

  function onTouchStart(e: React.TouchEvent) {
    begin(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchMove(e: React.TouchEvent) {
    move(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchEnd() {
    end();
  }
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    begin(e.clientX, e.clientY);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    if (axis.current === "h" && active.current) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    move(e.clientX, e.clientY);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    end();
  }

  function onLinkClick(e: React.MouseEvent) {
    if (open || axis.current === "h") {
      e.preventDefault();
      setDragX(0);
      setOpen(false);
    }
  }

  async function changeStatus(next: ScriptStatus) {
    setMenuOpen(false);
    if (next === currentStatus) return;
    const prev = currentStatus;
    setCurrentStatus(next);
    const res = await fetch(`/api/scripts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setCurrentStatus(prev);
      return;
    }
    markScriptsDirty();
    router.refresh();
  }

  async function remove() {
    if (!confirm("确定删除此稿件？")) return;
    setBusy(true);
    const res = await fetch(`/api/scripts/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      markScriptsDirty();
      router.refresh();
    }
  }

  return (
    <li className="relative overflow-hidden">
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

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragX === -REVEAL || dragX === 0 ? "transform 0.18s" : "none",
        }}
        className="relative bg-white dark:bg-neutral-950"
      >
        {menuOpen && menuPos && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuWrapRef}
                style={{ position: "fixed", left: menuPos.left, top: menuPos.top }}
                className="z-50 w-max rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-md py-1"
              >
                {SCRIPT_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(s)}
                    className={
                      "block min-w-full text-left whitespace-nowrap px-5 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 " +
                      (s === currentStatus
                        ? "text-neutral-900 dark:text-neutral-100 font-medium"
                        : "text-neutral-600 dark:text-neutral-300")
                    }
                  >
                    {SCRIPT_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>,
              document.body,
            )
          : null}

        <Link
          href={`/scripts/${id}`}
          onClick={onLinkClick}
          className="block px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          <div className="text-lg font-medium flex items-center gap-2 min-w-0">
            <button
              ref={badgeRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (open) {
                  setDragX(0);
                  setOpen(false);
                  return;
                }
                setMenuOpen((v) => !v);
              }}
              className={`shrink-0 px-2 py-0.5 rounded ${STATUS_TONE[currentStatus]}`}
            >
              {SCRIPT_STATUS_LABEL[currentStatus]}
            </button>
            <span className="truncate">{title}</span>
          </div>
          {preview && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 truncate">
              {preview}
            </div>
          )}
          <div className="text-xs text-neutral-500 mt-0.5">
            {collectionName} · {timeLabel}
          </div>
        </Link>
      </div>
    </li>
  );
}
