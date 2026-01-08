import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check NextAuth configuration
 * This helps diagnose configuration issues
 */
export async function GET(req: NextRequest) {
  try {
    const hasSecret = !!process.env.NEXTAUTH_SECRET;
    const hasUrl = !!process.env.NEXTAUTH_URL;
    const secretLength = process.env.NEXTAUTH_SECRET?.length || 0;
    const secretPreview = process.env.NEXTAUTH_SECRET 
      ? `${process.env.NEXTAUTH_SECRET.substring(0, 10)}...` 
      : 'NOT SET';
    
    // Check for placeholder values
    const insecureValues = [
      'CHANGE_THIS_GENERATE_SECURE_SECRET_USING_OPENSSL',
      'your-local-development-secret-key-change-this',
      'your-secret-key',
      'secret',
      'dev-secret',
      'test-secret',
    ];
    const isPlaceholder = process.env.NEXTAUTH_SECRET 
      ? insecureValues.includes(process.env.NEXTAUTH_SECRET)
      : false;
    
    // Azure AD configuration checks
    const hasAzureClientId = !!process.env.AZURE_AD_CLIENT_ID;
    const hasAzureClientSecret = !!process.env.AZURE_AD_CLIENT_SECRET;
    const hasAzureTenantId = !!process.env.AZURE_AD_TENANT_ID;
    const azureClientId = process.env.AZURE_AD_CLIENT_ID || 'NOT SET';
    const azureTenantId = process.env.AZURE_AD_TENANT_ID || 'NOT SET';
    
    // Check for Azure AD placeholder values
    const azurePlaceholderValues = [
      'your_azure_ad_application_client_id',
      'your_azure_ad_client_secret',
      'your_azure_ad_directory_tenant_id',
      'your-azure-ad-client-id',
      'your-azure-ad-client-secret',
      'your-azure-ad-tenant-id',
    ];
    const isAzurePlaceholder = 
      azurePlaceholderValues.includes(process.env.AZURE_AD_CLIENT_ID || '') ||
      azurePlaceholderValues.includes(process.env.AZURE_AD_CLIENT_SECRET || '') ||
      azurePlaceholderValues.includes(process.env.AZURE_AD_TENANT_ID || '');
    
    const azureConfigured = hasAzureClientId && hasAzureClientSecret && hasAzureTenantId && !isAzurePlaceholder;
    
    // Calculate expected redirect URI
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'NOT SET';
    const expectedRedirectUri = nextAuthUrl !== 'NOT SET' 
      ? `${nextAuthUrl}/api/auth/callback/azure-ad`
      : 'NOT SET (NEXTAUTH_URL required)';
    
    const config = {
      hasNextAuthSecret: hasSecret,
      hasNextAuthUrl: hasUrl,
      secretLength,
      secretPreview,
      isPlaceholder,
      nextAuthUrl,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      azureAd: {
        configured: azureConfigured,
        hasClientId: hasAzureClientId,
        hasClientSecret: hasAzureClientSecret,
        hasTenantId: hasAzureTenantId,
        isPlaceholder: isAzurePlaceholder,
        clientId: azureClientId.length > 20 ? `${azureClientId.substring(0, 20)}...` : azureClientId,
        tenantId: azureTenantId,
        expectedRedirectUri,
      },
    };
    
    // Check if configuration is valid
    const isValid = hasSecret && hasUrl && !isPlaceholder && secretLength >= 32;
    
    const issues = [
      !hasSecret && 'NEXTAUTH_SECRET is not set',
      !hasUrl && 'NEXTAUTH_URL is not set',
      isPlaceholder && 'NEXTAUTH_SECRET is set to a placeholder value',
      secretLength < 32 && 'NEXTAUTH_SECRET is too short (should be at least 32 characters)',
      azureConfigured && !hasAzureClientId && 'AZURE_AD_CLIENT_ID is not set',
      azureConfigured && !hasAzureClientSecret && 'AZURE_AD_CLIENT_SECRET is not set',
      azureConfigured && !hasAzureTenantId && 'AZURE_AD_TENANT_ID is not set',
      isAzurePlaceholder && 'Azure AD credentials are set to placeholder values',
      azureConfigured && nextAuthUrl === 'NOT SET' && 'NEXTAUTH_URL must be set for Azure AD redirect URI',
    ].filter(Boolean);
    
    return NextResponse.json({
      valid: isValid,
      config,
      issues,
      azureAdSetupInstructions: azureConfigured ? {
        step1: 'Go to Azure Portal → App Registrations → Your App',
        step2: 'Navigate to "Authentication" section',
        step3: `Add redirect URI: ${expectedRedirectUri}`,
        step4: 'Ensure app is configured as "Web" platform (not "Public client")',
        step5: 'Verify client secret has not expired',
        step6: 'Check that required API permissions are granted',
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

