import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';

/**
 * @openapi
 * /api/v1/settings:
 *   get:
 *     summary: Get system settings (V1 API)
 *     description: Returns system settings and configuration. Requires Bearer token authentication and Admin role.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     systemSettings:
 *                       type: object
 *                       properties:
 *                         defaultMatchCriteria:
 *                           type: object
 *                         emailSettings:
 *                           type: object
 *                         fileUploadSettings:
 *                           type: object
 *                     userPreferences:
 *                       type: object
 *                     customFields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           isRequired:
 *                             type: boolean
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 path:
 *                   type: string
 *                 method:
 *                   type: string
 *                 statusCode:
 *                   type: integer
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   success: true
 *                   data:
 *                     systemSettings:
 *                       defaultMatchCriteria:
 *                         minScore: 70
 *                         requiredSkills: ["JavaScript", "React"]
 *                       emailSettings:
 *                         smtpHost: "smtp.example.com"
 *                         smtpPort: 587
 *                       fileUploadSettings:
 *                         maxFileSize: 10485760
 *                         allowedTypes: ["pdf", "doc", "docx"]
 *                     userPreferences:
 *                       theme: "light"
 *                       language: "en"
 *                       timezone: "UTC"
 *                     customFields:
 *                       - id: "123e4567-e89b-12d3-a456-426614174000"
 *                         name: "Preferred Location"
 *                         type: "select"
 *                         isRequired: false
 *                         options: ["Remote", "On-site", "Hybrid"]
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   path: "/api/v1/settings"
 *                   method: "GET"
 *                   statusCode: 200
 *       401:
 *         description: Unauthorized - Invalid or missing Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Unauthorized - Invalid or expired token"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden - Admin role required"
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    
    if (!user) {
      return handleApiError(req, createUnauthorizedError('Authentication required'));
    }

    // Check permissions - only Admin can access settings
    if (user.role !== 'Admin') {
      return handleApiError(req, createForbiddenError('Admin role required to access settings'));
    }

    const client = await getPool().connect();
    try {
      // Get system settings
      const systemSettingsResult = await client.query(`
        SELECT 
          key,
          value,
          category
        FROM "SystemSetting"
        ORDER BY category, key
      `);

      // Get custom field definitions
      const customFieldsResult = await client.query(`
        SELECT 
          id,
          name,
          type,
          is_required as "isRequired",
          options,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM "CustomFieldDefinition"
        ORDER BY name
      `);

      // Get user preferences (for the current user)
      const userPreferencesResult = await client.query(`
        SELECT 
          key,
          value
        FROM "UserPreference"
        WHERE user_id = $1
        ORDER BY key
      `, [user.id]);

      // Organize system settings by category
      const systemSettings: any = {};
      systemSettingsResult.rows.forEach(row => {
        if (!systemSettings[row.category]) {
          systemSettings[row.category] = {};
        }
        try {
          systemSettings[row.category][row.key] = JSON.parse(row.value);
        } catch {
          systemSettings[row.category][row.key] = row.value;
        }
      });

      // Organize user preferences
      const userPreferences: any = {};
      userPreferencesResult.rows.forEach(row => {
        try {
          userPreferences[row.key] = JSON.parse(row.value);
        } catch {
          userPreferences[row.key] = row.value;
        }
      });

      // Process custom fields
      const customFields = customFieldsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        isRequired: row.isRequired,
        options: row.options ? JSON.parse(row.options) : [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }));

      const settingsData = {
        systemSettings,
        userPreferences,
        customFields
      };

      return createSuccessResponse(req, settingsData, 200);
    } finally {
      client.release();
    }

  } catch (error) {
    return handleApiError(req, createInternalServerError('Failed to fetch settings', { 
      originalError: (error as Error).message 
    }));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
