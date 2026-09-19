const CACHE = "tku-timetable-v17";
const SHARE_CACHE = "tku-timetable-share-v17";
const BASE = "/TKUTimeTable/";
const SHARE_KEY = BASE + "__share_inbox__";

const ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "style.css",
  BASE + "app.js",
  BASE + "manifest.json",
  BASE + "capture.html",
  BASE + "share.html",
  BASE + "tool.html",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![CACHE, SHARE_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function storeShareRequest(request) {
  const form = await request.formData();

  const title = form.get("title");
  const text = form.get("text");
  const url = form.get("url");

  let file = null;

  for (const [key, value] of form.entries()) {
    if (value instanceof File && value.size > 0) {
      file = {
        field: key,
        name: value.name,
        type: value.type,
        size: value.size,
        text: await value.text()
      };
      break;
    }
  }

  const payload = {
    type: "TKU_TIMETABLE_SHARE",
    version: 2,
    receivedAt: new Date().toISOString(),
    title: typeof title === "string" ? title : "",
    text: typeof text === "string" ? text : "",
    url: typeof url === "string" ? url : "",
    file
  };

  const cache = await caches.open(SHARE_CACHE);

  await cache.put(
    new Request(SHARE_KEY),
    new Response(JSON.stringify(payload), {
      headers: {"Content-Type": "application/json"}
    })
  );

  return Response.redirect(BASE + "share.html?received=1", 303);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // PWA Share Target POST.
  if (
    request.method === "POST" &&
    url.pathname === BASE + "share.html"
  ) {
    event.respondWith(storeShareRequest(request));
    return;
  }

  // Optional diagnostic endpoint for the share inbox.
  if (
    request.method === "GET" &&
    url.pathname === SHARE_KEY
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(SHARE_CACHE);
      const hit = await cache.match(new Request(SHARE_KEY));
      return hit || new Response("", {status: 204});
    })());
    return;
  }

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE)
            .then(cache => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      }))
      .catch(() => caches.match(BASE + "index.html"))
  );
});
