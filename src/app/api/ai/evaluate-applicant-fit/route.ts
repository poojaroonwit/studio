import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { getSystemSetting } from '@/lib/systemSettings';
import { executeWithApiKeyFallback } from '@/lib/aiApiKeyManager';
import { generateTextWithProvider, getProviderLabel } from '@/lib/aiProvider';
import { logAudit } from '@/lib/auditLog';
import { canEditApplicant } from '@/lib/permissions';
import { permissionMatches } from '@/lib/permission-aliases';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_EVALUATION_PROMPT = [
  'Evaluate the applicant against the selected position using resume evidence, parsed resume data, configured position criteria, existing fit scores, match reasons, recruiter notes, and evaluation feedback.',
  'Return a fair, evidence-based score and concise justification bullets. Use specific language, call out strengths and risks, and do not invent qualifications that are not present in the data.'
].join(' ');

const evaluateApplicantFitSchema = z.object({
  applicantId: z.string().uuid(),
  positionId: z.string().uuid().optional(),
  save: z.boolean().optional().default(false),
  promptOverride: z.string().trim().min(20).optional(),
});

type AiEvaluationResult = {
  fitScore: number;
  justification: string[];
  summary?: string;
  strengths?: string[];
  risks?: string[];
  evidence?: string[];
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = evaluateApplicantFitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      message: 'Validation failed',
      errors: validation.error.flatten().fieldErrors
    }, { status: 400 });
  }

  const { applicantId, save, promptOverride } = validation.data;
  let { positionId } = validation.data;

  const pool = getPool();
  const client = await pool.connect();

  try {
    const applicantResult = await client.query(`
      SELECT 
        a.id,
        a.name,
        a.email,
        a.phone,
        a."statusId",
        a."positionId",
        a."recruiterId",
        a."fitScore",
        a."parsedData",
        a."customAttributes",
        a."assignmentJustification",
        a."educationData",
        a."experienceData",
        a."resumePath",
        a."applicationDate",
        rs.name as "stageName",
        u.name as "recruiterName"
      FROM "Applicant" a
      LEFT JOIN "RecruitmentStage" rs ON a."statusId" = rs.id
      LEFT JOIN "User" u ON a."recruiterId" = u.id
      WHERE a.id = $1
    `, [applicantId]);

    if (applicantResult.rows.length === 0) {
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }

    const applicant = applicantResult.rows[0];
    positionId = positionId || applicant.positionId;

    if (!positionId) {
      return NextResponse.json({ message: 'A positionId is required because the applicant has no applied position.' }, { status: 400 });
    }

    const positionResult = await client.query(`
      SELECT
        p.id,
        p.title,
        p.department,
        p.description,
        p."positionLevel",
        p."matchCriteria",
        p."customAttributes",
        p."isOpen"
      FROM "Position" p
      WHERE p.id = $1
    `, [positionId]);

    if (positionResult.rows.length === 0) {
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    const [attachmentsResult, matchesResult, evaluationsResult, commentsResult] = await Promise.all([
      client.query(`
        SELECT "fileName", "filePath", label, "isPrimary", "uploadedAt"
        FROM "Attachment"
        WHERE "applicantId" = $1
        ORDER BY "isPrimary" DESC, "uploadedAt" DESC
      `, [applicantId]),
      client.query(`
        SELECT jm."fitScore", jm."matchReasons", jm."jobTitle", jm."jobId", p.title as "positionTitle", p."matchCriteria"
        FROM "JobMatch" jm
        LEFT JOIN "Position" p ON jm."jobId" = p.id
        WHERE jm."applicant_id" = $1
        ORDER BY jm."fitScore" DESC NULLS LAST
        LIMIT 10
      `, [applicantId]),
      client.query(`
        SELECT ae."overallScore", ae.comments, ae.status, ae."completedAt", u.name as "evaluatorName"
        FROM "ApplicantEvaluation" ae
        LEFT JOIN "User" u ON ae."evaluatorId" = u.id
        WHERE ae."applicantId" = $1
        ORDER BY ae."completedAt" DESC NULLS LAST, ae."updatedAt" DESC
        LIMIT 10
      `, [applicantId]),
      client.query(`
        SELECT ac.content, ac."createdAt", u.name as "authorName"
        FROM "ApplicantComment" ac
        LEFT JOIN "User" u ON ac."authorId" = u.id
        WHERE ac."applicantId" = $1
        ORDER BY ac."createdAt" DESC
        LIMIT 10
      `, [applicantId])
    ]);

    const position = positionResult.rows[0];
    const configuredPrompt = promptOverride || await getSystemSetting('applicantEvaluationCriteriaPrompt') || DEFAULT_EVALUATION_PROMPT;
    const context = {
      applicant,
      position,
      resumesAndAttachments: attachmentsResult.rows,
      existingJobMatches: matchesResult.rows,
      interviewerEvaluations: evaluationsResult.rows,
      recruiterComments: commentsResult.rows
    };

    const prompt = buildEvaluationPrompt(configuredPrompt, context);
    const aiResult = await executeWithApiKeyFallback(
      async (apiKey, model, provider) => generateTextWithProvider(provider, apiKey, model, prompt, {
        temperature: 0.2,
        topK: 30,
        topP: 0.9,
        maxOutputTokens: 2048,
      }),
      'Applicant Fit Evaluation'
    );

    if (!aiResult.success) {
      return NextResponse.json({
        success: false,
        unavailable: true,
        message: `AI features are not available because all configured ${getProviderLabel(aiResult.provider)} keys failed. Please check your AI provider configuration.`,
        error: 'API_KEY_FAILURE',
        attempts: aiResult.attempts,
        lastError: aiResult.error
      });
    }

    const evaluation = normalizeEvaluationResult(parseJsonResponse(aiResult.data || ''));

    if (save) {
      const user = session.user as any;
      const hasGlobalSensitiveEditPermission = permissionMatches(user.modulePermissions, 'APPLICANTS_EDIT_SENSITIVE');
      const hasOwnSensitiveEditPermission = permissionMatches(user.modulePermissions, 'APPLICANTS_EDIT_SENSITIVE_OWN');

      if (user.role !== 'Admin' && !hasGlobalSensitiveEditPermission && !hasOwnSensitiveEditPermission) {
        return NextResponse.json({ message: 'Forbidden: Insufficient permissions to save applicant score data' }, { status: 403 });
      }

      if (user.role !== 'Admin' && !hasGlobalSensitiveEditPermission) {
        const editPermission = canEditApplicant(user, applicant.recruiterId, user.id);
        if (!editPermission.canEdit) {
          return NextResponse.json({ message: `Forbidden: ${editPermission.reason}` }, { status: 403 });
        }
      }

      await client.query('BEGIN');
      const parsedData = applicant.parsedData && typeof applicant.parsedData === 'object' ? applicant.parsedData : {};
      parsedData.job_applied = {
        ...parsedData.job_applied,
        fitScore: evaluation.fitScore,
        jobId: positionId,
        justification: evaluation.justification,
        aiEvaluation: {
          summary: evaluation.summary || '',
          strengths: evaluation.strengths || [],
          risks: evaluation.risks || [],
          evidence: evaluation.evidence || [],
          generatedAt: new Date().toISOString()
        }
      };

      await client.query(`
        UPDATE "Applicant"
        SET "parsedData" = $1, "fitScore" = $2, "positionId" = $3, "assignmentJustification" = $4, "updatedAt" = NOW()
        WHERE id = $5
      `, [parsedData, evaluation.fitScore, positionId, evaluation.justification.join('\n'), applicantId]);
      await client.query('COMMIT');
    }

    await logAudit(
      'AUDIT',
      `AI applicant fit evaluation generated for ${applicant.name}${save ? ' and saved' : ''}.`,
      'API:AI:EvaluateApplicantFit',
      session.user.id,
      { applicantId, positionId, fitScore: evaluation.fitScore, saved: save }
    );

    return NextResponse.json({
      success: true,
      saved: save,
      applicantId,
      positionId,
      evaluation
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors when no transaction was opened.
    }

    console.error('Error evaluating applicant fit:', error);
    await logAudit(
      'ERROR',
      `Failed to evaluate applicant fit: ${(error as Error).message}`,
      'API:AI:EvaluateApplicantFit',
      session.user?.id
    );
    return NextResponse.json({ message: `Failed to evaluate applicant fit: ${(error as Error).message}` }, { status: 500 });
  } finally {
    client.release();
  }
}

function buildEvaluationPrompt(configuredPrompt: string, context: Record<string, unknown>) {
  const contextJson = JSON.stringify(context, null, 2);
  const templatedPrompt = configuredPrompt
    .replace(/\{applicantData\}/g, contextJson)
    .replace(/\{positionData\}/g, JSON.stringify(context.position, null, 2))
    .replace(/\{resumeData\}/g, JSON.stringify((context as any).applicant?.parsedData || {}, null, 2))
    .replace(/\{evaluationData\}/g, JSON.stringify((context as any).interviewerEvaluations || [], null, 2));

  return `${templatedPrompt}

APPLICANT, RESUME, POSITION, MATCH, COMMENT, AND EVALUATION CONTEXT:
${contextJson}

Return only valid JSON with this exact shape:
{
  "fitScore": 0.82,
  "justification": ["specific evidence-based reason", "specific evidence-based reason"],
  "summary": "one concise hiring assessment",
  "strengths": ["strength"],
  "risks": ["risk or gap"],
  "evidence": ["resume or evaluation evidence used"]
}

Rules:
- fitScore must be a decimal from 0 to 1.
- justification must contain 3 to 6 concise bullets.
- Base the score on resume evidence and selected position criteria.
- If evidence is missing, lower confidence and mention the gap.
- Do not include markdown or prose outside the JSON object.`;
}

function parseJsonResponse(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 200)}`);
    }
    return JSON.parse(objectMatch[0]);
  }
}

function normalizeEvaluationResult(value: unknown): AiEvaluationResult {
  if (!value || typeof value !== 'object') {
    throw new Error('AI evaluation response was empty or invalid.');
  }

  const result = value as Partial<AiEvaluationResult>;
  const rawScore = Number(result.fitScore);
  if (!Number.isFinite(rawScore)) {
    throw new Error('AI evaluation response did not include a numeric fitScore.');
  }

  const fitScore = Math.max(0, Math.min(1, rawScore > 1 ? rawScore / 100 : rawScore));
  const justification = normalizeStringArray(result.justification);

  if (justification.length === 0) {
    justification.push('AI generated a score but did not provide detailed justification.');
  }

  return {
    fitScore,
    justification,
    summary: typeof result.summary === 'string' ? result.summary.trim() : undefined,
    strengths: normalizeStringArray(result.strengths),
    risks: normalizeStringArray(result.risks),
    evidence: normalizeStringArray(result.evidence)
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n\r]+|(?:^|\s)[-•]\s+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}
