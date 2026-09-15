'use client';

import React from 'react';
import {
  getNativePlatform,
  getNativePlugin,
  isNativeHriveApp,
  type HriveNativeApi,
  type NativeMobileStatus,
} from '@/lib/native-mobile';
import {
  routeNativeUrl,
  type AppPlugin,
  type AppStateChange,
  type AppUrlOpen,
  type BiometricPlugin,
  type BrowserPlugin,
  type CameraPlugin,
  type DevicePlugin,
  type FilesystemPlugin,
  type HapticsPlugin,
  type ListenerHandle,
  type LocalNotificationsPlugin,
  type NetworkPlugin,
  type OfflineRequest,
  type PushAction,
  type PushPlugin,
  type PushRegistration,
  type SecureStoragePlugin,
  type SharePlugin,
  type SplashPlugin,
  type StatusBarPlugin,
} from './native-mobile-runtime-support';

const OFFLINE_QUEUE_KEY = 'native_offline_queue_v1';
const BIOMETRIC_LOCK_KEY = 'native_biometric_lock';
const SECURE_PREFIX = 'hrive_';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const listeners: ListenerHandle[] = [];
let installed = false;
let nativeConnected = true;
let nativeConnectionType = 'unknown';
let pushPermission = 'prompt';
let pushRegistered = false;
let backgroundedAt = 0;
let originalFetch: typeof window.fetch | null = null;

const secureStorage = () => getNativePlugin<SecureStoragePlugin>('SecureStorage');

async function secureGet<T>(key: string, fallback: T): Promise<T> {
  const plugin = secureStorage();
  if (!plugin) {
    try {
      const raw = window.localStorage.getItem(`${SECURE_PREFIX}${key}`);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }
  try {
    const result = await plugin.internalGetItem({ prefixedKey: `${SECURE_PREFIX}${key}`, sync: false });
    return result.data ? JSON.parse(result.data) as T : fallback;
  } catch {
    return fallback;
  }
}

async function secureSet(key: string, value: unknown): Promise<void> {
  const plugin = secureStorage();
  const data = JSON.stringify(value);
  if (!plugin) {
    window.localStorage.setItem(`${SECURE_PREFIX}${key}`, data);
    return;
  }
  await plugin.internalSetItem({
    prefixedKey: `${SECURE_PREFIX}${key}`,
    data,
    sync: false,
    access: 0,
  });
}

async function readQueue(): Promise<OfflineRequest[]> {
  return secureGet<OfflineRequest[]>(OFFLINE_QUEUE_KEY, []);
}

async function writeQueue(queue: OfflineRequest[]): Promise<void> {
  await secureSet(OFFLINE_QUEUE_KEY, queue.slice(-100));
  dispatchStatusChanged();
}

function dispatchStatusChanged(): void {
  window.dispatchEvent(new CustomEvent('hrive-native-status-changed'));
}

async function requestBodyText(input: RequestInfo | URL, init?: RequestInit): Promise<string | null> {
  if (typeof init?.body === 'string') return init.body;
  if (input instanceof Request) {
    try {
      return await input.clone().text();
    } catch {
      return null;
    }
  }
  return null;
}

function requestHeaders(input: RequestInfo | URL, init?: RequestInit): Record<string, string> {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (!['cookie', 'authorization'].includes(key.toLowerCase())) result[key] = value;
  });
  return result;
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof Request) return new URL(input.url, window.location.origin);
  return new URL(input.toString(), window.location.origin);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function canQueueMutation(url: URL, method: string, body: string | null): boolean {
  return url.origin === window.location.origin
    && url.pathname.startsWith('/api/')
    && !url.pathname.startsWith('/api/auth')
    && !url.pathname.startsWith('/api/mobile/devices')
    && MUTATION_METHODS.has(method)
    && body !== null;
}

async function queueOfflineMutation(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  if (nativeConnected) return null;
  const url = requestUrl(input);
  const method = requestMethod(input, init);
  const body = await requestBodyText(input, init);
  if (!canQueueMutation(url, method, body)) return null;

  const queue = await readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: `${url.pathname}${url.search}`,
    method,
    headers: requestHeaders(input, init),
    body,
    createdAt: new Date().toISOString(),
  });
  await writeQueue(queue);

  return new Response(JSON.stringify({ queued: true, offline: true }), {
    status: 202,
    headers: {
      'content-type': 'application/json',
      'x-hrive-offline-queued': '1',
    },
  });
}

async function flushOfflineQueue(): Promise<number> {
  if (!nativeConnected || !originalFetch) return 0;
  const queue = await readQueue();
  if (!queue.length) return 0;

  const remaining: OfflineRequest[] = [];
  let completed = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    try {
      const response = await originalFetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: 'same-origin',
      });
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        completed += 1;
      } else {
        remaining.push(item, ...queue.slice(index + 1));
        break;
      }
    } catch {
      remaining.push(item, ...queue.slice(index + 1));
      break;
    }
  }
  await writeQueue(remaining);
  return completed;
}

function installOfflineFetchQueue(): void {
  if (originalFetch) return;
  originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const queued = await queueOfflineMutation(input, init);
    if (queued) return queued;
    return originalFetch!(input, init);
  };
}

async function authenticate(reason = 'Unlock Hrive employee self service'): Promise<boolean> {
  const biometric = getNativePlugin<BiometricPlugin>('BiometricAuthNative');
  if (!biometric) return false;
  try {
    const availability = await biometric.checkBiometry();
    if (!availability.isAvailable && !availability.deviceIsSecure) return false;
    await biometric.internalAuthenticate({
      reason,
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use passcode',
      androidTitle: 'Unlock Hrive',
      androidSubtitle: 'Confirm your identity to continue',
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}

async function setBiometricLock(enabled: boolean): Promise<boolean> {
  if (enabled) {
    const ok = await authenticate('Confirm your identity to enable biometric lock');
    if (!ok) return false;
  }
  await secureSet(BIOMETRIC_LOCK_KEY, enabled);
  dispatchStatusChanged();
  return enabled;
}

async function registerDeviceToken(token: string): Promise<void> {
  if (!originalFetch || !token) return;
  const device = getNativePlugin<DevicePlugin>('Device');
  const app = getNativePlugin<AppPlugin>('App');
  const [deviceId, deviceInfo, appInfo] = await Promise.all([
    device?.getId().catch(() => ({ identifier: 'unknown' })) ?? Promise.resolve({ identifier: 'unknown' }),
    device?.getInfo().catch(() => ({})) ?? Promise.resolve({}),
    app?.getInfo().catch(() => ({})) ?? Promise.resolve<{ version?: string; build?: string }>({}),
  ]);
  const response = await originalFetch('/api/mobile/devices', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token,
      platform: getNativePlatform(),
      deviceId: deviceId.identifier,
      appVersion: appInfo.version,
      build: appInfo.build,
      device: deviceInfo,
    }),
  });
  pushRegistered = response.ok;
  dispatchStatusChanged();
}

async function ensureAndroidPushChannel(push: PushPlugin): Promise<void> {
  if (getNativePlatform() !== 'android' || !push.createChannel) return;
  await push.createChannel({
    id: 'hrive_general',
    name: 'Hrive notifications',
    description: 'Employee self-service alerts and workflow updates',
    importance: 4,
    visibility: 1,
    sound: 'default',
  }).catch(() => undefined);
}

async function requestPushPermission(): Promise<string> {
  const push = getNativePlugin<PushPlugin>('PushNotifications');
  if (!push) return 'unavailable';
  await ensureAndroidPushChannel(push);
  let permission = await push.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await push.requestPermissions();
  }
  pushPermission = permission.receive;
  if (permission.receive === 'granted') await push.register();
  dispatchStatusChanged();
  return permission.receive;
}

async function getStatus(): Promise<NativeMobileStatus> {
  const queue = await readQueue();
  const biometric = getNativePlugin<BiometricPlugin>('BiometricAuthNative');
  const app = getNativePlugin<AppPlugin>('App');
  const availability = await biometric?.checkBiometry().catch(() => null) ?? null;
  const biometricEnabled = await secureGet<boolean>(BIOMETRIC_LOCK_KEY, false);
  const appInfo = await app?.getInfo().catch(() => ({})) ?? {};
  return {
    isNative: isNativeHriveApp(),
    platform: getNativePlatform(),
    connected: nativeConnected,
    connectionType: nativeConnectionType,
    pushPermission,
    pushRegistered,
    biometricAvailable: Boolean(availability?.isAvailable || availability?.deviceIsSecure),
    biometricEnabled,
    offlineQueueCount: queue.length,
    appVersion: appInfo.version,
    build: appInfo.build,
  };
}

function buildNativeApi(): HriveNativeApi {
  return {
    isNative: isNativeHriveApp,
    platform: getNativePlatform,
    getStatus,
    requestPushPermission,
    enableBiometricLock: setBiometricLock,
    authenticate,
    pickPhoto: async () => {
      const camera = getNativePlugin<CameraPlugin>('Camera');
      if (!camera) return null;
      try {
        return await camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: 'uri',
          source: 'PROMPT',
          correctOrientation: true,
        });
      } catch {
        return null;
      }
    },
    saveFile: async (path, base64Data) => {
      const filesystem = getNativePlugin<FilesystemPlugin>('Filesystem');
      if (!filesystem) return null;
      try {
        const result = await filesystem.writeFile({
          path,
          data: base64Data,
          directory: 'DOCUMENTS',
          recursive: true,
        });
        return result.uri ?? null;
      } catch {
        return null;
      }
    },
    share: async (options) => {
      const share = getNativePlugin<SharePlugin>('Share');
      if (!share) return false;
      try {
        await share.share(options);
        return true;
      } catch {
        return false;
      }
    },
    openExternal: async (url) => {
      const browser = getNativePlugin<BrowserPlugin>('Browser');
      if (!browser || !/^https:\/\//i.test(url)) return false;
      try {
        await browser.open({ url });
        return true;
      } catch {
        return false;
      }
    },
    haptic: async (style = 'MEDIUM') => {
      await getNativePlugin<HapticsPlugin>('Haptics')?.impact({ style }).catch(() => undefined);
    },
    scheduleLocalNotification: async (title, body, at) => {
      const notifications = getNativePlugin<LocalNotificationsPlugin>('LocalNotifications');
      if (!notifications) return false;
      let permission = await notifications.checkPermissions();
      if (permission.display === 'prompt') permission = await notifications.requestPermissions();
      if (permission.display !== 'granted') return false;
      await notifications.schedule({
        notifications: [{
          id: Math.max(1, Math.floor(Date.now() % 2147483647)),
          title,
          body,
          schedule: at ? { at: at.toISOString() } : undefined,
        }],
      });
      return true;
    },
    flushOfflineQueue,
  };
}

async function initializeNativeRuntime(): Promise<void> {
  if (installed || !isNativeHriveApp()) return;
  installed = true;
  installOfflineFetchQueue();
  window.HriveNative = buildNativeApi();

  const app = getNativePlugin<AppPlugin>('App');
  const network = getNativePlugin<NetworkPlugin>('Network');
  const push = getNativePlugin<PushPlugin>('PushNotifications');
  const splash = getNativePlugin<SplashPlugin>('SplashScreen');
  const statusBar = getNativePlugin<StatusBarPlugin>('StatusBar');

  const status = await network?.getStatus().catch(() => null) ?? null;
  if (status) {
    nativeConnected = status.connected;
    nativeConnectionType = status.connectionType;
  }

  if (network) {
    listeners.push(await network.addListener<{ connected: boolean; connectionType: string }>(
      'networkStatusChange',
      (event) => {
        nativeConnected = event.connected;
        nativeConnectionType = event.connectionType;
        dispatchStatusChanged();
        if (event.connected) void flushOfflineQueue();
      },
    ));
  }

  if (app) {
    listeners.push(await app.addListener<AppUrlOpen>('appUrlOpen', ({ url }) => {
      if (url) routeNativeUrl(url);
    }));
    listeners.push(await app.addListener<AppStateChange>('appStateChange', ({ isActive }) => {
      if (!isActive) {
        backgroundedAt = Date.now();
        return;
      }
      void flushOfflineQueue();
      if (backgroundedAt && Date.now() - backgroundedAt > 30_000) {
        void secureGet<boolean>(BIOMETRIC_LOCK_KEY, false).then((enabled) => {
          if (enabled) return authenticate();
          return true;
        });
      }
    }));
    if (getNativePlatform() === 'android') {
      listeners.push(await app.addListener<{ canGoBack?: boolean }>('backButton', ({ canGoBack }) => {
        if (canGoBack || window.history.length > 1) window.history.back();
        else void app.exitApp();
      }));
    }
  }

  if (push) {
    await ensureAndroidPushChannel(push);
    const currentPermission = await push.checkPermissions().catch(() => ({ receive: 'prompt' }));
    pushPermission = currentPermission.receive;
    listeners.push(await push.addListener<PushRegistration>('registration', ({ value }) => {
      if (value) void registerDeviceToken(value);
    }));
    listeners.push(await push.addListener<Record<string, unknown>>('registrationError', () => {
      pushRegistered = false;
      dispatchStatusChanged();
    }));
    listeners.push(await push.addListener<PushAction>('pushNotificationActionPerformed', ({ notification }) => {
      const data = notification?.data;
      const destination = typeof data?.url === 'string'
        ? data.url
        : typeof data?.path === 'string' ? data.path : null;
      if (destination) routeNativeUrl(destination);
    }));
    if (pushPermission === 'granted') await push.register().catch(() => undefined);
  }

  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  await statusBar?.setStyle({ style: dark ? 'LIGHT' : 'DARK' }).catch(() => undefined);
  await splash?.hide().catch(() => undefined);
  if (nativeConnected) void flushOfflineQueue();
  dispatchStatusChanged();
}

export function NativeMobileRuntime() {
  React.useEffect(() => {
    void initializeNativeRuntime();
    return () => {
      for (const listener of listeners.splice(0)) void listener.remove();
      if (originalFetch) {
        window.fetch = originalFetch;
        originalFetch = null;
      }
      installed = false;
    };
  }, []);

  return null;
}
