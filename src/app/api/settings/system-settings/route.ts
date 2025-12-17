// src/app/api/settings/system-settings/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import type { SystemSetting, SystemSettingKey } from '@/lib/types';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
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
  'primaryGradientStart', 'primaryGradientEnd', 'primaryGradient', // Full gradient string with all stops
  'resumeProcessingWebhookUrl', 'resumeProcessingWebhookToken',
  'geminiApiKey',
  'loginPageBackgroundType', 'loginPageBackgroundImageUrl',
  'loginPageBackgroundColor1', 'loginPageBackgroundColor2',
  'loginPageLayoutType',
  // Alternative keys used by system preferences page
  'themePreference', 'loginBackgroundType', 'loginBackgroundGradientStart',
  'loginBackgroundGradientEnd', 'loginBackgroundGradient', // Full gradient string with all stops
  'loginBackgroundColor', 'showLogoOnly', 'sidebarLogoSize', 'loginPageLogoSize',
  'sidebarBackgroundType', 'sidebarBackgroundImageUrl', 'sidebarBackgroundImageFit', 'sidebarBackgroundImagePosition',
  // Evaluate header background settings
  'evaluateHeaderBackgroundType', 'evaluateHeaderBackgroundGradientStart', 'evaluateHeaderBackgroundGradientEnd',
  'evaluateHeaderBackgroundGradient', // Full gradient string with all stops
  'evaluateHeaderBackgroundColor', 'evaluateHeaderBackgroundImageUrl', 'evaluateHeaderTextColor',
  'evaluatePlatformLogoDataUrl', 'evaluateReportLogoDataUrl',
  // Organization branding
  'organizationName', 'organizationAddress', 'organizationContact', 'organizationLogoDataUrl',
  // Feature toggles
  'jobMatchFeatureEnabled',
  'pwaEnabled',
  'exportImportFeatureEnabled',
  // PWA Metadata settings
  'pwaName',
  'pwaShortName',
  'pwaDescription',
  'pwaThemeColor',
  'pwaBackgroundColor',
  'pwaAppleMobileWebAppTitle',
  'pwaAppleMobileWebAppStatusBarStyle',
  // Sidebar Light Theme - Background colors
  'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL',
  'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
  'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL',
  // Button text colors - separate from sidebar active text
  'buttonTextColorL', 'buttonTextColorD',
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
  'webhookConnectionTimeout',
  'preventDuplicateWebhookProcessing',
  // AI Configuration
  'aiPowerSearchSystemPrompt',
  'geminiModelSelection',
  // AI API Key Fallback Configuration
  'geminiApiKey_1', 'geminiApiKey_2', 'geminiApiKey_3', 'geminiApiKey_4', 'geminiApiKey_5',
  'geminiApiKey_1_errorCount', 'geminiApiKey_2_errorCount', 'geminiApiKey_3_errorCount', 'geminiApiKey_4_errorCount', 'geminiApiKey_5_errorCount',
  'geminiApiKey_1_lastError', 'geminiApiKey_2_lastError', 'geminiApiKey_3_lastError', 'geminiApiKey_4_lastError', 'geminiApiKey_5_lastError',
  'geminiApiKey_1_lastUsed', 'geminiApiKey_2_lastUsed', 'geminiApiKey_3_lastUsed', 'geminiApiKey_4_lastUsed', 'geminiApiKey_5_lastUsed',
  // Upload Queue Processor settings
  'processorIntervalMs', 'processorQuietMode', 'processorConnectionTimeoutMs', 'processorRequestTimeoutMs',
  // Sentry settings
  'sentryClientDsn', 'sentryServerDsn', 'sentryEnabled',
  // Elasticsearch settings
  'elasticsearchUrl', 'elasticsearchIndex', 'elasticsearchAuth', 'elasticsearchUsername',
  'elasticsearchPassword', 'elasticsearchSslVerify', 'elasticsearchTimeout', 'elasticsearchEnabled', 'processQueueEnabled',
  // SigNoz settings
  'signozEnabled', 'signozOtlpEndpoint', 'signozServiceName', 'signozOtlpHeaders',
  // Interviewer selection colors
  'interviewerSelectedBackgroundColor', 'interviewerSelectedTextColor', 'interviewerSelectedBorderColor', 'interviewerSelectedBorderWidth',
  'interviewerNonSelectedBackgroundColor', 'interviewerNonSelectedTextColor', 'interviewerNonSelectedBorderColor', 'interviewerNonSelectedBorderWidth',
  'interviewerNameColor',
  // Generative AI Canvas Mode
  'generativeAICanvasMode',
  // Drawer Style
  'drawerStyle',
  // Email Service Configuration
  'emailServiceEnabled',
  'emailSmtpHost',
  'emailSmtpPort',
  'emailSmtpSecure',
  'emailSmtpUser',
  'emailSmtpPassword',
  'emailFromAddress',
  'emailFromName',
  // Email Templates
  'emailTemplateInterviewInvitation',
  'emailTemplateInterviewInvitationSubject',
  // Feature Toggles
  'interviewInvitationFeatureEnabled',
  'hiringManagerRestrictToAssignedPositions',
  'azureMeetingRoomsEnabled',

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
      { key: 'webhookConnectionTimeout', envVar: 'WEBHOOK_CONNECTION_TIMEOUT', defaultValue: '900' },
      { key: 'maxConcurrentProcessors', envVar: 'MAX_CONCURRENT_PROCESSORS', defaultValue: '5' }
    ];

    // Get existing setting keys (ensure settings is an array)
    const safeSettings = Array.isArray(settings) ? settings : [];
    const existingKeys = new Set(safeSettings.map((setting: any) => setting.key));

    // Auto-sync environment variables to database if they don't exist
    const settingsToInsert: Array<{ key: string, value: string }> = [];

    for (const mapping of envMappings) {
      // Skip auto-sync of geminiApiKey entirely - we use the multi-key format (geminiApiKey_1, etc.)
      // This prevents environment variable from being re-added when user removes all keys
      if (mapping.key === 'geminiApiKey') {
        continue;
      }

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
    const settingsObj = Object.fromEntries(safeSettings.map((setting: any) => [setting.key, setting.value]));

    // Add runtime fallbacks for any remaining missing values (for edge cases)
    for (const mapping of envMappings) {
      // Skip geminiApiKey - we use the multi-key format (geminiApiKey_1, etc.)
      if (mapping.key === 'geminiApiKey') {
        continue;
      }

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
  const session = await auth();

  if (!session?.user || !hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
    console.log('Access denied - insufficient permissions');
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
      // SECURITY: Check request body size to prevent DoS attacks
      const contentLength = request.headers.get('content-length');
      if (contentLength) {
        const { securityConfig } = await import('@/lib/securityConfig');
        const maxSize = securityConfig.requestBody?.maxJsonSize || 10 * 1024 * 1024; // 10MB
        const size = parseInt(contentLength, 10);
        if (size > maxSize) {
          return NextResponse.json({
            message: `Request body too large. Maximum size is ${maxSize / (1024 * 1024)}MB`
          }, { status: 413 });
        }
      }

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
  let client;
  try {
    client = await getPool().connect();
  } catch (connectionError: any) {
    console.error(`[System Settings API] Failed to connect to database:`, connectionError);
    return NextResponse.json({
      message: 'Database connection error',
      error: connectionError.message
    }, { status: 500 });
  }

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
    await logAudit('AUDIT', `System settings updated by ${session.user.name}. Keys: ${validatedSettings.map((s: any) => s.key).join(', ')}`, 'API:SystemSettings:Update', session.user.id, { updatedKeys: validatedSettings.map((s: any) => s.key) });

    // Reload SigNoz configuration if SigNoz settings were updated
    const signozKeys = ['signozEnabled', 'signozOtlpEndpoint', 'signozServiceName', 'signozOtlpHeaders'];
    const signozSettingsUpdated = validatedSettings.some((s: any) => signozKeys.includes(s.key));
    if (signozSettingsUpdated) {
      try {
        // Reinitialize both the SDK and logger
        const { initializeOpenTelemetrySDK } = await import('@/lib/opentelemetry-sdk');
        const { reinitializeSignozLogger } = await import('@/lib/signoz');

        // Reinitialize the full OpenTelemetry SDK (traces, metrics, logs)
        await initializeOpenTelemetrySDK();

        // Wait a bit for the SDK to fully initialize the logger provider
        await new Promise(resolve => setTimeout(resolve, 500));

        // Reinitialize the logger
        await reinitializeSignozLogger();

        console.log('SigNoz: Configuration reloaded successfully');
      } catch (error) {
        console.error('Failed to reload SigNoz configuration:', error);
        // Don't fail the request if SigNoz reload fails
      }
    }

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
      // Skip geminiApiKey - we use the multi-key format (geminiApiKey_1, etc.)
      if (mapping.key === 'geminiApiKey') {
        continue;
      }

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
    // Try to rollback if we have a client and transaction was started
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: any) {
        console.error(`[System Settings API] Error during rollback:`, rollbackError);
      }
    }
    console.error("Failed to save system settings:", error);
    await logAudit('ERROR', `Failed to save system settings by ${session?.user?.name || session?.user?.email || 'Unknown'}. Error: ${error.message}`, 'API:SystemSettings:Update', session?.user?.id);
    return NextResponse.json({ message: "Error saving system settings", error: error.message }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

// New endpoint: POST /api/settings/upload-image
export async function PUT(request: NextRequest) {
  // Only allow Admin or SYSTEM_SETTINGS_MANAGE
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
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
  // SECURITY: Use cryptographically secure random for filename generation
  const { generateSecureFilename } = await import('@/lib/cryptoUtils');
  const objectName = `settings/${Date.now()}-${generateSecureFilename(12)}.${ext}`;
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  await getPool(); // Ensure DB pool is initialized (if needed for MinIO)
  await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': (file as File).type,
  });
  const publicUrl = await (await import('@/lib/fileUrls')).buildServerFileUrl(objectName, { strategy: 'stream' });
  return NextResponse.json({ url: publicUrl });
}
