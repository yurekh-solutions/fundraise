/* Fundraise service worker: offline shell.
 *
 * Strategy:
 *  - Navigations: network-first with cache fallback, then /offline.
 *  - Immutable static assets (/_next/static, icon): cache-first.
 *  - Everything else: untouched passthrough.
 *
 * Cache keys are normalized to plain GET requests: navigate-mode Request
 * objects are unreliable as Cache keys across browsers. Entries are written
 * from a separate background fetch: cloning a live navigation response and
 * feeding the clone to cache.put() stalls in some browsers, while a fresh
 * same-origin GET puts cleanly.
 *
 * Scope discipline: this worker only ever caches same-origin GET documents
 * and static assets. User financial data never passes through here — it
 * lives in browser storage and is rendered locally at runtime.
 */
const VERSION = "fundraise-v1";
const CORE = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Store a fresh copy of the resource in the background. */
function cacheLater(event, key) {
  event.waitUntil(
    fetch(key)
      .then((response) =>
        caches.open(VERSION).then((cache) => cache.put(key, response))
      )
      .catch(() => {})
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const key = new Request(url.pathname + url.search, { method: "GET" });

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cacheLater(event, key);
          return response;
        })
        .catch(() =>
          fetch(key)
            .catch(() => null)
            .then(
              (retry) =>
                retry ||
                caches.match(key).then((hit) => hit || caches.match("/offline"))
            )
        )
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(
      caches.match(key).then((hit) => {
        if (hit) return hit;
        cacheLater(event, key);
        return fetch(request);
      })
    );
  }
});
