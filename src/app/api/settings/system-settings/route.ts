// src/app/api/settings/system-settings/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import type { SystemSetting, SystemSettingKey } from '@/lib/types';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';


/**
 * @openapi
 * /api/settings/system-settings:
 *   get:
 *     summary: Get system settings
 *     responses:
 *       200:
 *         description: System settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *   post:
 *     summary: Update system settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: System settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

const systemSettingKeyEnum = z.enum([
    'appName', 'appLogoDataUrl', 'appFaviconDataUrl', 'appThemePreference',
    'defaultMatchCriteria',
    // New contextual logo settings
    'loginPageLogoLightMode', 'loginPageLogoDarkMode',
    'sidebarLogoCollapsedLightMode', 'sidebarLogoExpandedLightMode',
    'sidebarLogoCollapsedDarkMode', 'sidebarLogoExpandedDarkMode',
    'primaryGradientStart', 'primaryGradientEnd',
         'resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken',
    'geminiApiKey',
    'loginPageBackgroundType', 'loginPageBackgroundImageUrl', 
    'loginPageBackgroundColor1', 'loginPageBackgroundColor2',
    'loginPageLayoutType',
    // Alternative keys used by system preferences page
    'themePreference', 'loginBackgroundType', 'loginBackgroundGradientStart', 
    'loginBackgroundGradientEnd', 'loginBackgroundColor', 'showLogoOnly', 'sidebarLogoSize', 'loginPageLogoSize',
    'sidebarBackgroundType', 'sidebarBackgroundImageUrl', 'sidebarBackgroundImageFit', 'sidebarBackgroundImagePosition',
    // Sidebar Light Theme - Background colors
    'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL',
    'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
    'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL',
    // Sidebar Dark Theme - Background colors
    'sidebarBgStartD', 'sidebarBgEndD', 'sidebarTextD',
    'sidebarActiveBgStartD', 'sidebarActiveBgEndD', 'sidebarActiveTextD',
    'sidebarHoverBgD', 'sidebarHoverTextD', 'sidebarBorderD',
    // Sidebar Light Theme - Font settings
    'sidebarFontFamilyL', 'sidebarFontSizeL', 'sidebarFontWeightL', 'sidebarLineHeightL', 'sidebarLetterSpacingL', 'sidebarTextTransformL',
    // Sidebar Dark Theme - Font settings
    'sidebarFontFamilyD', 'sidebarFontSizeD', 'sidebarFontWeightD', 'sidebarLineHeightD', 'sidebarLetterSpacingD', 'sidebarTextTransformD',
    // Sidebar Light Theme - Border and shadow settings
    'sidebarBorderWidthL', 'sidebarBorderStyleL', 'sidebarBorderRadiusL', 'sidebarShadowL', 'sidebarShadowHoverL', 'sidebarShadowActiveL',
    // Sidebar Dark Theme - Border and shadow settings
    'sidebarBorderWidthD', 'sidebarBorderStyleD', 'sidebarBorderRadiusD', 'sidebarShadowD', 'sidebarShadowHoverD', 'sidebarShadowActiveD',
    // Sidebar Light Theme - Spacing and layout
    'sidebarPaddingXL', 'sidebarPaddingYL', 'sidebarMarginL', 'sidebarGapL',
    'sidebarWidthL', 'sidebarWidthCollapsedL', 'sidebarTransitionDurationL', 'sidebarTransitionTimingL',
    'sidebarItemSpacingL', 'sidebarGroupSpacingL', 'sidebarIconSizeL',
    // Sidebar Dark Theme - Spacing and layout
    'sidebarPaddingXD', 'sidebarPaddingYD', 'sidebarMarginD', 'sidebarGapD',
    'sidebarWidthD', 'sidebarWidthCollapsedD', 'sidebarTransitionDurationD', 'sidebarTransitionTimingD',
    'sidebarItemSpacingD', 'sidebarGroupSpacingD', 'sidebarIconSizeD',
    // Sidebar Light Theme - Menu item settings
    'sidebarMenuItemBgL', 'sidebarMenuItemBgHoverL', 'sidebarMenuItemBgActiveL', 'sidebarMenuItemColorL', 'sidebarMenuItemColorHoverL', 'sidebarMenuItemColorActiveL',
    'sidebarMenuItemBorderL', 'sidebarMenuItemBorderHoverL', 'sidebarMenuItemBorderActiveL', 'sidebarMenuItemBorderRadiusL', 'sidebarMenuItemPaddingXL', 'sidebarMenuItemPaddingYL',
    'sidebarMenuItemMarginL', 'sidebarMenuItemFontWeightL', 'sidebarMenuItemFontWeightActiveL', 'sidebarMenuItemFontSizeL', 'sidebarMenuItemLineHeightL', 'sidebarMenuItemTransitionL',
    // Sidebar Dark Theme - Menu item settings
    'sidebarMenuItemBgD', 'sidebarMenuItemBgHoverD', 'sidebarMenuItemBgActiveD', 'sidebarMenuItemColorD', 'sidebarMenuItemColorHoverD', 'sidebarMenuItemColorActiveD',
    'sidebarMenuItemBorderD', 'sidebarMenuItemBorderHoverD', 'sidebarMenuItemBorderActiveD', 'sidebarMenuItemBorderRadiusD', 'sidebarMenuItemPaddingXD', 'sidebarMenuItemPaddingYD',
    'sidebarMenuItemMarginD', 'sidebarMenuItemFontWeightD', 'sidebarMenuItemFontWeightActiveD', 'sidebarMenuItemFontSizeD', 'sidebarMenuItemLineHeightD', 'sidebarMenuItemTransitionD',
    // Sidebar Light Theme - Icon settings
    'sidebarIconColorL', 'sidebarIconColorHoverL', 'sidebarIconColorActiveL', 'sidebarIconMarginRightL', 'sidebarIconTransitionL',
    // Sidebar Dark Theme - Icon settings
    'sidebarIconColorD', 'sidebarIconColorHoverD', 'sidebarIconColorActiveD', 'sidebarIconMarginRightD', 'sidebarIconTransitionD',
    // Sidebar Light Theme - Group label settings
    'sidebarGroupLabelColorL', 'sidebarGroupLabelFontSizeL', 'sidebarGroupLabelFontWeightL', 'sidebarGroupLabelTextTransformL', 'sidebarGroupLabelLetterSpacingL', 'sidebarGroupLabelPaddingL', 'sidebarGroupLabelMarginL',
    // Sidebar Dark Theme - Group label settings
    'sidebarGroupLabelColorD', 'sidebarGroupLabelFontSizeD', 'sidebarGroupLabelFontWeightD', 'sidebarGroupLabelTextTransformD', 'sidebarGroupLabelLetterSpacingD', 'sidebarGroupLabelPaddingD', 'sidebarGroupLabelMarginD',
    'appFontFamily',
    'loginPageContent',
    'loginPageFooter',
    'maxConcurrentProcessors',
    // Webhook Configuration
    'resumeProcessingWebhookResponseMode',
    'resumeProcessingWebhookTimeout',
    // AI Configuration
    'aiPowerSearchSystemPrompt',
    // AI API Key Fallback Configuration
    'geminiApiKey_1', 'geminiApiKey_2', 'geminiApiKey_3', 'geminiApiKey_4', 'geminiApiKey_5',
    'geminiApiKey_1_errorCount', 'geminiApiKey_2_errorCount', 'geminiApiKey_3_errorCount', 'geminiApiKey_4_errorCount', 'geminiApiKey_5_errorCount',
    'geminiApiKey_1_lastError', 'geminiApiKey_2_lastError', 'geminiApiKey_3_lastError', 'geminiApiKey_4_lastError', 'geminiApiKey_5_lastError',
    'geminiApiKey_1_lastUsed', 'geminiApiKey_2_lastUsed', 'geminiApiKey_3_lastUsed', 'geminiApiKey_4_lastUsed', 'geminiApiKey_5_lastUsed',

]);


const systemSettingSchema = z.object({
  key: systemSettingKeyEnum,
  value: z.string().nullable(),
});

const saveSystemSettingsSchema = z.array(systemSettingSchema);

export async function GET(request: NextRequest) {
  try {
    const pool = getPool();
    let result = await pool.query('SELECT * FROM "SystemSetting" ORDER BY key');
    let settings = result.rows;
    
    // Define environment variable mappings
    const envMappings = [
      { key: 'geminiApiKey', envVar: 'GOOGLE_API_KEY' },
      { key: 'resumeProcessingWebhookUrl', envVar: 'RESUME_PROCESSING_WEBHOOK_URL' },
      { key: 'resumeProcessingWebhookToken', envVar: 'RESUME_PROCESSING_WEBHOOK_TOKEN' },
      { key: 'resumeProcessingWebhookResponseMode', envVar: 'RESUME_PROCESSING_WEBHOOK_RESPONSE_MODE', defaultValue: 'blocking' },
      { key: 'resumeProcessingWebhookTimeout', envVar: 'RESUME_PROCESSING_WEBHOOK_TIMEOUT', defaultValue: '1800' },
      { key: 'webhookConnectionTimeout', envVar: 'WEBHOOK_CONNECTION_TIMEOUT', defaultValue: '300' },
      { key: 'maxConcurrentProcessors', envVar: 'MAX_CONCURRENT_PROCESSORS', defaultValue: '5' }
    ];

    // Get existing setting keys
    const existingKeys = new Set(settings.map((setting: any) => setting.key));
    
    // Auto-sync environment variables to database if they don't exist
    const settingsToInsert: Array<{key: string, value: string}> = [];
    
    for (const mapping of envMappings) {
      if (!existingKeys.has(mapping.key)) {
        const envValue = process.env[mapping.envVar];
        if (envValue) {
          settingsToInsert.push({ key: mapping.key, value: envValue });
        } else if (mapping.defaultValue) {
          settingsToInsert.push({ key: mapping.key, value: mapping.defaultValue });
        }
      }
    }

    // Insert new settings from environment variables
    if (settingsToInsert.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const setting of settingsToInsert) {
          await client.query(
            'INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW())',
            [setting.key, setting.value]
          );
        }
        
        await client.query('COMMIT');
    
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('[SYSTEM SETTINGS] Failed to auto-sync environment variables:', error);
      } finally {
        client.release();
      }
      
      // Refresh settings after insert
      result = await pool.query('SELECT * FROM "SystemSetting" ORDER BY key');
      settings = result.rows;
    }
    
    // Check Azure AD configuration
    const isAzureAdConfigured = process.env.AZURE_AD_CLIENT_ID && 
                               process.env.AZURE_AD_CLIENT_SECRET && 
                               process.env.AZURE_AD_TENANT_ID &&
                               process.env.AZURE_AD_CLIENT_ID !== 'your_azure_ad_application_client_id' &&
                               process.env.AZURE_AD_CLIENT_SECRET !== 'your_azure_ad_client_secret_value' &&
                               process.env.AZURE_AD_TENANT_ID !== 'your_azure_ad_directory_tenant_id';

    // Return as flat object for frontend compatibility
    const settingsObj = Object.fromEntries(settings.map((setting: any) => [setting.key, setting.value]));
    
    // Add runtime fallbacks for any remaining missing values (for edge cases)
    for (const mapping of envMappings) {
      if (!settingsObj[mapping.key]) {
        const envValue = process.env[mapping.envVar];
        if (envValue) {
          settingsObj[mapping.key] = envValue;
        } else if (mapping.defaultValue) {
          settingsObj[mapping.key] = mapping.defaultValue;
        }
      }
    }
    
    // Add Azure AD configuration status
    settingsObj.isAzureAdConfigured = isAzureAdConfigured;
    
    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error('[SYSTEM SETTINGS] Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && !session?.user?.modulePermissions?.includes('SYSTEM_SETTINGS_MANAGE')) {
    await logAudit('WARN', `Forbidden attempt to update system settings by user ${session?.user?.email || 'Unknown'}.`, 'API:SystemSettings:Update', session?.user?.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  let settingsToSave: any[] = [];
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (from system preferences page)
      const formData = await request.formData();
      const preferencesEntries = formData.getAll('preferences');
      
      // Parse each preferences entry and combine them
      for (const entry of preferencesEntries) {
        if (typeof entry === 'string') {
          try {
            const parsed = JSON.parse(entry);
            if (Array.isArray(parsed)) {
              settingsToSave.push(...parsed);
            } else {
              settingsToSave.push(parsed);
            }
          } catch (parseError) {
            console.error('Failed to parse preferences entry:', entry, parseError);
            return NextResponse.json({ message: "Error parsing preferences data", error: (parseError as Error).message }, { status: 400 });
          }
        }
      }

      // Handle file uploads if present
      const logoFile = formData.get('logo');
      const faviconFile = formData.get('favicon');
      const loginBackgroundImageFile = formData.get('loginBackgroundImage');

      if (logoFile && typeof logoFile !== 'string') {
        // Convert logo file to data URL and add to settings
        const buffer = Buffer.from(await logoFile.arrayBuffer());
        const dataUrl = `data:${logoFile.type};base64,${buffer.toString('base64')}`;
        settingsToSave.push({ key: 'appLogoDataUrl', value: dataUrl });
      }

      if (faviconFile && typeof faviconFile !== 'string') {
        // Convert favicon file to data URL and add to settings
        const buffer = Buffer.from(await faviconFile.arrayBuffer());
        const dataUrl = `data:${faviconFile.type};base64,${buffer.toString('base64')}`;
        settingsToSave.push({ key: 'appFaviconDataUrl', value: dataUrl });
      }

      if (loginBackgroundImageFile && typeof loginBackgroundImageFile !== 'string') {
        // Convert login background image file to data URL and add to settings
        const buffer = Buffer.from(await loginBackgroundImageFile.arrayBuffer());
        const dataUrl = `data:${loginBackgroundImageFile.type};base64,${buffer.toString('base64')}`;
        settingsToSave.push({ key: 'loginPageBackgroundImageUrl', value: dataUrl });
      }
    } else {
      // Handle JSON (from system settings page)
      const body = await request.json();
      settingsToSave = body;
    }
  } catch (error) {
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400 });
  }

  const validationResult = saveSystemSettingsSchema.safeParse(settingsToSave);
  if (!validationResult.success) {
    console.error('System settings validation failed:', validationResult.error.flatten().fieldErrors);
    console.error('Data that failed validation:', JSON.stringify(settingsToSave, null, 2));
    return NextResponse.json(
      { 
        message: "Invalid input for system settings", 
        errors: validationResult.error.flatten().fieldErrors,
        data: settingsToSave // Include the data that failed validation for debugging
      },
      { status: 400 }
    );
  }

  const validatedSettings = validationResult.data;
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const savedSettings: SystemSetting[] = [];

    for (const setting of validatedSettings) {
      const upsertQuery = `
        INSERT INTO "SystemSetting" (key, value, "updatedAt")
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          "updatedAt" = NOW()
        RETURNING key, value, "updatedAt";
      `;
      const result = await client.query(upsertQuery, [setting.key, setting.value]);
      savedSettings.push(result.rows[0]);
    }

    await client.query('COMMIT');
    await logAudit('AUDIT', `System settings updated by ${session.user.name}. Keys: ${validatedSettings.map((s: any)=>s.key).join(', ')}`, 'API:SystemSettings:Update', session.user.id, { updatedKeys: validatedSettings.map((s: any)=>s.key) });
    
    // Return all current settings after update as an object (key-value pairs)
    const allSettingsResult = await client.query('SELECT key, value, "updatedAt" FROM "SystemSetting"');
    const settings = Object.fromEntries(allSettingsResult.rows.map((row: any) => [row.key, row.value]));
    
    // Apply the same environment variable mappings as in GET handler for consistency
    const envMappings = [
      { key: 'geminiApiKey', envVar: 'GOOGLE_API_KEY' },
      { key: 'resumeProcessingWebhookUrl', envVar: 'RESUME_PROCESSING_WEBHOOK_URL' },
      { key: 'resumeProcessingWebhookToken', envVar: 'RESUME_PROCESSING_WEBHOOK_TOKEN' },
      { key: 'resumeProcessingWebhookResponseMode', envVar: 'RESUME_PROCESSING_WEBHOOK_RESPONSE_MODE', defaultValue: 'blocking' },
      { key: 'maxConcurrentProcessors', envVar: 'MAX_CONCURRENT_PROCESSORS', defaultValue: '5' }
    ];

    // Add runtime fallbacks for any missing values
    for (const mapping of envMappings) {
      if (!settings[mapping.key]) {
        const envValue = process.env[mapping.envVar];
        if (envValue) {
          settings[mapping.key] = envValue;
        } else if (mapping.defaultValue) {
          settings[mapping.key] = mapping.defaultValue;
        }
      }
    }
    
    return NextResponse.json(settings, { status: 200 });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Failed to save system settings:", error);
    await logAudit('ERROR', `Failed to save system settings by ${session.user.name}. Error: ${error.message}`, 'API:SystemSettings:Update', session.user.id);
    return NextResponse.json({ message: "Error saving system settings", error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// New endpoint: POST /api/settings/upload-image
export async function PUT(request: NextRequest) {
  // Only allow Admin or SYSTEM_SETTINGS_MANAGE
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'Admin' && !session?.user?.modulePermissions?.includes('SYSTEM_SETTINGS_MANAGE')) {
    await logAudit('WARN', `Forbidden attempt to upload settings image by user ${session?.user?.email || 'Unknown'}.`, 'API:SystemSettings:UploadImage', session?.user?.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  if (!(file as File).type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  const ext = (file as File).name.split('.').pop();
  const objectName = `settings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  await getPool(); // Ensure DB pool is initialized (if needed for MinIO)
  await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': (file as File).type,
  });
  const publicUrl = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`;
  return NextResponse.json({ url: publicUrl });
}
