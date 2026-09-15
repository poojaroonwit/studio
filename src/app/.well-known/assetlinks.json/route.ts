import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const fingerprints = (process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'co.outborn.people',
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ], {
    headers: {
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
}
