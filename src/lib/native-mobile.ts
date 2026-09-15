export const HRIVE_NATIVE_USER_AGENT_TOKEN = 'HriveNative/';
export const HRIVE_NATIVE_STORAGE_KEY = 'hrive-native-app';

export function isHriveNativeUserAgent(userAgent: string): boolean {
  return userAgent.includes(HRIVE_NATIVE_USER_AGENT_TOKEN);
}

export function isHriveNativeClient(): boolean {
  if (typeof window === 'undefined') return false;

  if (isHriveNativeUserAgent(window.navigator.userAgent)) {
    return true;
  }

  try {
    return window.localStorage.getItem(HRIVE_NATIVE_STORAGE_KEY) === '1'
      || window.sessionStorage.getItem(HRIVE_NATIVE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
