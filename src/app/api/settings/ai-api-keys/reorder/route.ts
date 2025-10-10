import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { getApiKeys, saveApiKeys } from '@/lib/aiApiKeyManager';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reorderApiKeysSchema = z.object({
  apiKeys: z.array(z.object({
    key: z.string(),
    priority: z.number().positive()
  }))
});

/**
 * @openapi
 * /api/settings/ai-api-keys/reorder:
 *   post:
 *     summary: Reorder AI API keys by priority
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKeys:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                     priority:
 *                       type: number
 *     responses:
 *       200:
 *         description: API keys reordered successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user, 'AI_INTEGRATION_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to reorder AI API keys by user ${session?.user?.email || 'Unknown'}.`, 'API:AiApiKeys:Reorder', session?.user?.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { apiKeys } = reorderApiKeysSchema.parse(body);

    if (apiKeys.length === 0) {
      return NextResponse.json({ message: "No API keys provided" }, { status: 400 });
    }

    // Validate that all keys exist and have unique priorities
    const priorities = apiKeys.map(key => key.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      return NextResponse.json(
        { error: 'Invalid request: Duplicate priorities found' },
        { status: 400 }
      );
    }

    // Get current API keys to validate that all keys exist
    const currentApiKeys = await getApiKeys();
    const currentKeySet = new Set(currentApiKeys.map(key => key.key));
    
    for (const apiKey of apiKeys) {
      if (!currentKeySet.has(apiKey.key)) {
        return NextResponse.json(
          { error: `API key not found: ${apiKey.key.substring(0, 8)}...` },
          { status: 400 }
        );
      }
    }

    // Save the reordered API keys
    await saveApiKeys(apiKeys);

    // Log the reorder operation
    await logAudit('INFO', `AI API keys reordered by ${session.user.name}. Total keys: ${apiKeys.length}`, 'API:AiApiKeys:Reorder', session.user.id, {
      keyCount: apiKeys.length,
      priorities: apiKeys.map(key => key.priority)
    });
    
    return NextResponse.json({ 
      message: "API keys reordered successfully",
      apiKeys: apiKeys
    }, { status: 200 });

  } catch (error: any) {
    console.error("Failed to reorder AI API keys:", error);
    
    // Handle specific error types
    if (error.name === 'ZodError') {
      console.error('Validation error details:', error.errors);
      return NextResponse.json({ 
        message: "Validation error", 
        error: "Invalid request format",
        details: error.errors 
      }, { status: 400 });
    }
    
    // Handle database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('Database connection error:', error);
      return NextResponse.json({ 
        message: "Database connection error", 
        error: "Unable to connect to database" 
      }, { status: 500 });
    }
    
    // Handle transaction errors
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ 
        message: "Database constraint error", 
        error: "Duplicate data detected" 
      }, { status: 400 });
    }
    
    await logAudit('ERROR', `Failed to reorder AI API keys by ${session.user?.name || session?.user?.email || 'Unknown'}. Error: ${error.message}`, 'API:AiApiKeys:Reorder', session?.user?.id, {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({ 
      message: "Error reordering AI API keys", 
      error: error.message 
    }, { status: 500 });
  }
}
