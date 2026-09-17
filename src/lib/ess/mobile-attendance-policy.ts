import { getPool } from '@/lib/db';

export type MobileAttendanceLocation = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type MobileAttendancePolicy = {
  locationRequired: boolean;
  requireScheduledShift: boolean;
  earlyClockInMinutes: number;
  lateClockOutMinutes: number;
  locations: MobileAttendanceLocation[];
};

type BranchConfigItem = {
  id?: unknown;
  name?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  geofenceRadiusKm?: unknown;
  isActive?: unknown;
};

type BranchConfig = { branches?: BranchConfigItem[] };
type PolicyConfig = Partial<Omit<MobileAttendancePolicy, 'locations'>>;

const POLICY_KEY = 'essMobileAttendanceConfiguration';
const BRANCH_KEY = 'branchConfig';

function finiteNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

function normalizeLocations(config: BranchConfig | null): MobileAttendanceLocation[] {
  const branches = Array.isArray(config?.branches) ? config!.branches! : [];
  return branches.flatMap((branch, index) => {
    if (branch.isActive === false) return [];
    const latitude = finiteNumber(branch.latitude, Number.NaN);
    const longitude = finiteNumber(branch.longitude, Number.NaN);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return [];
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return [];
    const radiusKm = Math.min(100, Math.max(0.01, finiteNumber(branch.geofenceRadiusKm, 0.5)));
    return [{
      id: typeof branch.id === 'string' && branch.id.trim() ? branch.id : `branch-${index + 1}`,
      name: typeof branch.name === 'string' && branch.name.trim() ? branch.name.trim() : `Branch ${index + 1}`,
      address: typeof branch.address === 'string' && branch.address.trim() ? branch.address.trim() : undefined,
      latitude,
      longitude,
      radiusMeters: Math.round(radiusKm * 1000),
    }];
  });
}

export async function loadMobileAttendancePolicy(): Promise<MobileAttendancePolicy> {
  const result = await getPool().query(
    `SELECT key, value FROM "SystemSetting" WHERE key = ANY($1::text[])`,
    [[POLICY_KEY, BRANCH_KEY]],
  );
  const values = new Map<string, unknown>(result.rows.map((row: { key: string; value: unknown }) => [row.key, row.value]));
  const policy = parseJson<PolicyConfig>(values.get(POLICY_KEY)) || {};
  const branchConfig = parseJson<BranchConfig>(values.get(BRANCH_KEY));
  return {
    locationRequired: policy.locationRequired === true,
    requireScheduledShift: policy.requireScheduledShift !== false,
    earlyClockInMinutes: Math.min(720, Math.max(0, finiteNumber(policy.earlyClockInMinutes, 120))),
    lateClockOutMinutes: Math.min(720, Math.max(0, finiteNumber(policy.lateClockOutMinutes, 240))),
    locations: normalizeLocations(branchConfig),
  };
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const r = 6_371_000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export type AttendancePolicyDecision =
  | { allowed: true; policy: MobileAttendancePolicy }
  | { allowed: false; status: number; error: string; policy: MobileAttendancePolicy };

export async function validateMobileAttendanceAction(input: {
  employeeId: string;
  latitude?: number;
  longitude?: number;
}): Promise<AttendancePolicyDecision> {
  const policy = await loadMobileAttendancePolicy();

  if (policy.requireScheduledShift) {
    const shift = await getPool().query(
      `SELECT id
         FROM hr_shift_assignments
        WHERE employee_id = $1
          AND shift_date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date
          AND status NOT IN ('cancelled', 'deleted')
        LIMIT 1`,
      [input.employeeId],
    );
    if (!shift.rows[0]) return { allowed: false, status: 409, error: 'No active shift is assigned for today', policy };
  }

  if (policy.locationRequired) {
    if (!policy.locations.length) {
      return { allowed: false, status: 503, error: 'Attendance location verification is enabled but no active branch geofence is configured', policy };
    }
    if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
      return { allowed: false, status: 400, error: 'Location is required for attendance', policy };
    }
    const inside = policy.locations.some((location) => (
      distanceMeters(input.latitude!, input.longitude!, location.latitude, location.longitude) <= location.radiusMeters
    ));
    if (!inside) return { allowed: false, status: 403, error: 'You are outside the allowed organization or branch attendance location', policy };
  }

  return { allowed: true, policy };
}
