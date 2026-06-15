// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDDmNAnEIGOsScRJiCQKSfY-DDHu5gKYb8",
  authDomain: "gipfel-lodge.firebaseapp.com",
  projectId: "gipfel-lodge",
  storageBucket: "gipfel-lodge.firebasestorage.app",
  messagingSenderId: "388067449391",
  appId: "1:388067449391:web:687304a8403e3d79aa84da"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/site_manifest/favicon_admin/apple-touch-icon.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
