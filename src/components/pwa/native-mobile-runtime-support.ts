export type ListenerHandle = { remove: () => Promise<void> | void };
export type ListenerCallback<T> = (event: T) => void;

export type AppPlugin = {
  addListener: <T>(eventName: string, callback: ListenerCallback<T>) => Promise<ListenerHandle>;
  getInfo: () => Promise<{ version?: string; build?: string }>;
  exitApp: () => Promise<void>;
};

export type NetworkPlugin = {
  getStatus: () => Promise<{ connected: boolean; connectionType: string }>;
  addListener: <T>(eventName: string, callback: ListenerCallback<T>) => Promise<ListenerHandle>;
};

export type PushPlugin = {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  createChannel?: (options: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
    visibility?: number;
    sound?: string;
  }) => Promise<void>;
  addListener: <T>(eventName: string, callback: ListenerCallback<T>) => Promise<ListenerHandle>;
};

export type DevicePlugin = {
  getId: () => Promise<{ identifier: string }>;
  getInfo: () => Promise<Record<string, unknown>>;
};

export type SplashPlugin = { hide: () => Promise<void> };
export type StatusBarPlugin = { setStyle: (options: { style: string }) => Promise<void> };
export type HapticsPlugin = { impact: (options: { style: string }) => Promise<void> };
export type CameraPlugin = { getPhoto: (options: Record<string, unknown>) => Promise<import('@/lib/native-mobile').NativePhotoResult> };
export type FilesystemPlugin = { writeFile: (options: Record<string, unknown>) => Promise<{ uri?: string }> };
export type SharePlugin = { share: (options: Record<string, unknown>) => Promise<unknown> };
export type BrowserPlugin = { open: (options: { url: string }) => Promise<void> };
export type LocalNotificationsPlugin = {
  checkPermissions: () => Promise<{ display: string }>;
  requestPermissions: () => Promise<{ display: string }>;
  schedule: (options: Record<string, unknown>) => Promise<void>;
};
export type SecureStoragePlugin = {
  internalGetItem: (options: { prefixedKey: string; sync: boolean }) => Promise<{ data: string | null }>;
  internalSetItem: (options: {
    prefixedKey: string;
    data: string;
    sync: boolean;
    access: number;
  }) => Promise<void>;
};
export type BiometricPlugin = {
  checkBiometry: () => Promise<{
    isAvailable?: boolean;
    deviceIsSecure?: boolean;
    biometryType?: string | number;
  }>;
  internalAuthenticate: (options: Record<string, unknown>) => Promise<void>;
};

export type OfflineRequest = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  createdAt: string;
};

export type PushRegistration = { value?: string };
export type PushAction = { notification?: { data?: Record<string, unknown> } };
export type AppUrlOpen = { url?: string };
export type AppStateChange = { isActive?: boolean };

export function routeNativeUrl(rawUrl: string): void {
  try {
    const url = new URL(rawUrl, window.location.origin);
    let destination = url.pathname + url.search + url.hash;
    if (url.protocol === 'hrive:') {
      const hostPath = url.hostname ? `/${url.hostname}` : '';
      destination = `${hostPath}${url.pathname}${url.search}${url.hash}`;
    }
    if (
      destination.startsWith('/ess')
      || destination.startsWith('/employee-portal')
      || destination.startsWith('/my-workday')
    ) {
      window.location.assign(destination);
    }
  } catch {
    // Ignore malformed external payloads rather than navigating the WebView.
  }
}
