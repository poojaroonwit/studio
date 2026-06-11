export const APPLICANT_DETAIL_QUERY = `
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c."statusId",
    rs.name as "status",
    c."positionId",
    c."recruiterId",
    c."sourceId",
    c."fitScore",
    c."avatarUrl",
    c."resumePath",
    c."assignmentJustification",
    c."parsedData",
    c."customAttributes",
    c.expected_salary as "expectedSalary",
    c."createdAt",
    c."updatedAt",
    c."applicationDate",
    c."isPinned",
    c."pinnedAt",
    c."isBlacklisted",
    p.title as "positionTitle", 
    p.department as "positionDepartment",
    r.name as "recruiterName", 
    r."avatarUrl" as "recruiterAvatarUrl",
    cs.name as "sourceName", 
    cs.description as "sourceDescription", 
    cs.logo as "sourceLogo"
  FROM "Applicant" c
  LEFT JOIN "Position" p ON c."positionId" = p.id
  LEFT JOIN "User" r ON c."recruiterId" = r.id
  LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
  LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
  WHERE c.id = $1::uuid
`;

export const APPLICANT_DETAIL_JOB_MATCHES_QUERY = `
  SELECT 
    jm.id,
    jm."applicant_id",
    jm."jobId",
    jm."fitScore",
    jm."createdAt",
    jm."updatedAt",
    p.title as "positionTitle",
    p.department as "positionDepartment",
    p.description as "positionDescription"
  FROM "JobMatch" jm
  LEFT JOIN "Position" p ON jm."jobId" = p.id
  WHERE jm."applicant_id" = $1::uuid
  ORDER BY jm."fitScore" DESC
  LIMIT 3
`;

export const APPLICANT_DETAIL_ATTACHMENTS_QUERY = `
  SELECT 
    a.id,
    a."applicantId",
    a."uploadedById",
    a."filePath",
    a."fileName",
    a.label,
    a."isPrimary",
    a."uploadedAt",
    a."updatedAt",
    a."headcountId",
    u.name as "uploadedByUserName"
  FROM "Attachment" a
  LEFT JOIN "User" u ON a."uploadedById" = u.id
  WHERE a."applicantId" = $1::uuid
  ORDER BY a."uploadedAt" DESC
  LIMIT 2
`;

export const APPLICANT_AFTER_UPDATE_QUERY = `
  SELECT c.*, c."isBlacklisted", p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName",
         cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
  FROM "Applicant" c
  LEFT JOIN "Position" p ON c."positionId" = p.id
  LEFT JOIN "User" r ON c."recruiterId" = r.id
  LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
  WHERE c.id = $1::uuid;
`;

export const APPLICANT_UPDATE_JOB_MATCHES_QUERY = `
  SELECT jm.*, p.title as "positionTitle"
  FROM "JobMatch" jm
  LEFT JOIN "Position" p ON jm."jobId" = p.id
  WHERE jm."applicant_id" = $1::uuid
  ORDER BY jm."fitScore" DESC;
`;

export const APPLICANT_UPDATE_ATTACHMENTS_QUERY = `
  SELECT 
    a.id,
    a."applicantId",
    a."uploadedById",
    a."filePath",
    a."fileName",
    a.label,
    a."isPrimary",
    a."uploadedAt",
    a."updatedAt",
    a."headcountId",
    u.name as "uploadedByUserName"
  FROM "Attachment" a
  LEFT JOIN "User" u ON a."uploadedById" = u.id
  WHERE a."applicantId" = $1::uuid
  ORDER BY a."uploadedAt" DESC;
`;
