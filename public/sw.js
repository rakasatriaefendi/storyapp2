const CACHE_NAME = 'storyapp-shell-v1';
const DATA_CACHE = 'storyapp-data-v1';
const OUTBOX_STORE = 'outbox-requests-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/offline.html',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png',
  '/screenshots/screenshoot-dashboard.png',
  '/screenshots/screenshoot-upload.png',
  '/screenshots/screenshoot-dekstop.png',
];

// IndexedDB
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('storyapp-outbox', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function addOutbox(item) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).add(item);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function getAllOutbox() {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(OUTBOX_STORE, 'readonly');
    const req = tx.objectStore(OUTBOX_STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}
async function deleteOutbox(id) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(OUTBOX_STORE, 'readwrite');
    tx.objectStore(OUTBOX_STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// Utility functions for push notifications
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// INSTALL
self.addEventListener('install', (evt) => {
  console.log('Service Worker installed');
  evt.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(FILES_TO_CACHE);
        console.log('All files cached successfully');
      } catch (error) {
        console.warn('Some files failed to cache, but continuing:', error);
        // Continue even if some files fail to cache
      }
      return self.skipWaiting();
    })
  );
});

// ACTIVATE
self.addEventListener('activate', (evt) => {
  console.log('Service Worker activated');
  evt.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME && k !== DATA_CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// FETCH: cache-first for shell, network-first for API
self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);

  // network-first for API (dicoding)
  if (url.origin === 'https://story-api.dicoding.dev') {
    evt.respondWith(
      caches.open(DATA_CACHE).then(async cache => {
        try {
          const resp = await fetch(evt.request);
          if (evt.request.method === 'GET' && resp && resp.ok) cache.put(evt.request, resp.clone());
          return resp;
        } catch (err) {
          const cached = await cache.match(evt.request);
          return cached || new Response(JSON.stringify({ error: true, message: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  // navigation & assets => cache first then network
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;

      return fetch(evt.request).catch(async () => {
        if (evt.request.mode === 'navigate' || (evt.request.headers.get('accept')?.includes('text/html'))) {
          // For SPA, serve index.html for all routes so app can load offline
          return caches.match('/index.html') || caches.match('/offline.html');
        }
        return new Response('', { status: 404 });
      });
    })
  );
});

// PUSH: support JSON payload or plain text
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'Story App';
  const options = {
    body: payload.body || 'Ada pembaruan cerita baru.',
    icon: payload.icon || '/icons/android-chrome-192x192.png',
    badge: payload.badge || '/icons/android-chrome-192x192.png',
    data: payload.url || '/#/',
    actions: payload.actions || [{ action: 'open', title: 'Lihat' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// notificationclick: membuka tab yang sesuai
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
      return null;
    })
  );
});

// message: menerima perintah dari page (QUEUE_OFFLINE_STORY, STORY_SUCCESS, SUBSCRIBE_PUSH, UNSUBSCRIBE_PUSH)
self.addEventListener('message', (evt) => {
  const { type, payload } = evt.data || {};
  if (type === 'QUEUE_OFFLINE_STORY') {
    addOutbox(payload).catch(e => console.error('addOutbox failed', e));
  }
  if (type === 'SYNC_OUTBOX') {
    evt.waitUntil(syncOutbox());
  }
  if (type === 'STORY_SUCCESS') {
    // Show success notification
    const title = 'Story berhasil dibuat';
    const options = {
      body: `Anda telah membuat story baru dengan deskripsi: ${payload.description}`,
      icon: '/icons/android-chrome-192x192.png',
      badge: '/icons/android-chrome-192x192.png',
      tag: 'story-success'
    };
    self.registration.showNotification(title, options);
  }
  if (type === 'SUBSCRIBE_PUSH') {
    evt.waitUntil(subscribePush(payload));
  }
  if (type === 'UNSUBSCRIBE_PUSH') {
    evt.waitUntil(unsubscribePush(payload));
  }
});

// mencoba sync outbox
async function syncOutbox() {
  const items = await getAllOutbox();
  for (const it of items) {
    try {
      // recreate FormData
      const fd = new FormData();
      if (it.description) fd.append('description', it.description);
      if (it.lat) fd.append('lat', it.lat);
      if (it.lon) fd.append('lon', it.lon);
      if (it.photoBlob && it.photoBlob.dataUrl) {
        // convert dataUrl back to blob
        const resp = await fetch(it.photoBlob.dataUrl);
        const blob = await resp.blob();
        fd.append('photo', new File([blob], it.photoBlob.name || 'photo.png', { type: it.photoBlob.type || blob.type }));
      }

      // send to API (no auth header here — server must accept or you must include token in item)
      await fetch('https://story-api.dicoding.dev/v1/stories', { method: 'POST', body: fd });
      await deleteOutbox(it.id);
    } catch (err) {
      console.warn('syncOutbox item failed, will retry later', err);
    }
  }
}

// background sync (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'story-sync') event.waitUntil(syncOutbox());
});

// Push notification subscription functions
async function subscribePush(payload) {
  try {
    const { token, vapidKey } = payload;
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const subscriptionPayload = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
      },
    };

    const res = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!res.ok) {
      throw new Error(`Subscribe failed: ${res.status}`);
    }

    // Send success message back to client
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PUSH_SUBSCRIBE_SUCCESS' });
      });
    });
  } catch (err) {
    console.error('Push subscribe failed:', err);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PUSH_SUBSCRIBE_ERROR', error: err.message });
      });
    });
  }
}

async function unsubscribePush(payload) {
  try {
    const { token } = payload;
    const subscription = await self.registration.pushManager.getSubscription();
    if (!subscription) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'PUSH_UNSUBSCRIBE_SUCCESS' });
        });
      });
      return;
    }

    const endpoint = subscription.endpoint;
    const res = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint }),
    });

    if (!res.ok) {
      throw new Error(`Unsubscribe failed: ${res.status}`);
    }

    await subscription.unsubscribe();

    // Send success message back to client
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PUSH_UNSUBSCRIBE_SUCCESS' });
      });
    });
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PUSH_UNSUBSCRIBE_ERROR', error: err.message });
      });
    });
  }
}
