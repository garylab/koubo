"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/login");
        router.refresh();
      }}
      className="w-full rounded-xl border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950"
    >
      退出登录
    </button>
  );
}
