import { NextResponse, type NextRequest } from 'next/server';
import { saveSystemSettingsSchema } from './system-settings-route-schema';
import type { Session } from 'next-auth';
import { parseSettingsToSave } from './system-settings-route-parse-save';
import { saveValidatedSystemSettings } from './system-settings-route-save-db';

export async function handleSaveSystemSettings(request: NextRequest, session: Session) {
  const parsedSettings = await parseSettingsToSave(request);
  if (parsedSettings instanceof NextResponse) {
    return parsedSettings;
  }

  const validationResult = saveSystemSettingsSchema.safeParse(parsedSettings);
  if (!validationResult.success) {
    console.error('System settings validation failed:', validationResult.error.flatten().fieldErrors);
    console.error('Data that failed validation:', JSON.stringify(parsedSettings, null, 2));
    return NextResponse.json(
      {
        message: 'Invalid input for system settings',
        errors: validationResult.error.flatten().fieldErrors,
        data: parsedSettings,
      },
      { status: 400 }
    );
  }

  return saveValidatedSystemSettings(validationResult.data, session);
}
