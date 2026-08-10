export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { redirect } from 'next/navigation';
import SignInClient from "./SignInClient";
import { getPool } from '@/lib/db';
import type { SystemSetting } from '@/lib/types';
import { isPlatformSetupRequired } from '@/lib/platform-installation';

export default async function SignInPage() {
  let setupRequired = false;
  try {
    setupRequired = await isPlatformSetupRequired();
  } catch (error) {
    console.warn('[SIGNIN_PAGE] Platform setup check unavailable; continuing with sign-in defaults.', error);
  }
  if (setupRequired) redirect('/setup');

  // Fetch system settings from the database on the server
  let settings: SystemSetting[] = [];
  try {
    const result = await getPool().query('SELECT key, value, "updatedAt" FROM "SystemSetting"');
    settings = result.rows;
  } catch (e) {
    console.warn('[SIGNIN_PAGE] Settings unavailable; rendering with client-side defaults.', e);
    // fallback: empty settings, client will handle fallback
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInClient initialSettings={settings} />
    </Suspense>
  );
}
    

    



