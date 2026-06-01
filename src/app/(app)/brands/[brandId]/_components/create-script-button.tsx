"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateScriptButton({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const res = await fetch(`/api/brands/${brandId}/scripts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });
    setBusy(false);
    if (!res.ok) return;
    const data = (await res.json()) as { id: string };
    router.push(`/brands/${brandId}/scripts/${data.id}`);
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      {busy ? "创建中…" : "新建稿件"}
    </button>
  );
}
