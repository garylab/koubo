"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matches: (path: string) => boolean;
};

const SCRIPTS: NavItem = {
  href: "/scripts",
  label: "稿件",
  matches: (p) =>
    p === "/scripts" ||
    p.startsWith("/scripts") ||
    p === "/collections" ||
    p.startsWith("/collections/"),
  icon: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
      <path
        d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 4v5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 13h7M8.5 16.5h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const ME: NavItem = {
  href: "/me",
  // /collections is reached from the 稿件 header's settings icon, so it
  // belongs to the 稿件 tab now — no fallthrough here.
  matches: (p) => p === "/me" || p.startsWith("/me/"),
  label: "我的",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function BottomNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeC = params.get("c");
  const createHref = activeC ? `/scripts/new?c=${activeC}` : "/scripts/new";

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-3xl grid grid-cols-3">
        <NavTab item={SCRIPTS} active={SCRIPTS.matches(pathname)} />
        <CreateButton href={createHref} />
        <NavTab item={ME} active={ME.matches(pathname)} />
      </div>
    </nav>
  );
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={
        "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors " +
        (active
          ? "text-neutral-900 dark:text-neutral-100"
          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200")
      }
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

function CreateButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] text-neutral-500 dark:text-neutral-400"
      aria-label="新建稿件"
    >
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>新建</span>
    </Link>
  );
}
