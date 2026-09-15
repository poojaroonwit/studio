const ANDROID_PACKAGE_NAME = 'co.outborn.hrive';

export const dynamic = 'force-dynamic';

export async function GET() {
  const fingerprints = (process.env.HRIVE_ANDROID_CERT_SHA256_FINGERPRINT || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return Response.json(
    fingerprints.length > 0
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: ANDROID_PACKAGE_NAME,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [],
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/json',
      },
    },
  );
}
