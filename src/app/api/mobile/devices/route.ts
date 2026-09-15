import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  listNativeMobileDevices,
  removeNativeMobileDevice,
  upsertNativeMobileDevice,
  type NativeMobileDeviceRecord,
} from '@/lib/native-mobile-device-registry';

export const dynamic = 'force-dynamic';

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function validPlatform(value: unknown): value is 'ios' | 'android' {
  return value === 'ios' || value === 'android';
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const devices = await listNativeMobileDevices(userId);
  return NextResponse.json({
    devices: devices.map((device) => ({
      platform: device.platform,
      deviceId: device.deviceId,
      appVersion: device.appVersion,
      build: device.build,
      updatedAt: device.updatedAt,
      tokenSuffix: device.token.slice(-8),
    })),
  });
}

export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const platform = body.platform;
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 255) : 'unknown';
  if (!token || token.length > 8192 || !validPlatform(platform)) {
    return NextResponse.json({ error: 'Invalid mobile device registration' }, { status: 400 });
  }

  const record: NativeMobileDeviceRecord = {
    platform,
    token,
    deviceId,
    appVersion: typeof body.appVersion === 'string' ? body.appVersion.slice(0, 50) : undefined,
    build: typeof body.build === 'string' ? body.build.slice(0, 50) : undefined,
    device: body.device && typeof body.device === 'object' && !Array.isArray(body.device)
      ? body.device as Record<string, unknown>
      : undefined,
    updatedAt: new Date().toISOString(),
  };
  await upsertNativeMobileDevice(userId, record);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || !validPlatform(body.platform)) {
    return NextResponse.json({ error: 'Invalid mobile device registration' }, { status: 400 });
  }
  await removeNativeMobileDevice(userId, body.platform, token);
  return NextResponse.json({ success: true });
}
