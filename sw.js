// Service worker : fonctionnement hors connexion + réception des notifications (Firebase Cloud Messaging)
// Pense à augmenter VERSION à chaque mise à jour de l'appli pour que les téléphones la récupèrent.
const VERSION = "taguage-v3";
const SDK = "https://www.gstatic.com/firebasejs/10.14.1/";

importScripts("firebase-config.js");
importScripts(SDK + "firebase-app-compat.js", SDK + "firebase-messaging-compat.js");

// Notifications en arrière-plan : le SDK affiche lui-même la notification envoyée par la fonction
if (self.FIREBASE_CONFIG && !String(self.FIREBASE_CONFIG.firebase.apiKey).startsWith("A_REMPLACER")) {
  firebase.initializeApp(self.FIREBASE_CONFIG.firebase);
  firebase.messaging();
}

const SHELL = [
  "./", "index.html", "tuto.html", "competition.js", "manifest.webmanifest", "firebase-config.js", "calendrier.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fichiers de l'appli : réseau d'abord (pour avoir la dernière version), cache si hors connexion
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // Librairies (Firebase, lecture Excel) et polices : cache d'abord (elles ne changent pas)
  if (url.host === "www.gstatic.com" || url.host === "cdnjs.cloudflare.com" || url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
      )
    );
  }
  // Tout le reste (base de données Firebase) passe directement : Firestore gère son propre hors-ligne.
});
