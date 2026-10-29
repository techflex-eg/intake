// TechFlex - sw.js (service worker of the Leads screen)
// It does three small jobs: (1) it takes the photos that WhatsApp shares to the app (GitHub Pages cannot take a POST, so this file does),
// (2) it shows a push notification, (3) it opens the app on the Leads tab when the notification is tapped.
// It keeps NO copy of the page, so a new index.html is always the one that opens.
var SHARE_CACHE = 'tf-share';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'POST') return;
  var url = new URL(req.url);
  if (!/\/share-target$/.test(url.pathname)) return;
  e.respondWith((async function () {
    try {
      var form = await req.formData();
      var files = form.getAll('photos').filter(function (f) { return f && typeof f === 'object' && f.size > 0; });
      await caches.delete(SHARE_CACHE);
      var cache = await caches.open(SHARE_CACHE);
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        await cache.put(new Request(self.registration.scope + 'shared/' + ('0' + i).slice(-2)), new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg', 'x-name': f.name || ('photo' + (i + 1) + '.jpg') } }));
      }
    } catch (err) { }
    return Response.redirect(self.registration.scope + '?shared=1', 303);
  })());
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { try { d = { body: e.data.text() }; } catch (err2) { } }
  e.waitUntil(self.registration.showNotification(d.title || 'TechFlex', { body: d.body || '', icon: 'icon-192.png', tag: 'tf-leads' }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ('focus' in list[i]) { list[i].postMessage({ type: 'open-leads' }); return list[i].focus(); }
    }
    return self.clients.openWindow(self.registration.scope + '?tab=leads');
  }));
});
