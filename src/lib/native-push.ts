import { sign as cryptoSign } from 'node:crypto';
import { connect } from 'node:http2';
import {
  listNativeMobileDevices,
  removeNativeMobileDeviceByToken,
  type NativeMobileDeviceRecord,
} from '@/lib/native-mobile-device-registry';

interface PushNotificationPayload {
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedGoogleToken: { value: string; expiresAt: number; projectId: string } | null = null;
let cachedApnsToken: { value: string; expiresAt: number } | null = null;

const b64url = (value: string | Buffer): string => Buffer.from(value).toString('base64url');

function envJson(name: string, base64Name: string): string | null {
  if (process.env[name]?.trim()) return process.env[name]!.trim();
  if (process.env[base64Name]?.trim()) {
    return Buffer.from(process.env[base64Name]!.trim(), 'base64').toString('utf8');
  }
  return null;
}

function stringData(data?: Record<string, unknown> | null): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value === null || value === undefined) continue;
    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return result;
}

async function googleAccessToken(): Promise<{ token: string; projectId: string } | null> {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 60_000) {
    return { token: cachedGoogleToken.value, projectId: cachedGoogleToken.projectId };
  }

  const raw = envJson('FIREBASE_SERVICE_ACCOUNT_JSON', 'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64');
  if (!raw) return null;
  const account = JSON.parse(raw) as FirebaseServiceAccount;
  if (!account.project_id || !account.client_email || !account.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = account.token_uri || 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = cryptoSign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`FCM OAuth token request failed (${response.status})`);
  const json = await response.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('FCM OAuth token response did not include access_token');
  cachedGoogleToken = {
    value: json.access_token,
    projectId: account.project_id,
    expiresAt: Date.now() + Math.max(300, json.expires_in ?? 3600) * 1000,
  };
  return { token: json.access_token, projectId: account.project_id };
}

async function sendFcm(
  userId: string,
  device: NativeMobileDeviceRecord,
  payload: PushNotificationPayload,
): Promise<boolean> {
  const auth = await googleAccessToken();
  if (!auth) return false;
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(auth.projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${auth.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: device.token,
          notification: { title: payload.title, body: payload.message },
          data: stringData(payload.data),
          android: {
            priority: 'high',
            notification: { channel_id: 'hrive_general', sound: 'default' },
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.ok) return true;
  const errorBody = await response.text().catch(() => '');
  if (response.status === 404 || errorBody.includes('UNREGISTERED')) {
    await removeNativeMobileDeviceByToken(userId, device.token).catch(() => undefined);
  }
  throw new Error(`FCM send failed (${response.status}): ${errorBody.slice(0, 300)}`);
}

function apnsProviderToken(): string | null {
  if (cachedApnsToken && cachedApnsToken.expiresAt > Date.now() + 60_000) return cachedApnsToken.value;
  const keyId = process.env.APPLE_APNS_KEY_ID?.trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const key = process.env.APPLE_APNS_PRIVATE_KEY?.replace(/\\n/g, '\n')
    || (process.env.APPLE_APNS_PRIVATE_KEY_BASE64
      ? Buffer.from(process.env.APPLE_APNS_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
      : null);
  if (!keyId || !teamId || !key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: now }));
  const unsigned = `${header}.${claims}`;
  const signature = cryptoSign('sha256', Buffer.from(unsigned), {
    key,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  const token = `${unsigned}.${signature}`;
  cachedApnsToken = { value: token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function sendApns(
  userId: string,
  device: NativeMobileDeviceRecord,
  payload: PushNotificationPayload,
): Promise<boolean> {
  const providerToken = apnsProviderToken();
  if (!providerToken) return false;
  const production = process.env.APPLE_APNS_ENVIRONMENT === 'production';
  const origin = production ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com';
  const topic = process.env.APPLE_APNS_TOPIC?.trim() || 'co.outborn.people';
  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.message },
      sound: 'default',
    },
    ...stringData(payload.data),
  });

  return new Promise<boolean>((resolve, reject) => {
    const client = connect(origin);
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error('APNs request timed out'));
    }, 5000);
    client.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${device.token}`,
      authorization: `bearer ${providerToken}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    let status = 0;
    let responseBody = '';
    request.on('response', (headers) => {
      status = Number(headers[':status'] ?? 0);
    });
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => { responseBody += chunk; });
    request.on('end', () => {
      clearTimeout(timer);
      client.close();
      if (status >= 200 && status < 300) {
        resolve(true);
        return;
      }
      if (status === 410 || responseBody.includes('BadDeviceToken') || responseBody.includes('Unregistered')) {
        void removeNativeMobileDeviceByToken(userId, device.token).catch(() => undefined);
      }
      reject(new Error(`APNs send failed (${status}): ${responseBody.slice(0, 300)}`));
    });
    request.end(body);
  });
}

export async function fanOutNativePush(userId: string, payload: PushNotificationPayload): Promise<void> {
  const devices = await listNativeMobileDevices(userId);
  if (!devices.length) return;
  const results = await Promise.allSettled(devices.map((device) => (
    device.platform === 'android'
      ? sendFcm(userId, device, payload)
      : sendApns(userId, device, payload)
  )));
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    console.warn(`[native-push] ${failures.length}/${devices.length} native push deliveries failed`);
  }
}
