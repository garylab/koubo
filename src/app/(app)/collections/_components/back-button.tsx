"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="返回"
      className="-ml-2 w-9 h-9 inline-flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md"
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
        <path
          d="M15 6l-6 6 6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
