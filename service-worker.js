const CACHE_NAME = "timetable-v1";

// Offline ishlashi uchun (statik fayllar)
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./test.js",
  "./manifest.json"
];

// Install: app shell cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: eski cachelarni tozalash
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch strategiya:
// 1) Google Sheets CSV → Network first, fallback cache
// 2) App shell → Cache first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Google Sheets CSV (pub?output=csv...) yoki docs.google.com
  const isSheets =
    url.hostname.includes("google.com") &&
    (url.pathname.includes("/pub") || url.pathname.includes("/spreadsheets"));

  if (isSheets) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response("Offline. Ma'lumot topilmadi.", { status: 503 });
  }
}
