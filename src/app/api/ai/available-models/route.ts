import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { executeWithApiKeyFallback } from '@/lib/aiApiKeyManager';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/ai/available-models:
 *   get:
 *     summary: Get available Gemini models
 *     description: Fetches the list of available Gemini models from Google AI API
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Model name
 *                       displayName:
 *                         type: string
 *                         description: Human-readable model name
 *                       description:
 *                         type: string
 *                         description: Model description
 *                       supportedGenerationMethods:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Supported generation methods
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || !hasPermission(session.user, 'SYSTEM_SETTINGS_EDIT')) {
      console.log('Access denied - insufficient permissions for model fetching');
      await logAudit('WARN', `Forbidden attempt to fetch available models by user ${session?.user?.email || 'Unknown'}.`, 'API:AvailableModels:Fetch', session?.user?.id);
      return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    // Fetch available models using API key fallback
    const result = await executeWithApiKeyFallback(async (apiKey) => {
      const url = "https://generativelanguage.googleapis.com/v1/models";
      
      const fetchRes = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
      });

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        console.error('Gemini API: HTTP Error Response:', fetchRes.status, fetchRes.statusText);
        console.error('Gemini API: Error Details:', errorText);
        throw new Error(`Gemini API error: ${fetchRes.status} ${fetchRes.statusText} - ${errorText}`);
      }

      const data = await fetchRes.json();
      
      // Check for API errors
      if (data.error) {
        console.error('Gemini API error:', data.error);
        throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      return data;
    }, 'Fetch Available Models');

    if (!result.success) {
      console.error('Failed to fetch available models:', result.error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch available models. Please check your API key configuration.',
          attempts: result.attempts,
          lastError: result.error
        },
        { status: 503 }
      );
    }

    const apiData = result.data;
    const models = apiData.models || [];

    // Filter and format models for our use case
    const availableModels = models
      .filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        model.name?.includes('gemini')
      )
      .map((model: any) => ({
        name: model.name,
        displayName: model.displayName || model.name,
        description: model.description || '',
        supportedGenerationMethods: model.supportedGenerationMethods || []
      }))
      .sort((a: any, b: any) => {
        // Sort by model name, putting newer models first
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Prioritize gemini-1.5-pro, then gemini-1.5-flash, then others
        if (aName.includes('gemini-1.5-pro')) return -1;
        if (bName.includes('gemini-1.5-pro')) return 1;
        if (aName.includes('gemini-1.5-flash')) return -1;
        if (bName.includes('gemini-1.5-flash')) return 1;
        
        return aName.localeCompare(bName);
      });

    await logAudit('AUDIT', `Available models fetched by ${session.user.name}. Found ${availableModels.length} models.`, 'API:AvailableModels:Fetch', session.user.id);

    return NextResponse.json({
      success: true,
      models: availableModels
    });

  } catch (error) {
    console.error('[AVAILABLE MODELS] Error fetching models:', error);
    await logAudit('ERROR', `Failed to fetch available models. Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'API:AvailableModels:Fetch');
    return NextResponse.json(
      { error: 'Failed to fetch available models' },
      { status: 500 }
    );
  }
}
