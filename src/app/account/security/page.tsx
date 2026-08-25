import { redirect } from 'next/navigation';

function getOutbornAccountSecurityUrl() {
  const configured = (process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL || '').trim();
  if (!configured) {
    throw new Error('Outborn Account is not configured. Set OUTBORN_ACCOUNT_AUTH_URL or OUTBORN_ACCOUNT_BASE_URL.');
  }

  const baseUrl = new URL(configured);
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new Error('Outborn Account URL must use http or https.');
  }
  if (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:') {
    throw new Error('Outborn Account URL must use https in production.');
  }

  return new URL('/security', `${baseUrl.toString().replace(/\/+$/, '')}/`).toString();
}

export default function AccountSecurityRedirectPage() {
  redirect(getOutbornAccountSecurityUrl());
}
