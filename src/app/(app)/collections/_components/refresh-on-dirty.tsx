"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { COLLECTIONS_DIRTY_KEY } from "@/lib/list-refresh";

export function RefreshOnDirty() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(COLLECTIONS_DIRTY_KEY)) {
      window.localStorage.removeItem(COLLECTIONS_DIRTY_KEY);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
