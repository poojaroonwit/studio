'use client';

import React from 'react';
import {
  BellIcon,
  CloudArrowUpIcon,
  DevicePhoneMobileIcon,
  FingerPrintIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getHriveNativeApi, type NativeMobileStatus } from '@/lib/native-mobile';

const initialStatus: NativeMobileStatus = {
  isNative: false,
  platform: 'web',
  connected: true,
  connectionType: 'unknown',
  pushPermission: 'unavailable',
  pushRegistered: false,
  biometricAvailable: false,
  biometricEnabled: false,
  offlineQueueCount: 0,
};

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 border-b border-border/60 py-4 last:border-b-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function NativeMobileSettingsPage() {
  const [status, setStatus] = React.useState<NativeMobileStatus>(initialStatus);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const api = getHriveNativeApi();
    if (!api) {
      setStatus(initialStatus);
      return;
    }
    setStatus(await api.getStatus());
  }, []);

  React.useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener('hrive-native-status-changed', onChange);
    return () => window.removeEventListener('hrive-native-status-changed', onChange);
  }, [refresh]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const api = getHriveNativeApi();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Employee self service</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Mobile app</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage native security, notifications, connectivity, and offline work on this device.
        </p>
      </header>

      {!status.isNative ? (
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <DevicePhoneMobileIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-medium">Open this page in the Hrive mobile app</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Native security, push notifications, offline queueing, camera, file, and device features are available in the iOS and Android apps.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-border/70 bg-card px-4 shadow-sm sm:px-5">
          <SettingRow
            icon={SignalIcon}
            title="Connection"
            description={`${status.connected ? 'Online' : 'Offline'} · ${status.connectionType}`}
          >
            <span className="text-xs font-medium text-muted-foreground">
              {status.platform === 'ios' ? 'iOS' : 'Android'} {status.appVersion ? `· ${status.appVersion}` : ''}
            </span>
          </SettingRow>

          <SettingRow
            icon={BellIcon}
            title="Push notifications"
            description={status.pushRegistered
              ? 'This device is registered for Hrive alerts.'
              : `Permission: ${status.pushPermission}`}
          >
            <Button
              size="sm"
              variant={status.pushRegistered ? 'secondary' : 'default'}
              disabled={busy || status.pushPermission === 'denied'}
              onClick={() => run(async () => api?.requestPushPermission())}
            >
              {status.pushRegistered ? 'Registered' : 'Enable'}
            </Button>
          </SettingRow>

          <SettingRow
            icon={FingerPrintIcon}
            title="Biometric lock"
            description={status.biometricAvailable
              ? 'Require Face ID, Touch ID, fingerprint, or device credentials after returning to Hrive.'
              : 'Biometric or device credential authentication is not available on this device.'}
          >
            <Switch
              checked={status.biometricEnabled}
              disabled={busy || !status.biometricAvailable}
              onCheckedChange={(enabled) => run(async () => api?.enableBiometricLock(enabled))}
              aria-label="Biometric lock"
            />
          </SettingRow>

          <SettingRow
            icon={CloudArrowUpIcon}
            title="Offline changes"
            description={status.offlineQueueCount
              ? `${status.offlineQueueCount} change${status.offlineQueueCount === 1 ? '' : 's'} waiting to sync securely.`
              : 'No employee self-service changes are waiting to sync.'}
          >
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !status.connected || status.offlineQueueCount === 0}
              onClick={() => run(async () => api?.flushOfflineQueue())}
            >
              Sync now
            </Button>
          </SettingRow>
        </section>
      )}
    </main>
  );
}
