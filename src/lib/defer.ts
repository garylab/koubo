import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Run work after the response has been sent. Uses Cloudflare's ctx.waitUntil
 * when available, otherwise fires the promise without awaiting (dev fallback).
 */
export function defer(promise: Promise<unknown>) {
  const safe = promise.catch((err) => {
    console.error("[defer] background task failed:", err);
  });
  try {
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(safe);
  } catch {
    void safe;
  }
}
