"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reloaded = false;
    function reload() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }
    // When a new SW activates and takes over, refresh so the page picks up
    // matching JS bundles.
    navigator.serviceWorker.addEventListener("controllerchange", reload);

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        function check() {
          reg.update().catch(() => {});
        }
        // Re-check for updates whenever the tab regains focus or visibility.
        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) check();
        });
      })
      .catch(() => {});
  }, []);
  return null;
}
