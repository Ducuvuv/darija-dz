/* Darija DZ — offline shell + corpus */
var CACHE = "darija-dz-v8";
var ASSETS = [
  "./",
  "./index.html",
  "./flashcards.html",
  "./qcm-player.html",
  "./deck.html",
  "./suivi.html",
  "./phrases.html",
  "./verbes.html",
  "./paires.html",
  "./culture.html",
  "./cours.html",
  "./cours-module.html",
  "./styles.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./data/cards.js",
  "./data/pairs.js",
  "./data/culture.js",
  "./data/cours.js",
  "./js/engine.js",
  "./js/store.js",
  "./js/flash-srs.js",
  "./js/flash-player.js",
  "./js/today-target.js",
  "./js/shell-tabbar.js",
  "./js/hub.js",
  "./js/suivi.js",
  "./js/deck.js",
  "./js/qcm.js",
  "./js/qcm-bank.js",
  "./js/qcm-player.js",
  "./js/phrases.js",
  "./js/verbes.js",
  "./js/tts.js",
  "./js/paires.js",
  "./js/culture.js",
  "./js/cours.js",
  "./js/cours-module.js",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.addAll(ASSETS);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request)
        .then(function (res) {
          if (res && res.ok && url.protocol.startsWith("http")) {
            var copy = res.clone();
            caches.open(CACHE).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return cached;
        });
      return cached || network;
    })
  );
});
