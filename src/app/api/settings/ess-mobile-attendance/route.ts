import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const POLICY_KEY = 'essMobileAttendanceConfiguration';
const BRANCH_KEY = 'branchConfig';

type PolicyPayload = {
  locationRequired?: boolean;
  requireScheduledShift?: boolean;
  earlyClockInMinutes?: number;
  lateClockOutMinutes?: number;
};

type Branch = {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusKm?: number;
  isActive?: boolean;
};

function normalizeMinutes(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(720, Math.max(0, Math.round(parsed))) : fallback;
}

function normalizePolicy(value: unknown) {
  const policy = value && typeof value === 'object' && !Array.isArray(value) ? value as PolicyPayload : {};
  return {
    locationRequired: policy.locationRequired === true,
    requireScheduledShift: policy.requireScheduledShift !== false,
    earlyClockInMinutes: normalizeMinutes(policy.earlyClockInMinutes, 120),
    lateClockOutMinutes: normalizeMinutes(policy.lateClockOutMinutes, 240),
  };
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function loadConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [POLICY_KEY, BRANCH_KEY] } },
    select: { key: true, value: true },
  });
  const map = new Map(settings.map(setting => [setting.key, setting.value]));
  const policy = normalizePolicy(parseJson<PolicyPayload>(map.get(POLICY_KEY)));
  const branchConfig = parseJson<{ branches?: Branch[] }>(map.get(BRANCH_KEY));
  const branches = Array.isArray(branchConfig?.branches) ? branchConfig!.branches!.filter(branch => branch.isActive !== false) : [];
  return { policy, branches };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_VIEW')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await loadConfig());
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  const policy = normalizePolicy(body);
  await prisma.systemSetting.upsert({
    where: { key: POLICY_KEY },
    create: { key: POLICY_KEY, value: JSON.stringify(policy) },
    update: { value: JSON.stringify(policy) },
  });
  return NextResponse.json(await loadConfig());
}
