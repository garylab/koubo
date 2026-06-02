"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

const THRESHOLD = 70;
const MAX_PULL = 110;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const [pull, setPull] = useState(0);
  const [active, setActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const armed = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Bind touch listeners non-passively to the document. Binding on a child
  // div misses gestures that start on the sticky header; binding to document
  // ensures we always catch the start of a downward swipe when scrolled to
  // the top.
  useEffect(() => {
    function onStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      armed.current = true;
      setActive(true);
    }
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
    function onEnd() {
      if (!armed.current) return;
      armed.current = false;
      setActive(false);
      setPull((p) => {
        if (p >= THRESHOLD) {
          setRefreshing(true);
          // Hard reload — most reliable across Next's RSC cache, the Service
          // Worker, and iOS PWA. Pull-to-refresh is a deliberate user action,
          // so a one-second full reload is acceptable.
          setTimeout(() => window.location.reload(), 150);
        }
        return 0;
      });
    }
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [refreshing]);

  const showing = pull > 0 || refreshing;
  const offset = refreshing ? 48 : pull;
  const ready = pull >= THRESHOLD;

  return (
    <div
      ref={wrapRef}
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
            {refreshing ? (
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
            <span>{refreshing ? "刷新中…" : ready ? "松开刷新" : "下拉刷新"}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
