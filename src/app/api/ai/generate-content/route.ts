import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { executeWithApiKeyFallback } from '@/lib/aiApiKeyManager';
import { buildGeminiApiUrl } from '@/lib/aiModelManager';
import { z } from 'zod';

export const dynamic = 'force-dynamic';


const generateContentSchema = z.object({
  candidateId: z.string().min(1, 'Candidate ID is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  promptName: z.string().optional(),
  promptCategory: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = generateContentSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ 
      message: 'Validation failed', 
      errors: validationResult.error.flatten().fieldErrors 
    }, { status: 400 });
  }

  const { candidateId, systemPrompt, promptName, promptCategory } = validationResult.data;

  try {
    // Get comprehensive candidate data including job and matching information
    async function getCandidateData(candidateId: string) {
      const client = await getPool().connect();
      try {
        // Get candidate basic information including education and experience
        const candidateQuery = `
          SELECT 
            c.id,
            c.name,
            c.email,
            c.phone,
            c."statusId",
            c."applicationDate",
            c."fitScore",
            c."dataAiHint",
            c."customAttributes",
            c."parsedData",
            c."assignmentJustification",
            c."educationData",
            c."experienceData",
            c."resumePath",
            c."avatarUrl",
            c."createdAt",
            c."updatedAt",
            p.id as "positionId",
            p.title as "positionTitle",
            p.department as "positionDepartment",
            p.description as "positionDescription",
            p."positionLevel" as "positionLevel",
            p."isOpen" as "positionIsOpen",
            p."customAttributes" as "positionCustomAttributes",
            u.name as "recruiterName",
            u.email as "recruiterEmail",
            rs.name as "currentStage",
            rs.description as "stageDescription",
            rs.color_badge as "stageColor"
          FROM "Candidate" c
          LEFT JOIN "Position" p ON c."positionId" = p.id
          LEFT JOIN "User" u ON c."recruiterId" = u.id
          LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
          WHERE c.id = $1
        `;
        
        const candidateResult = await client.query(candidateQuery, [candidateId]);
        
        if (candidateResult.rows.length === 0) {
          throw new Error('Candidate not found');
        }
        
        const candidate = candidateResult.rows[0];
        
        // Get candidate comments (from CandidateComment table)
        const candidateCommentsQuery = `
          SELECT 
            cc.content,
            cc."createdAt",
            u.name as "createdBy"
          FROM "CandidateComment" cc
          LEFT JOIN "User" u ON cc."authorId" = u.id
          WHERE cc."candidateId" = $1
          ORDER BY cc."createdAt" DESC
          LIMIT 10
        `;
        
        const candidateCommentsResult = await client.query(candidateCommentsQuery, [candidateId]);
        
        // Get candidate transition records
        const transitionRecordsQuery = `
          SELECT 
            tr.stage,
            tr.date,
            tr.notes,
            tr."actingUserId",
            u.name as "actingUserName"
          FROM "TransitionRecord" tr
          LEFT JOIN "User" u ON tr."actingUserId" = u.id
          WHERE tr."candidateId" = $1
          ORDER BY tr.date DESC
          LIMIT 10
        `;
        
        const transitionRecordsResult = await client.query(transitionRecordsQuery, [candidateId]);
        
        // Get candidate attachments
        const attachmentsQuery = `
          SELECT 
            a."fileName",
            a."filePath",
            a.label,
            a."isPrimary",
            a."uploadedAt",
            u.name as "uploadedByName"
          FROM "Attachment" a
          LEFT JOIN "User" u ON a."uploadedById" = u.id
          WHERE a."candidateId" = $1
          ORDER BY a."uploadedAt" DESC
        `;
        
        const attachmentsResult = await client.query(attachmentsQuery, [candidateId]);
        

        
        // Get all job matches for the candidate (not just the applied position)
        const matchesQuery = `
          SELECT 
            jm."fitScore",
            jm."matchReasons",
            jm."createdAt",
            jm."job_description_summary",
            jm."jobId",
            jm."jobTitle",
            p.title as "positionTitle",
            p.department as "positionDepartment",
            p.description as "positionDescription",
            p."positionLevel" as "positionLevel",
            p."isOpen" as "positionIsOpen",
            p."customAttributes" as "positionCustomAttributes",
            p."matchCriteria" as "positionMatchCriteria",
            p."createdAt" as "positionCreatedAt",
            p."updatedAt" as "positionUpdatedAt"
          FROM "JobMatch" jm
          LEFT JOIN "Position" p ON jm."jobId" = p.id
          WHERE jm."candidateId" = $1
          ORDER BY jm."fitScore" DESC, jm."createdAt" DESC
          LIMIT 10
        `;
        
        const matchesResult = await client.query(matchesQuery, [candidateId]);
        const jobMatches = matchesResult.rows;
        
        // Get the applied position data separately
        let appliedPositionData = null;
        if (candidate.positionId) {
          const appliedPositionQuery = `
            SELECT 
              p.id,
              p.title,
              p.department,
              p.description,
              p."positionLevel",
              p."isOpen",
              p."customAttributes",
              p."matchCriteria",
              p."createdAt",
              p."updatedAt"
            FROM "Position" p
            WHERE p.id = $1
          `;
          
          const appliedPositionResult = await client.query(appliedPositionQuery, [candidate.positionId]);
          if (appliedPositionResult.rows.length > 0) {
            appliedPositionData = appliedPositionResult.rows[0];
          }
        }
        
        return {
          candidate,
          comments: candidateCommentsResult.rows,
          transitions: transitionRecordsResult.rows,
          resumes: [], // No separate Resume table, resumes are stored in Candidate.resumePath
          attachments: attachmentsResult.rows,
          candidateComments: candidateCommentsResult.rows,
          transitionRecords: transitionRecordsResult.rows,
          jobMatches,
          appliedPositionData
        };
      } finally {
        client.release();
      }
    }

    // Fetch comprehensive candidate data
    const candidateData = await getCandidateData(candidateId);
    const { candidate, comments, transitions, resumes, attachments, candidateComments, transitionRecords, jobMatches, appliedPositionData } = candidateData;

    // Create comprehensive context data for AI
    const candidateContext = {
      basicInfo: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        status: candidate.currentStage || 'Unknown',
        applicationDate: candidate.applicationDate,
        fitScore: candidate.fitScore,
        dataAiHint: candidate.dataAiHint,
        customAttributes: candidate.customAttributes,
        parsedData: candidate.parsedData,
        assignmentJustification: candidate.assignmentJustification,
        avatarUrl: candidate.avatarUrl
      },
      education: candidate.educationData || [],
      experience: candidate.experienceData || [],
      position: appliedPositionData ? {
        id: appliedPositionData.id,
        title: appliedPositionData.title,
        department: appliedPositionData.department,
        description: appliedPositionData.description,
        level: appliedPositionData.positionLevel,
        isOpen: appliedPositionData.isOpen,
        customAttributes: appliedPositionData.customAttributes,
        matchCriteria: appliedPositionData.matchCriteria,
        createdAt: appliedPositionData.createdAt,
        updatedAt: appliedPositionData.updatedAt
      } : null,
      recruiter: candidate.recruiterName ? {
        name: candidate.recruiterName,
        email: candidate.recruiterEmail
      } : null,
      currentStage: {
        name: candidate.currentStage,
        description: candidate.stageDescription,
        color: candidate.stageColor
      },
      documents: {
        resumePath: candidate.resumePath,
        attachments: attachments
      },
      history: {
        comments: comments,
        candidateComments: candidateComments,
        transitions: transitions,
        transitionRecords: transitionRecords,
        jobMatches: jobMatches
      },
      opportunities: {
        appliedPosition: appliedPositionData ? {
          id: appliedPositionData.id,
          title: appliedPositionData.title,
          department: appliedPositionData.department,
          description: appliedPositionData.description,
          level: appliedPositionData.positionLevel,
          isOpen: appliedPositionData.isOpen,
          customAttributes: appliedPositionData.customAttributes,
          matchCriteria: appliedPositionData.matchCriteria,
          createdAt: appliedPositionData.createdAt,
          updatedAt: appliedPositionData.updatedAt
        } : null,
                 potentialMatches: jobMatches.map((match: any) => ({
           jobId: match.jobId,
           jobTitle: match.jobTitle || match.positionTitle,
           positionTitle: match.positionTitle,
           department: match.positionDepartment,
           description: match.positionDescription,
           level: match.positionLevel,
           isOpen: match.positionIsOpen,
           customAttributes: match.positionCustomAttributes,
           matchCriteria: match.positionMatchCriteria,
           fitScore: match.fitScore,
           matchReasons: match.matchReasons,
           jobDescriptionSummary: match.job_description_summary,
           matchedAt: match.createdAt,
           positionCreatedAt: match.positionCreatedAt,
           positionUpdatedAt: match.positionUpdatedAt
         })),
        topMatches: jobMatches
          .filter((match: any) => match.fitScore > 0.7)
          .slice(0, 3)
          .map((match: any) => ({
            jobTitle: match.jobTitle || match.positionTitle,
            department: match.positionDepartment,
            fitScore: match.fitScore,
            matchReasons: match.matchReasons
          })),
        matchCriteriaAnalysis: {
          appliedPositionCriteria: appliedPositionData?.matchCriteria || null,
          highMatchPositions: jobMatches
            .filter((match: any) => match.fitScore > 0.8)
            .map((match: any) => ({
              positionTitle: match.positionTitle,
              department: match.positionDepartment,
              matchCriteria: match.positionMatchCriteria,
              fitScore: match.fitScore,
              matchReasons: match.matchReasons
            })),
          criteriaComparison: jobMatches
            .filter((match: any) => match.positionMatchCriteria)
            .map((match: any) => ({
              positionTitle: match.positionTitle,
              matchCriteria: match.positionMatchCriteria,
              fitScore: match.fitScore,
              matchReasons: match.matchReasons
            }))
        }
      }
    };

    // Create a comprehensive prompt for AI generation
    const contextInfo = `for candidate: ${candidate.name}`;
    const detailedContext = `
CANDIDATE CONTEXT:
${JSON.stringify(candidateContext, null, 2)}

SYSTEM PROMPT:
${systemPrompt}

Please generate professional, well-formatted content based on the system prompt above, using all the comprehensive candidate and job data provided. 

IMPORTANT: Pay special attention to the candidate's education and experience data, as these are crucial for understanding their qualifications and background. Consider:

- Education history, degrees, institutions, and graduation dates
- Work experience, job titles, companies, responsibilities, and duration
- Skills and competencies demonstrated through their experience
- How their education and experience align with the position requirements
- Career progression and growth patterns
- Parsed data from resumes and documents
- Assignment justification and reasoning
- Custom attributes and additional candidate information
- Resume file path and uploaded attachments
- Detailed transition history and stage progression
- All comments and feedback from recruiters and team members
- Job matching scores and criteria

POSITION AND OPPORTUNITY ANALYSIS:
- The candidate's applied position and its specific requirements, including detailed match criteria
- All potential job matches with fit scores and match reasons
- Top 3 highest-scoring position matches (fit score > 70%)
- Alternative career opportunities and growth paths
- How the candidate's profile aligns with different positions and departments
- Recommendations for position transitions or career development
- Analysis of the candidate's fit across multiple positions and career trajectories
- Insights into the candidate's potential for different roles and responsibilities
- Strategic recommendations for career advancement opportunities

MATCH CRITERIA AND JOB DESCRIPTION ANALYSIS:
- Detailed analysis of the applied position's match criteria and requirements
- Comparison of candidate qualifications against specific position criteria
- Analysis of job descriptions and how they align with candidate experience
- Evaluation of match criteria across different positions and departments
- Identification of skill gaps and areas for development
- Assessment of how well the candidate meets each position's specific requirements
- Recommendations based on match criteria alignment and job description fit
- Strategic insights into the candidate's suitability for different role types

Also consider the candidate's background, position requirements, matching scores, comments, transition history, and all available context to provide the most relevant and insightful analysis.

Format the response in HTML with appropriate headings (h2, h3) and bullet points (ul, li) where appropriate. Make it comprehensive and professional.

Return ONLY the HTML-formatted content without any additional text or explanations.`;

    // Call Google Gemini API with fallback
    const result = await executeWithApiKeyFallback(async (apiKey, model) => {
      // Normalize model name (extract from path if needed)
      const { normalizeModelName } = await import('@/lib/geminiModels');
      let modelName = normalizeModelName(model);
      
      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent`;
      
      const fetchRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: detailedContext }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        }),
      });

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        console.error('Generative AI: HTTP Error Response:', fetchRes.status, fetchRes.statusText);
        console.error('Generative AI: Error Details:', errorText);
        throw new Error(`Gemini API error: ${fetchRes.status} ${fetchRes.statusText} - ${errorText}`);
      }

      const data = await fetchRes.json();
      
      // Check for API errors
      if (data.error) {
        console.error('Generative AI: Gemini API error:', data.error);
        throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      let generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!generatedContent.trim()) {
        console.error('Generative AI: Empty response from Gemini API');
        console.error('Generative AI: Full response data:', JSON.stringify(data, null, 2));
        throw new Error('No content generated by AI');
      }

      return generatedContent;
    }, 'Generate Content');

    if (!result.success) {
      console.error('Generative AI: All API keys failed');
      return NextResponse.json(
        { 
          message: 'AI features are not available due to API key failures. Please check your API key configuration.',
          error: 'API_KEY_FAILURE',
          attempts: result.attempts,
          lastError: result.error
        },
        { status: 503 }
      );
    }

    let generatedContent = result.data;

    // Clean up the response - remove markdown code blocks if present
    generatedContent = generatedContent
      .replace(/```html\s*/gi, '')  // Remove opening ```html
      .replace(/```\s*$/gi, '')     // Remove closing ```
      .trim();

    // Log the AI generation activity
    await logAudit(
      'AUDIT',
      `AI content generated using prompt: ${promptName} (${promptCategory}) for candidate: ${candidate.name}`,
      'API:AI:GenerateContent',
      session.user.id,
      { candidateId, candidateName: candidate.name, promptName, promptCategory }
    );

    return NextResponse.json({ 
      content: generatedContent,
      promptUsed: promptName,
      category: promptCategory
    });
  } catch (error) {
    console.error('Error generating content:', error);
    await logAudit(
      'ERROR',
      `Failed to generate AI content: ${(error as Error).message}`,
      'API:AI:GenerateContent',
      session.user?.id
    );
    
    return NextResponse.json({ message: `Failed to generate content: ${(error as Error).message}` }, { status: 500 });
  }
}
