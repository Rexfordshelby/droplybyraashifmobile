import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

type NotificationPayload = {
  title: string;
  body: string;
  tag?: string;
  route?: string;
  orderId?: string | null;
};

type NotificationActionExtra = {
  route?: unknown;
  orderId?: unknown;
};

export function isNativeAndroidApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function stableNotificationId(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || Math.floor(Date.now() % 0x7fffffff);
}

export async function requestNativeNotificationPermission() {
  if (!isNativeAndroidApp()) return false;

  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

export async function showNativeNotification(payload: NotificationPayload) {
  if (!isNativeAndroidApp()) return false;

  const hasPermission = await requestNativeNotificationPermission();
  if (!hasPermission) return false;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: stableNotificationId(payload.tag || `${payload.title}:${payload.body}`),
        title: payload.title,
        body: payload.body,
        schedule: { at: new Date(Date.now() + 100) },
        extra: {
          route: payload.route || '/notifications',
          orderId: payload.orderId || null,
        },
      },
    ],
  });

  return true;
}

export async function addNativeNotificationActionListener(
  onAction: (extra: NotificationActionExtra) => void,
): Promise<PluginListenerHandle | null> {
  if (!isNativeAndroidApp()) return null;

  return LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    onAction((event.notification.extra || {}) as NotificationActionExtra);
  });
}
