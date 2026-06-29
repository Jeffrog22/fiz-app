self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Fiz! App', body: 'Hora de registrar a chamada!' };
  }

  const options = {
    body: data.body || 'Hora de registrar a chamada!',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.data?.url || '/chamadas' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Fiz! App', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/chamadas';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(url));
      if (existing) {
        existing.focus();
      } else {
        clients.openWindow(url);
      }
    })
  );
});
