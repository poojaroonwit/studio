export const dynamic = "force-dynamic";
import { Suspense } from "react";
import SignInClient from "./SignInClient";
import { getPool } from '@/lib/db';
import type { SystemSetting } from '@/lib/types';

export default async function SignInPage() {
  // Fetch system settings from the database on the server
  let settings: SystemSetting[] = [];
  try {
    const result = await getPool().query('SELECT key, value, "updatedAt" FROM "SystemSetting"');
    settings = result.rows;
    console.log('[SIGNIN_PAGE] Fetched settings from DB:', settings.map(s => ({ key: s.key, hasValue: !!s.value })));
  } catch (e) {
    console.error('[SIGNIN_PAGE] Failed to fetch settings:', e);
    // fallback: empty settings, client will handle fallback
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInClient initialSettings={settings} />
    </Suspense>
  );
}
    

    



