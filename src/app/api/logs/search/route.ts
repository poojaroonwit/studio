// src/app/api/logs/search/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { searchLogsInElasticsearch } from '@/lib/elasticsearch';
import { z } from 'zod';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

const searchLogsSchema = z.object({
  search: z.string().optional(),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG', 'AUDIT']).optional(),
  source: z.string().optional(),
  actingUserId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

/**
 * @openapi
 * /api/logs/search:
 *   get:
 *     summary: Search logs using Elasticsearch
 *     description: Returns search results from Elasticsearch. Requires authentication and Elasticsearch configuration.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search query
 *         example: "database error"
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [INFO, WARN, ERROR, DEBUG, AUDIT]
 *         description: Filter by log level
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source
 *       - in: query
 *         name: actingUserId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by acting user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Search results
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Elasticsearch not configured
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = {
      search: searchParams.get('search') || undefined,
      level: searchParams.get('level') || undefined,
      source: searchParams.get('source') || undefined,
      actingUserId: searchParams.get('actingUserId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
    };

    const validationResult = searchLogsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: 'Invalid search parameters', errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const query = validationResult.data;
    const result = await searchLogsInElasticsearch({
      search: query.search,
      level: query.level,
      source: query.source,
      actingUserId: query.actingUserId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return NextResponse.json({
      data: result.hits,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    if (error.message === 'Elasticsearch is not configured') {
      return NextResponse.json(
        { message: 'Elasticsearch is not configured. Please configure ELASTICSEARCH_URL environment variable.' },
        { status: 503 }
      );
    }

    console.error('Failed to search logs in Elasticsearch:', error);
    return NextResponse.json(
      { message: 'Error searching logs', error: error.message },
      { status: 500 }
    );
  }
}

