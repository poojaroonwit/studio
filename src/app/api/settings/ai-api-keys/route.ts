import { NextResponse, type NextRequest } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { getApiKeys, saveApiKeys, getApiKeyStats } from '@/lib/aiApiKeyManager';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/settings/ai-api-keys:
 *   get:
 *     summary: Get AI API keys with statistics
 *     responses:
 *       200:
 *         description: AI API keys and statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *   post:
 *     summary: Update AI API keys
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: AI API keys updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, 'AI_INTEGRATION_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to access AI API keys by user ${session?.user?.email || 'Unknown'}.`, 'API:AiApiKeys:Get', session?.user?.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const stats = await getApiKeyStats();
    
    return NextResponse.json({
      apiKeys: stats,
      totalKeys: stats.length,
      activeKeys: stats.filter(key => key.isActive).length,
      environmentKey: false // Environment keys are not used
    });
  } catch (error) {
    console.error('[AI API KEYS] Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, 'AI_INTEGRATION_EDIT')) {
    await logAudit('WARN', `Forbidden attempt to update AI API keys by user ${session?.user?.email || 'Unknown'}.`, 'API:AiApiKeys:Update', session?.user?.id);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { apiKeys } = body;

    if (!Array.isArray(apiKeys)) {
      return NextResponse.json(
        { error: 'Invalid request: apiKeys must be an array' },
        { status: 400 }
      );
    }

    // Validate API keys
    const validApiKeys = apiKeys
      .filter((key: any) => key.key && key.key.trim() && key.priority && key.priority > 0)
      .map((key: any) => ({
        key: key.key.trim(),
        priority: parseInt(key.priority),
        selectedModel: key.selectedModel || 'gemini-1.0-pro'
      }))
      .sort((a: any, b: any) => a.priority - b.priority);

    // Check for duplicate priorities (only among database keys)
    const priorities = validApiKeys.map(key => key.priority);
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      return NextResponse.json(
        { error: 'Invalid request: Duplicate priorities found' },
        { status: 400 }
      );
    }

    // Check for duplicate API key values (same key with different priorities)
    const keyValues = validApiKeys.map(key => key.key);
    const uniqueKeyValues = new Set(keyValues);
    if (keyValues.length !== uniqueKeyValues.size) {
      // Remove duplicates, keeping the one with lowest priority
      const seenKeys = new Map<string, typeof validApiKeys[0]>();
      for (const key of validApiKeys) {
        const trimmedKey = key.key.trim();
        if (!seenKeys.has(trimmedKey)) {
          seenKeys.set(trimmedKey, key);
        } else {
          // If duplicate found, keep the one with lower priority
          const existing = seenKeys.get(trimmedKey)!;
          if (key.priority < existing.priority) {
            seenKeys.set(trimmedKey, key);
          }
        }
      }
      const deduplicatedKeys = Array.from(seenKeys.values());
      
      // Reassign priorities sequentially
      const reorderedKeys = deduplicatedKeys.map((key, index) => ({
        ...key,
        priority: index + 1
      }));
      
      // Save the deduplicated keys
      await saveApiKeys(reorderedKeys);
      
      return NextResponse.json({
        success: true,
        message: "Duplicate API keys removed. Priorities have been reassigned.",
        apiKeys: reorderedKeys,
        removedDuplicates: validApiKeys.length - reorderedKeys.length
      }, { status: 200 });
    }

    // Save the API keys (saveApiKeys will handle deduplication internally)
    await saveApiKeys(validApiKeys);

    // Log the update
    await logAudit('AUDIT', `AI API keys updated by ${session.user.name}. Total keys: ${validApiKeys.length}`, 'API:AiApiKeys:Update', session.user.id, {
      keyCount: validApiKeys.length,
      priorities: validApiKeys.map(key => key.priority)
    });

    // Return updated stats
    const stats = await getApiKeyStats();
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${validApiKeys.length} API keys`,
      apiKeys: stats,
      totalKeys: stats.length,
      activeKeys: stats.filter(key => key.isActive).length
    });

  } catch (error) {
    console.error('[AI API KEYS] Error updating API keys:', error);
    await logAudit('ERROR', `Failed to update AI API keys by ${session.user?.name || session?.user?.email || 'Unknown'}. Error: ${(error as Error).message}`, 'API:AiApiKeys:Update', session?.user?.id);
    return NextResponse.json(
      { error: 'Failed to update AI API keys' },
      { status: 500 }
    );
  }
}
