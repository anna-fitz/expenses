// The old app cached itself as "shared-expenses-v1" … "v6". Once this app's service worker takes over, remove them.
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("shared-expenses-v")).map((k) => caches.delete(k)))));
});
