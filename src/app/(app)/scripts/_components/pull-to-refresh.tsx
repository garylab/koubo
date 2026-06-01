"use client";

import { ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 70;
const MAX_PULL = 110;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const [active, setActive] = useState(false);
  const startY = useRef(0);
  const armed = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Use non-passive touchmove so we can preventDefault while pulling and
  // suppress the browser's native overscroll bounce.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function onMove(e: TouchEvent) {
      if (!armed.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      e.preventDefault();
      setPull(Math.min(MAX_PULL, dy * 0.5));
    }
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY > 0 || isPending) return;
    startY.current = e.touches[0].clientY;
    armed.current = true;
    setActive(true);
  }
  function onTouchEnd() {
    if (!armed.current) return;
    armed.current = false;
    setActive(false);
    if (pull >= THRESHOLD) {
      startTransition(() => router.refresh());
    }
    setPull(0);
  }

  const showing = pull > 0 || isPending;
  const offset = isPending ? 48 : pull;
  const ready = pull >= THRESHOLD;

  return (
    <div
      ref={wrapRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ overscrollBehaviorY: "contain", minHeight: "calc(100dvh - 6rem)" }}
    >
      <div
        style={{
          height: offset,
          transition: active ? "none" : "height 0.2s",
        }}
        className="flex items-end justify-center overflow-hidden"
      >
        {showing && (
          <div className="pb-2 text-xs text-neutral-500 flex items-center gap-1.5">
            {isPending ? (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 animate-spin" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            ) : (
              <span
                style={{
                  display: "inline-block",
                  transform: `rotate(${ready ? 180 : 0}deg)`,
                  transition: "transform 0.15s",
                }}
              >
                ↓
              </span>
            )}
            <span>{isPending ? "刷新中…" : ready ? "松开刷新" : "下拉刷新"}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
