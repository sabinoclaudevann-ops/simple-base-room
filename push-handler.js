/* Handler de Web Push do Q+Gestão (importado pelo service worker gerado). */
/* eslint-disable no-undef */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Q+Gestão", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Q+Gestão";
  const options = {
    body: payload.body || "Você tem parcelas a receber.",
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: payload.tag || "qgestao-vencimentos",
    renotify: true,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
