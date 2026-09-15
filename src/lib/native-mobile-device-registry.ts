import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';

export const NATIVE_DEVICE_MODEL_TYPE = 'native_mobile_device';

export interface NativeMobileDeviceRecord {
  platform: 'ios' | 'android';
  token: string;
  deviceId: string;
  appVersion?: string;
  build?: string;
  device?: Record<string, unknown>;
  updatedAt: string;
}

function keyFor(platform: string, token: string): string {
  const hash = createHash('sha256').update(`${platform}:${token}`).digest('hex');
  return `${platform}:${hash.slice(0, 48)}`;
}

function parseDevice(value: string): NativeMobileDeviceRecord | null {
  try {
    const parsed = JSON.parse(value) as NativeMobileDeviceRecord;
    if (!parsed.token || !['ios', 'android'].includes(parsed.platform)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function upsertNativeMobileDevice(
  userId: string,
  device: NativeMobileDeviceRecord,
): Promise<void> {
  const attributeKey = keyFor(device.platform, device.token);
  await prisma.userUIDisplayPreference.upsert({
    where: {
      userId_modelType_attributeKey: {
        userId,
        modelType: NATIVE_DEVICE_MODEL_TYPE,
        attributeKey,
      },
    },
    update: {
      uiPreference: JSON.stringify(device),
      updatedAt: new Date(),
    },
    create: {
      userId,
      modelType: NATIVE_DEVICE_MODEL_TYPE,
      attributeKey,
      uiPreference: JSON.stringify(device),
    },
  });
}

export async function listNativeMobileDevices(userId: string): Promise<NativeMobileDeviceRecord[]> {
  const rows = await prisma.userUIDisplayPreference.findMany({
    where: { userId, modelType: NATIVE_DEVICE_MODEL_TYPE },
    select: { uiPreference: true },
  });
  return rows.map((row) => parseDevice(row.uiPreference)).filter((row): row is NativeMobileDeviceRecord => Boolean(row));
}

export async function removeNativeMobileDevice(userId: string, platform: string, token: string): Promise<void> {
  await prisma.userUIDisplayPreference.deleteMany({
    where: {
      userId,
      modelType: NATIVE_DEVICE_MODEL_TYPE,
      attributeKey: keyFor(platform, token),
    },
  });
}

export async function removeNativeMobileDeviceByToken(userId: string, token: string): Promise<void> {
  const devices = await listNativeMobileDevices(userId);
  const matching = devices.find((device) => device.token === token);
  if (matching) await removeNativeMobileDevice(userId, matching.platform, token);
}
