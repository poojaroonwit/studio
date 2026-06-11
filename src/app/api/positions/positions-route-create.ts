import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { handleCors } from '@/lib/cors';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { getDefaultMatchCriteria } from '@/lib/systemSettings';
import { broadcastPositionCreated } from '@/lib/simple-broadcaster';
import { logAudit } from '@/lib/auditLog';
import { sanitizeHtml, sanitizeRichHtml } from '@/lib/security';
import { readRequestJsonResult } from '@/lib/request-json';
import type { Session } from 'next-auth';
import type { QueryResultRow } from 'pg';

const createPositionSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  department: z.string().min(1, { message: 'Department is required' }),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean({ required_error: 'isOpen status is required' }),
  positionLevel: z.string().optional().nullable(),
  gradeId: z.string().uuid().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
  custom_attributes: z.record(z.unknown()).optional().nullable(),
});

type CreatedPositionRow = QueryResultRow & {
  id: string;
  title: string;
  department: string;
  positionLevel?: string | null;
  customAttributes?: unknown;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function handleCreatePosition(
  request: NextRequest,
  session: Session,
  actingUserId: string | null,
  actingUserName: string
) {
  const defaultMatchCriteria = await getDefaultMatchCriteria();
  const parsedBody = await parseCreatePositionBody(request);
  if (parsedBody instanceof NextResponse) {
    return parsedBody;
  }

  const validationResult = createPositionSchema.safeParse(parsedBody);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors },
      { status: 400, headers: handleCors(request) }
    );
  }

  const validatedData = validationResult.data;

  try {
    const newPosition = await insertPosition(validatedData, defaultMatchCriteria);

    await logAudit(
      'AUDIT',
      `Position '${newPosition.title}' (ID: ${newPosition.id}) created by ${actingUserName}.`,
      'API:Positions:Create',
      actingUserId,
      {
        targetPositionId: newPosition.id,
        title: newPosition.title,
        department: newPosition.department,
        positionLevel: newPosition.positionLevel,
      }
    );

    try {
      await dispatchWebhooks.positionCreated(newPosition);
    } catch {
      // Webhook failures should not fail position creation.
    }

    broadcastPositionCreated(newPosition, actingUserId || undefined);

    return NextResponse.json(newPosition, { status: 201, headers: handleCors(request) });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await logAudit(
      'ERROR',
      `Failed to create position '${validatedData.title}' by ${actingUserName}. Error: ${errorMessage}`,
      'API:Positions:Create',
      actingUserId,
      { title: validatedData.title }
    );
    return NextResponse.json(
      { message: 'Error creating position', error: errorMessage },
      { status: 500, headers: handleCors(request) }
    );
  }
}

async function parseCreatePositionBody(request: NextRequest): Promise<unknown | NextResponse> {
  const result = await readRequestJsonResult(request);
  if (!result.ok) {
    return NextResponse.json(
      { message: 'Error parsing request body', error: getErrorMessage(result.error) },
      { status: 400, headers: handleCors(request) }
    );
  }

  return result.value;
}

async function insertPosition(validatedData: z.infer<typeof createPositionSchema>, defaultMatchCriteria: string | null) {
  const newPositionId = uuidv4();
  const insertQuery = `
    INSERT INTO "Position" (id, title, department, description, "matchCriteria", "isOpen", "positionLevel", "gradeId", "recruiterId", "customAttributes", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING *;
  `;
  const values = [
    newPositionId,
    sanitizeHtml(validatedData.title || ''),
    validatedData.department,
    validatedData.description ? sanitizeRichHtml(validatedData.description) : null,
    validatedData.matchCriteria && validatedData.matchCriteria.trim() !== ''
      ? sanitizeRichHtml(validatedData.matchCriteria)
      : defaultMatchCriteria,
    validatedData.isOpen,
    validatedData.positionLevel || null,
    validatedData.gradeId || null,
    validatedData.recruiterId || null,
    validatedData.custom_attributes || {},
  ];
  const result = await getPool().query<CreatedPositionRow>(insertQuery, values);

  return {
    ...result.rows[0],
    custom_attributes: result.rows[0].customAttributes || {},
  };
}
