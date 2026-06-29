import { useState, useEffect } from 'react';
import api from '../utils/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

interface PushSubscriptionInfo {
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  loading: boolean;
}

export function usePushNotifications(): PushSubscriptionInfo {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPermission('unsupported');
        setLoading(false);
        return;
      }

      setPermission(Notification.permission);

      try {
        const vapidRes = await api.get<{ publicKey: string }>('/notificacoes/vapid-public-key');
        const publicKey = vapidRes.data.publicKey;

        const registration = await navigator.serviceWorker.register('/sw.js');

        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setSubscribed(true);
          if (!cancelled) setLoading(false);
          return;
        }

        if (Notification.permission === 'granted') {
          const sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
          });

          await api.post('/notificacoes/subscribe', {
            endpoint: sub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
            },
          });

          setSubscribed(true);
        }
      } catch {
        // Permission denied or API error
      }

      if (!cancelled) setLoading(false);
    }

    init();

    return () => { cancelled = true; };
  }, []);

  return { permission, subscribed, loading };
}

export default usePushNotifications;
