import { type NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireUploadQueueSession } from './upload-queue-route-auth';
import { attachUploadQueueFileUrls, buildUploadQueueQuery, createUploadQueueReadErrorResponse } from './upload-queue-route-query';
import type { DbClient } from '@/lib/db';
import type { QueryResultRow } from 'pg';

type UploadQueueListRow = QueryResultRow & {
  file_path?: string | null;
};

type UploadQueueSummaryRow = QueryResultRow & {
  total: string | number;
  queued: string | number;
  inprocess: string | number;
  success: string | number;
  error: string | number;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function handleUploadQueueGet(request: NextRequest) {
  const authorization = await requireUploadQueueSession();
  if (!authorization.ok) {
    return authorization.response;
  }

  const query = buildUploadQueueQuery(request);
  const dataValues = [...query.filterValues, query.safeLimit, query.safeOffset];

  let client: DbClient | null = null;
  try {
    client = await getPool().connect();
  } catch (connectionError) {
    console.error('[Upload Queue API] Failed to connect to database:', connectionError);
    return NextResponse.json({
      error: 'Database connection error',
      details: getErrorMessage(connectionError),
    }, { status: 500 });
  }

  try {
    await client.query('SET statement_timeout = \'60000ms\'');

    const dataRes = await client.query<UploadQueueListRow>(
      `SELECT uq.*, p.title as position_title, cs.name as source_name, cs.logo as source_logo
       FROM upload_queue uq
       LEFT JOIN "Position" p ON uq.position_id = p.id
       LEFT JOIN "ApplicantSource" cs ON uq.source_id = cs.id
       ${query.whereSQL}
       ORDER BY ${query.safeSortExpr} ${query.sortDirection}
       LIMIT $${query.limitParamIndex} OFFSET $${query.offsetParamIndex}`,
      dataValues
    );

    const summaryRes = await client.query<UploadQueueSummaryRow>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE uq.status = 'queued') as queued,
        COUNT(*) FILTER (WHERE uq.status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE uq.status = 'success') as success,
        COUNT(*) FILTER (WHERE uq.status = 'failed') as error
        FROM upload_queue uq
        LEFT JOIN "Position" p ON uq.position_id = p.id
        ${query.whereSQL}`,
      query.filterValues
    );

    const summary = summaryRes.rows[0];
    const totalCount = parseInt(String(summary.total), 10);
    const jobsWithUrl = await attachUploadQueueFileUrls(dataRes.rows);

    return NextResponse.json({
      data: jobsWithUrl,
      total: totalCount,
      summary: {
        total: totalCount,
        queued: Number(summary.queued) || 0,
        inprocess: Number(summary.inprocess) || 0,
        success: Number(summary.success) || 0,
        error: Number(summary.error) || 0,
      },
      pagination: {
        page: Math.floor(query.safeOffset / query.safeLimit) + 1,
        limit: query.safeLimit,
        offset: query.safeOffset,
        totalPages: Math.ceil(totalCount / query.safeLimit),
        hasNextPage: query.safeOffset + query.safeLimit < totalCount,
        hasPrevPage: query.safeOffset > 0,
      },
    });
  } catch (error) {
    return createUploadQueueReadErrorResponse(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}
