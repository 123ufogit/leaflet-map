/* ============================================================
   service-worker.js — オフラインキャッシュ
   ============================================================ */

const CACHE_NAME = "forest-cache-v1";

const ASSETS = [
  "/",
  "/treebrowse.html",
  "/style.css",
  "/treeplot.js",
  "/treestat.js",
  "/tree-edit.js",
  "/tree-db.js",
  "/sync.js",
  "/manifest.json",

  // データ類（必要に応じて追加）
  "/data/mesh20.geojson",
  "/data/TLS_area.geojson"
];

// インストール（キャッシュ登録）
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// オフライン対応（キャッシュ優先）
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request);
    })
  );
});
