import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import type { QueryResultRow } from 'pg';
import { executeWithApiKeyFallback } from '../aiApiKeyManager';
import { generateTextWithProvider, getProviderLabel } from '../aiProvider';
import type { DbClient } from '../db';
import { minioClient } from '../minio';
import { MINIO_BUCKET } from '../minio-constants';
import {
  getString,
  isRecord,
  normalizeBuiltInApplicant,
  normalizeBuiltInJobMatches,
  parseBuiltInResumeProcessorJson,
  type BuiltInApplicant,
  type BuiltInJobMatch,
} from './built-in-resume-processor-utils';
import type { ResumeProcessingWebhookSettings } from './resume-processing-webhook-settings';

type BuiltInProcessorJob = Record<string, unknown> & {
  id: string;
  file_name?: string | null;
  file_path: string;
  webhook_payload?: unknown;
  position_id?: string | null;
  source_id?: string | null;
  sub_source?: string | null;
  created_by?: string | null;
  email_date?: string | Date | null;
  email_subject?: string | null;
  email_id?: string | null;
  email_metadata?: unknown;
};

type BuiltInProcessorPayload = Record<string, unknown> & {
  processor_mode: 'built-in';
  processed_by_external_webhook: false;
  built_in_processor_node: string;
  status: 'success';
  applicant_id: string;
};

type ApplicantRow = QueryResultRow & {
  id: string;
  name: string;
  email: string;
};

function getPayloadRecord(job: BuiltInProcessorJob) {
  return isRecord(job.webhook_payload) ? job.webhook_payload : {};
}

function getTargetPositionId(job: BuiltInProcessorJob) {
  const payload = getPayloadRecord(job);
  return getString(payload.targetPositionId) || getString(payload.positionId) || getString(job.position_id);
}

function getSourceId(job: BuiltInProcessorJob) {
  const payload = getPayloadRecord(job);
  return getString(payload.sourceId) || getString(job.source_id);
}

function getSubSource(job: BuiltInProcessorJob) {
  const payload = getPayloadRecord(job);
  return getString(payload.subSource) || getString(payload.sub_source) || getString(job.sub_source);
}

function getExistingApplicantId(job: BuiltInProcessorJob) {
  const payload = getPayloadRecord(job);
  return getString(payload.Applicant_id) || getString(payload.applicantId) || getString(payload.applicant_id);
}

export async function processBuiltInResumeUploadQueueJob({
  client,
  job,
  settings,
}: {
  client: DbClient;
  job: BuiltInProcessorJob;
  settings: ResumeProcessingWebhookSettings;
}) {
  const resumeText = await extractResumeText(job);
  const aiResponse = await runBuiltInResumeAi({ job, resumeText, settings });
  const parsed = parseBuiltInResumeProcessorJson(aiResponse);
  const applicant = normalizeBuiltInApplicant(parsed, job.file_name);
  const targetPositionId = getTargetPositionId(job);
  const jobMatches = normalizeBuiltInJobMatches(parsed, targetPositionId);
  const applicantId = await upsertBuiltInApplicant({
    applicant,
    client,
    job,
    jobMatches,
    targetPositionId,
  });

  return buildBuiltInPayload({
    aiResponse,
    applicant,
    applicantId,
    job,
    jobMatches,
    parsed,
    resumeText,
    settings,
  });
}

async function extractResumeText(job: BuiltInProcessorJob) {
  const buffer = await downloadUploadQueueObject(job.file_path);
  const extension = (job.file_name || job.file_path).split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    return extractDocxText(buffer);
  }

  if (extension === 'txt' || extension === 'md' || extension === 'csv') {
    return buffer.toString('utf8').replace(/\s+/g, ' ').trim();
  }

  if (extension === 'pdf') {
    return extractPdfTextBestEffort(buffer);
  }

  return buffer.toString('utf8').replace(/\s+/g, ' ').trim();
}

async function downloadUploadQueueObject(filePath: string) {
  const fileStream = await minioClient.getObject(MINIO_BUCKET, filePath);
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    fileStream.on('end', resolve);
    fileStream.on('error', reject);
  });

  return Buffer.concat(chunks);
}

async function extractDocxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('DOCX document text could not be read');
  }

  return documentXml
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPdfTextBestEffort(buffer: Buffer) {
  const raw = buffer.toString('latin1');
  const matches = [...raw.matchAll(/\(([^()]{2,})\)/g)]
    .map((match) => match[1])
    .map((text) => text.replace(/\\([()\\])/g, '$1').replace(/\\n/g, ' '))
    .join(' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!matches) {
    throw new Error('PDF text could not be extracted by the built-in processor');
  }

  return matches;
}

async function runBuiltInResumeAi({
  job,
  resumeText,
  settings,
}: {
  job: BuiltInProcessorJob;
  resumeText: string;
  settings: ResumeProcessingWebhookSettings;
}) {
  if (!resumeText) {
    throw new Error('Resume text is empty after extraction');
  }

  const prompt = buildBuiltInResumePrompt({ job, resumeText, settings });
  const result = await executeWithApiKeyFallback(
    (apiKey, model, provider) => generateTextWithProvider(provider, apiKey, model, prompt, {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 8192,
    }),
    'Built-in Resume Processing'
  );

  if (!result.success || !result.data) {
    throw new Error(
      `Built-in resume processing AI failed for ${getProviderLabel(result.provider)}: ${result.error || 'No response'}`
    );
  }

  return result.data;
}

function buildBuiltInResumePrompt({
  job,
  resumeText,
  settings,
}: {
  job: BuiltInProcessorJob;
  resumeText: string;
  settings: ResumeProcessingWebhookSettings;
}) {
  const payload = getPayloadRecord(job);

  return [
    settings.builtInResumeExtractionPrompt || 'Extract structured candidate information from the resume.',
    settings.builtInApplicantMappingPrompt || 'Map the extracted data to the applicant fields used by an ATS.',
    settings.builtInJobMatchingPrompt || 'Score the candidate against the target job when job context is available.',
    '',
    'Return only valid JSON with this shape:',
    '{"applicant":{"name":"","email":"","phone":"","fitScore":null,"parsedData":{}},"job_matches":[{"jobId":"","jobTitle":"","fitScore":null,"matchReasons":[],"job_description_summary":""}]}',
    '',
    `Queue job id: ${job.id}`,
    `Target position id: ${getTargetPositionId(job) || ''}`,
    `Source id: ${getSourceId(job) || ''}`,
    `Sub source: ${getSubSource(job) || ''}`,
    `Original payload: ${JSON.stringify(payload)}`,
    '',
    'Resume text:',
    resumeText.slice(0, 60000),
  ].join('\n');
}

async function upsertBuiltInApplicant({
  applicant,
  client,
  job,
  jobMatches,
  targetPositionId,
}: {
  applicant: BuiltInApplicant;
  client: DbClient;
  job: BuiltInProcessorJob;
  jobMatches: BuiltInJobMatch[];
  targetPositionId: string | null;
}) {
  await client.query('BEGIN');

  try {
    const existingApplicantId = getExistingApplicantId(job);
    const existing = existingApplicantId
      ? await findApplicantById(client, existingApplicantId)
      : await findApplicantByEmail(client, applicant.email);

    const applicantId = existing?.id || randomUUID();
    const statusId = await resolveAppliedStatusId(client);

    if (existing) {
      await updateExistingApplicant({ applicant, applicantId, client, job, targetPositionId });
    } else {
      await insertBuiltInApplicant({ applicant, applicantId, client, job, statusId, targetPositionId });
    }

    await replaceResumeAttachment({ applicantId, client, job });
    await replaceJobMatches({ applicantId, client, jobMatches });
    await client.query('COMMIT');
    return applicantId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function findApplicantById(client: DbClient, applicantId: string) {
  const result = await client.query<ApplicantRow>('SELECT id, name, email FROM "Applicant" WHERE id = $1 LIMIT 1', [applicantId]);
  return result.rows[0] ?? null;
}

async function findApplicantByEmail(client: DbClient, email: string) {
  const result = await client.query<ApplicantRow>('SELECT id, name, email FROM "Applicant" WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
  return result.rows[0] ?? null;
}

async function resolveAppliedStatusId(client: DbClient) {
  const result = await client.query<{ id: string }>(
    'SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = $1 LIMIT 1',
    ['applied']
  );

  return result.rows[0]?.id || null;
}

async function insertBuiltInApplicant({
  applicant,
  applicantId,
  client,
  job,
  statusId,
  targetPositionId,
}: {
  applicant: BuiltInApplicant;
  applicantId: string;
  client: DbClient;
  job: BuiltInProcessorJob;
  statusId: string | null;
  targetPositionId: string | null;
}) {
  await client.query(
    `INSERT INTO "Applicant" (
      id, name, email, phone, "positionId", "fitScore", "statusId", "parsedData", "customAttributes",
      "applicationDate", "sourceId", "subSource", "resumePath", "emailDate", "emailSubject", "emailId",
      "emailMetadata", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '{}', NOW(), $9, $10, $11, $12, $13, $14, $15, NOW())`,
    [
      applicantId,
      applicant.name,
      applicant.email,
      applicant.phone,
      targetPositionId,
      applicant.fitScore,
      statusId,
      applicant.parsedData,
      getSourceId(job),
      getSubSource(job),
      job.file_path,
      job.email_date ? new Date(job.email_date) : null,
      job.email_subject || null,
      job.email_id || null,
      isRecord(job.email_metadata) ? job.email_metadata : null,
    ]
  );
}

async function updateExistingApplicant({
  applicant,
  applicantId,
  client,
  job,
  targetPositionId,
}: {
  applicant: BuiltInApplicant;
  applicantId: string;
  client: DbClient;
  job: BuiltInProcessorJob;
  targetPositionId: string | null;
}) {
  await client.query(
    `UPDATE "Applicant"
     SET name = COALESCE(NULLIF($2, ''), name),
         email = COALESCE(NULLIF($3, ''), email),
         phone = COALESCE($4, phone),
         "positionId" = COALESCE($5, "positionId"),
         "fitScore" = COALESCE($6, "fitScore"),
         "parsedData" = COALESCE("parsedData", '{}'::jsonb) || $7::jsonb,
         "sourceId" = COALESCE($8, "sourceId"),
         "subSource" = COALESCE($9, "subSource"),
         "resumePath" = $10,
         "emailDate" = COALESCE($11, "emailDate"),
         "emailSubject" = COALESCE($12, "emailSubject"),
         "emailId" = COALESCE($13, "emailId"),
         "emailMetadata" = COALESCE($14, "emailMetadata"),
         "updatedAt" = NOW()
     WHERE id = $1`,
    [
      applicantId,
      applicant.name,
      applicant.email,
      applicant.phone,
      targetPositionId,
      applicant.fitScore,
      JSON.stringify(applicant.parsedData),
      getSourceId(job),
      getSubSource(job),
      job.file_path,
      job.email_date ? new Date(job.email_date) : null,
      job.email_subject || null,
      job.email_id || null,
      isRecord(job.email_metadata) ? job.email_metadata : null,
    ]
  );
}

async function replaceResumeAttachment({
  applicantId,
  client,
  job,
}: {
  applicantId: string;
  client: DbClient;
  job: BuiltInProcessorJob;
}) {
  const uploadedById = getString(job.created_by);
  if (!uploadedById) {
    return;
  }

  await client.query(
    `UPDATE "Attachment" SET "isPrimary" = false, "updatedAt" = NOW()
     WHERE "applicantId" = $1 AND label = 'Resume'`,
    [applicantId]
  );
  await client.query(
    `INSERT INTO "Attachment" (id, "applicantId", "uploadedById", "filePath", "fileName", label, "isPrimary", "uploadedAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'Resume', true, NOW(), NOW(), NOW())`,
    [randomUUID(), applicantId, uploadedById, job.file_path, job.file_name || job.file_path]
  );
}

async function replaceJobMatches({
  applicantId,
  client,
  jobMatches,
}: {
  applicantId: string;
  client: DbClient;
  jobMatches: BuiltInJobMatch[];
}) {
  if (jobMatches.length === 0) {
    return;
  }

  await client.query('DELETE FROM "JobMatch" WHERE "applicant_id" = $1', [applicantId]);

  for (const match of jobMatches) {
    await client.query(
      `INSERT INTO "JobMatch" (id, "applicant_id", "jobId", "jobTitle", "fitScore", "matchReasons", "job_description_summary", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        randomUUID(),
        applicantId,
        match.jobId,
        match.jobTitle,
        match.fitScore,
        match.matchReasons,
        match.job_description_summary,
      ]
    );
  }
}

function buildBuiltInPayload({
  aiResponse,
  applicant,
  applicantId,
  job,
  jobMatches,
  parsed,
  resumeText,
  settings,
}: {
  aiResponse: string;
  applicant: BuiltInApplicant;
  applicantId: string;
  job: BuiltInProcessorJob;
  jobMatches: BuiltInJobMatch[];
  parsed: Record<string, unknown>;
  resumeText: string;
  settings: ResumeProcessingWebhookSettings;
}): BuiltInProcessorPayload {
  return {
    ...getPayloadRecord(job),
    processor_mode: 'built-in',
    processed_by_external_webhook: false,
    built_in_processor_node: settings.builtInProcessorNodeName,
    status: 'success',
    applicant_id: applicantId,
    applicant: {
      id: applicantId,
      name: applicant.name,
      email: applicant.email,
      phone: applicant.phone,
      fitScore: applicant.fitScore,
    },
    job_matches: jobMatches,
    parsed_result: parsed,
    ai_response: aiResponse,
    extracted_text_preview: resumeText.slice(0, 2000),
  };
}
