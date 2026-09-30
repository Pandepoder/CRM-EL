/*
 * Service worker de los avisos de la agenda.
 *
 * Solo muestra notificaciones y abre la actividad al tocarlas. No intercepta peticiones ni guarda
 * nada en caché: la aplicación carga exactamente igual que sin él. Existe porque Chrome en Android
 * no deja crear notificaciones desde la página (`new Notification` lanza «Illegal constructor») y
 * exige mostrarlas desde un service worker.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/equipo";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ("focus" in ventana && "navigate" in ventana) {
          return ventana.focus().then(() => ventana.navigate(destino));
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
