import { useState, useEffect, useRef, useCallback } from 'react';
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

interface UsePushNotificationsReturn extends PushSubscriptionInfo {
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const refresh = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      setSubscribed(false);
      setLoading(false);
      return;
    }
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      registrationRef.current = reg;
      const existingSub = await reg.pushManager.getSubscription();
      setSubscribed(!!existingSub);
    } catch {
      setSubscribed(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribe();
    }
  }, []);

  const subscribe = useCallback(async () => {
    try {
      setLoading(true);
      const vapidRes = await api.get<{ publicKey: string }>('/notificacoes/vapid-public-key');
      const publicKey = vapidRes.data.publicKey;

      let reg = registrationRef.current;
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
        registrationRef.current = reg;
      }

      const sub = await reg.pushManager.subscribe({
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
    } catch {
      // subscription failed
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      setLoading(true);
      const reg = registrationRef.current;
      if (reg) {
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          await api.delete('/notificacoes/unsubscribe', { data: { endpoint: existingSub.endpoint } });
          await existingSub.unsubscribe();
        }
      }
      setSubscribed(false);
    } catch {
      // unsubscribe failed
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, subscribed, loading, requestPermission, subscribe, unsubscribe, refresh };
}

export default usePushNotifications;