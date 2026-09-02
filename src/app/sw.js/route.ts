export const runtime = "nodejs";
export const dynamic = "force-static";

// Kill-switch service worker: clears all caches and unregisters itself so
// existing installations stop intercepting requests. The app no longer uses
// a service worker — everything must go to the network.
const body = `
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll();
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
