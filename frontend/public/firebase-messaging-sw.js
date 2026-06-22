/**
 * Firebase Cloud Messaging Service Worker
 * Handles notifications when the app is in the background
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: 'WILL_BE_REPLACED_BY_ENVIRONMENT',
  authDomain: 'WILL_BE_REPLACED_BY_ENVIRONMENT',
  projectId: 'WILL_BE_REPLACED_BY_ENVIRONMENT',
  storageBucket: 'WILL_BE_REPLACED_BY_ENVIRONMENT',
  messagingSenderId: 'WILL_BE_REPLACED_BY_ENVIRONMENT',
  appId: 'WILL_BE_REPLACED_BY_ENVIRONMENT',
});

// Handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'PAWPHILE Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: payload.notification?.icon || '/pawphile-icon.png',
    badge: '/pawphile-badge.png',
    tag: 'pawphile-notification',
    data: payload.data,
    requireInteraction: payload.data?.severity === 'critical' ? true : false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Navigate to the app when notification is clicked
  const urlToOpen = '/#/pawnews';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if app is not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
