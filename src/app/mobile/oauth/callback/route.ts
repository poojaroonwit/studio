import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NATIVE_CALLBACK = 'obsipeopleess://oauth/callback';
const ALLOWED_PARAMS = new Set([
  'code',
  'state',
  'error',
  'error_description',
  'error_uri',
  'iss',
]);

function htmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key)) params.append(key, value);
  }

  const suffix = params.size ? `?${params.toString()}` : '';
  const target = `${NATIVE_CALLBACK}${suffix}`;
  const serializedTarget = JSON.stringify(target)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Return to Obsi People ESS</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f8;color:#111827">
  <main style="max-width:420px;padding:32px;text-align:center">
    <h1 style="font-size:22px;margin:0 0 12px">Return to Obsi People ESS</h1>
    <p style="color:#6b7280;margin:0 0 20px">Sign-in is complete. Opening the native app…</p>
    <a href="${htmlEscape(target)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#111827;color:#fff;text-decoration:none">Open Obsi People ESS</a>
  </main>
  <script>window.location.replace(${serializedTarget});</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
