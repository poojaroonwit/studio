import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createValidationError,
  createInternalServerError
} from '@/lib/errors';;
import { z } from 'zod';
import { searchCandidatesAIChat } from '@/ai/flows/search-candidates-flow';
import { logAudit } from '@/lib/auditLog';

/**
 * Generate match reasons for a candidate based on the search query and AI reasoning
 */
function generateMatchReasons(query: string, candidate: any, aiReasoning?: string): string[] {
  const reasons: string[] = [];
  const queryLower = query.toLowerCase();
  
  // Check for skill matches in parsed data
  if (candidate.parsedData) {
    const parsedData = candidate.parsedData;
    
    // Check skills
    if (parsedData.skills && Array.isArray(parsedData.skills)) {
      parsedData.skills.forEach((skill: any) => {
        if (skill.skill && queryLower.includes(skill.skill.toLowerCase())) {
          reasons.push(`Has ${skill.skill} skill`);
        }
      });
    }
    
    // Check education
    if (parsedData.education && Array.isArray(parsedData.education)) {
      parsedData.education.forEach((edu: any) => {
        if (edu.university && queryLower.includes(edu.university.toLowerCase())) {
          reasons.push(`Graduated from ${edu.university}`);
        }
        if (edu.major && queryLower.includes(edu.major.toLowerCase())) {
          reasons.push(`Studied ${edu.major}`);
        }
      });
    }
    
    // Check experience
    if (parsedData.experience && Array.isArray(parsedData.experience)) {
      parsedData.experience.forEach((exp: any) => {
        if (exp.company && queryLower.includes(exp.company.toLowerCase())) {
          reasons.push(`Worked at ${exp.company}`);
        }
        if (exp.position && queryLower.includes(exp.position.toLowerCase())) {
          reasons.push(`Has ${exp.position} experience`);
        }
      });
    }
  }
  
  // Check position match
  if (candidate.positionTitle && queryLower.includes(candidate.positionTitle.toLowerCase())) {
    reasons.push(`Applied for ${candidate.positionTitle} position`);
  }
  
  // Check fit score if mentioned in query
  if (queryLower.includes('fit score') || queryLower.includes('score')) {
    const score = candidate.fitScore < 1 ? Math.round(candidate.fitScore * 100) : candidate.fitScore;
    reasons.push(`Fit score: ${score}%`);
  }
  
  // Check status if mentioned in query
  if (candidate.status && queryLower.includes(candidate.status.toLowerCase())) {
    reasons.push(`Status: ${candidate.status}`);
  }
  
  // Check recruiter if mentioned in query
  if (candidate.recruiterName && queryLower.includes(candidate.recruiterName.toLowerCase())) {
    reasons.push(`Assigned to ${candidate.recruiterName}`);
  }
  
  // If no specific reasons found, use AI reasoning or generic match
  if (reasons.length === 0) {
    if (aiReasoning) {
      // Try to extract specific reasons from AI reasoning
      const reasoningLower = aiReasoning.toLowerCase();
      if (reasoningLower.includes('skill') || reasoningLower.includes('experience')) {
        reasons.push('Matches search criteria based on skills and experience');
      } else if (reasoningLower.includes('education')) {
        reasons.push('Matches search criteria based on education');
      } else {
        reasons.push('Matches search criteria');
      }
    } else {
      reasons.push('Matches search criteria');
    }
  }
  
  return reasons;
}

const searchCandidatesSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  positionId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

/**
 * @openapi
 * /api/v1/ai/search-candidates:
 *   post:
 *     summary: Search candidates using AI (V1 API)
 *     description: Search candidates using AI-powered semantic search. Requires Bearer token authentication.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query
 *                 example: "software engineer with React experience"
 *               positionId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional position ID to filter results
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               limit:
 *                 type: integer
 *                 default: 20
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Number of results to return
 *               offset:
 *                 type: integer
 *                 default: 0
 *                 minimum: 0
 *                 description: Offset for pagination
 *             required:
 *               - query
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       status:
 *                         type: string
 *                       fitScore:
 *                         type: number
 *                       matchReasons:
 *                         type: array
 *                         items:
 *                           type: string
 *                       parsedData:
 *                         type: object
 *                 total:
 *                   type: integer
 *                   description: Total number of matching candidates
 *                 query:
 *                   type: string
 *                   description: The search query used
 *                 aiReasoning:
 *                   type: string
 *                   description: AI explanation of why these candidates were matched
 *                 recordCount:
 *                   type: integer
 *                   description: Total number of candidates analyzed by AI
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
 *                     - id: "123e4567-e89b-12d3-a456-426614174000"
 *                       name: "Sample Candidate"
 *                       email: "john.doe@example.com"
 *                       phone: "+1234567890"
 *                       status: "Applied"
 *                       fitScore: 85
 *                       matchReasons: ["React experience", "Software engineering background"]
 *                       parsedData: {}
 *                   total: 1
 *                   query: "software engineer with React experience"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   path: "/api/v1/ai/search-candidates"
 *                   method: "POST"
 *                   statusCode: 200
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid request body"
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
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    
    if (!user) {
      return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = searchCandidatesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid request body'));
    }

    const { query, positionId, limit, offset } = validationResult.data;

    // Log the search request
    await logAudit('INFO', `AI search request: "${query}"${positionId ? ` for position ${positionId}` : ''}`, 'AI:SearchCandidates', user.id, {
      query,
      positionId,
      limit,
      offset
    });

    // Execute AI search using the existing flow
    const aiSearchResult = await searchCandidatesAIChat({ query });

    if (!aiSearchResult.matchedCandidateIds || aiSearchResult.matchedCandidateIds.length === 0) {
      return SimpleErrorHandler.createSuccessResponse(req, {
        data: [],
        total: 0,
        query: query,
        aiReasoning: aiSearchResult.aiReasoning || 'No candidates found matching the search criteria'
      }, 200);
    }

    // Get detailed candidate information for matched candidates
    const client = await getPool().connect();
    try {
      // Build the query to get candidate details
      let candidateQuery = `
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          c.fitScore,
          c.parsedData,
          c.customAttributes,
          c.applicationDate,
          c."createdAt",
          c."updatedAt",
          c."isPinned",
          c."pinnedAt",
          rs.name as status,
          p.title as positionTitle,
          p.department as positionDepartment,
          u.name as recruiterName,
          u.email as recruiterEmail,
          cs.name as sourceName,
          cs.logo as sourceLogo
        FROM "Candidate" c
        LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" u ON c."recruiterId" = u.id
        LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
        WHERE c.id = ANY($1)
      `;

      const queryParams: any[] = [aiSearchResult.matchedCandidateIds];
      
      // Add position filter if specified
      if (positionId) {
        candidateQuery += ` AND c."positionId" = $2`;
        queryParams.push(positionId);
      }

      // Add ordering and pagination
      candidateQuery += ` ORDER BY c."createdAt" DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const candidateResult = await client.query(candidateQuery, queryParams);
      const candidates = candidateResult.rows;

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM "Candidate" c
        WHERE c.id = ANY($1)
      `;
      const countParams: any[] = [aiSearchResult.matchedCandidateIds];
      
      if (positionId) {
        countQuery += ` AND c."positionId" = $2`;
        countParams.push(positionId);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      // Format the response data
      const formattedCandidates = candidates.map((candidate: any) => {
        // Parse match reasons from AI reasoning or generate based on query
        const matchReasons = generateMatchReasons(query, candidate, aiSearchResult.aiReasoning);

        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          status: candidate.status,
          fitScore: candidate.fitScore,
          matchReasons,
          parsedData: candidate.parsedData,
          customAttributes: candidate.customAttributes,
          applicationDate: candidate.applicationDate,
          createdAt: candidate.createdAt,
          updatedAt: candidate.updatedAt,
          isPinned: candidate.isPinned,
          pinnedAt: candidate.pinnedAt,
          positionTitle: candidate.positionTitle,
          positionDepartment: candidate.positionDepartment,
          recruiterName: candidate.recruiterName,
          recruiterEmail: candidate.recruiterEmail,
          sourceName: candidate.sourceName,
          sourceLogo: candidate.sourceLogo
        };
      });

      const response = {
        data: formattedCandidates,
        total: total,
        query: query,
        aiReasoning: aiSearchResult.aiReasoning,
        recordCount: aiSearchResult.recordCount
      };

      return SimpleErrorHandler.createSuccessResponse(req, response, 200);

    } finally {
      client.release();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`AI search failed: ${errorMessage}`));
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
}
