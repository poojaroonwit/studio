export type NativePlatform = 'ios' | 'android' | 'web';

export interface NativeMobileStatus {
  isNative: boolean;
  platform: NativePlatform;
  connected: boolean;
  connectionType: string;
  pushPermission: string;
  pushRegistered: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  offlineQueueCount: number;
  appVersion?: string;
  build?: string;
}

export interface NativePhotoResult {
  webPath?: string;
  path?: string;
  base64String?: string;
  format?: string;
}

export interface HriveNativeApi {
  isNative: () => boolean;
  platform: () => NativePlatform;
  getStatus: () => Promise<NativeMobileStatus>;
  requestPushPermission: () => Promise<string>;
  enableBiometricLock: (enabled: boolean) => Promise<boolean>;
  authenticate: (reason?: string) => Promise<boolean>;
  pickPhoto: () => Promise<NativePhotoResult | null>;
  saveFile: (path: string, base64Data: string) => Promise<string | null>;
  share: (options: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<boolean>;
  openExternal: (url: string) => Promise<boolean>;
  haptic: (style?: 'LIGHT' | 'MEDIUM' | 'HEAVY') => Promise<void>;
  scheduleLocalNotification: (title: string, body: string, at?: Date) => Promise<boolean>;
  flushOfflineQueue: () => Promise<number>;
}

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  isPluginAvailable?: (name: string) => boolean;
  registerPlugin?: <T extends object>(name: string) => T;
}

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
    HriveNative?: HriveNativeApi;
  }
}

export function getCapacitorBridge(): CapacitorBridge | null {
  if (typeof window === 'undefined') return null;
  return window.Capacitor ?? null;
}

export function isNativeHriveApp(): boolean {
  const bridge = getCapacitorBridge();
  return Boolean(bridge?.isNativePlatform?.());
}

export function getNativePlatform(): NativePlatform {
  const platform = getCapacitorBridge()?.getPlatform?.();
  if (platform === 'ios' || platform === 'android') return platform;
  return 'web';
}

export function getNativePlugin<T extends object>(name: string): T | null {
  const bridge = getCapacitorBridge();
  if (!bridge?.registerPlugin || !bridge.isNativePlatform?.()) return null;
  if (bridge.isPluginAvailable && !bridge.isPluginAvailable(name)) return null;
  try {
    return bridge.registerPlugin<T>(name);
  } catch {
    return null;
  }
}

export function getHriveNativeApi(): HriveNativeApi | null {
  if (typeof window === 'undefined') return null;
  return window.HriveNative ?? null;
}
