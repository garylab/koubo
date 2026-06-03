"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function ScriptsHeader() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        // Don't hide near the top — the gesture is too easy to trigger.
        if (y < 64) {
          setHidden(false);
        } else if (dy > 4) {
          setHidden(true);
        } else if (dy < -4) {
          setHidden(false);
        }
        lastY.current = y;
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur transition-transform duration-200"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
        <Link
          href="/scripts"
          className="shrink-0 font-semibold tracking-tight text-base"
        >
          Koubo
        </Link>
        <div className="flex-1" />
        <Link
          href="/collections"
          aria-label="设置稿件集"
          className="shrink-0 inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 px-2 h-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
            <path
              d="M19.4 13.6a7.97 7.97 0 0 0 0-3.2l1.7-1.3a.5.5 0 0 0 .12-.65l-1.6-2.77a.5.5 0 0 0-.61-.22l-2 .8a8.1 8.1 0 0 0-2.77-1.6l-.3-2.13A.5.5 0 0 0 13.45 2h-2.9a.5.5 0 0 0-.5.43l-.3 2.13a8.1 8.1 0 0 0-2.77 1.6l-2-.8a.5.5 0 0 0-.61.22l-1.6 2.77a.5.5 0 0 0 .12.65l1.7 1.3a7.97 7.97 0 0 0 0 3.2l-1.7 1.3a.5.5 0 0 0-.12.65l1.6 2.77a.5.5 0 0 0 .61.22l2-.8a8.1 8.1 0 0 0 2.77 1.6l.3 2.13a.5.5 0 0 0 .5.43h2.9a.5.5 0 0 0 .5-.43l.3-2.13a8.1 8.1 0 0 0 2.77-1.6l2 .8a.5.5 0 0 0 .61-.22l1.6-2.77a.5.5 0 0 0-.12-.65l-1.7-1.3Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          稿件集
        </Link>
      </div>
    </header>
  );
}
