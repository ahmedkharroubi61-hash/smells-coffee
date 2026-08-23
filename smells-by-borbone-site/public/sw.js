/* SmellS by Borbone — service worker.
   Its whole job is Web Push: show the "order ready" notification even when the
   installed app (Add to Home Screen) is backgrounded or the phone is locked. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "SmellS by Borbone ☕";
  const body = data.body || "Votre commande est prête !";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      vibrate: [800, 200, 800, 200, 800],
      tag: "sb-order-" + (data.ref || "ready"),
      renotify: true,
      data: { url: "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
