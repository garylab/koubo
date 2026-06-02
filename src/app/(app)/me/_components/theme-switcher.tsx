"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "koubo:theme";

function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setTheme(saved);
    setMounted(true);
  }, []);

  // Re-apply when the OS preference changes while on "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function pick(next: Theme) {
    setTheme(next);
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  const options: { key: Theme; label: string }[] = [
    { key: "system", label: "随系统" },
    { key: "light", label: "亮色" },
    { key: "dark", label: "暗色" },
  ];

  return (
    <div className="py-4 flex items-center gap-3">
      <span className="text-xs text-neutral-500 w-12 shrink-0">主题</span>
      <div className="flex gap-1 rounded-md bg-neutral-100 dark:bg-neutral-900 p-0.5">
        {options.map((o) => {
          const active = mounted && theme === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => pick(o.key)}
              className={
                "rounded px-3 py-1 text-sm transition-colors " +
                (active
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
