import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { executeWithApiKeyFallback } from '@/lib/aiApiKeyManager';
import { buildGeminiApiUrl } from '@/lib/aiModelManager';
import { z } from 'zod';

export const dynamic = 'force-dynamic';


const generateContentSchema = z.object({
  applicantId: z.string().min(1, 'Applicant ID is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  promptName: z.string().optional(),
  promptCategory: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  
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

  const { systemPrompt, promptName, promptCategory } = validationResult.data;
  const targetApplicantId = validationResult.data.applicantId;

  try {
    // Get comprehensive Applicant data including job and matching information
    async function getApplicantData(applicantId: string) {
      const client = await getPool().connect();
      try {
        // Get applicant basic information including education and experience
        const applicantQuery = `
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
          FROM "applicant" c
          LEFT JOIN "Position" p ON c."positionId" = p.id
          LEFT JOIN "User" u ON c."recruiterId" = u.id
          LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
          WHERE c.id = $1
        `;
        
        const applicantResult = await client.query(applicantQuery, [applicantId]);
        
        if (applicantResult.rows.length === 0) {
          throw new Error('Applicant not found');
        }
        
        const applicant = applicantResult.rows[0];
        
        // Get applicant comments (from applicantComment table)
        const applicantCommentsQuery = `
          SELECT 
            cc.content,
            cc."createdAt",
            u.name as "createdBy"
          FROM "applicantComment" cc
          LEFT JOIN "User" u ON cc."authorId" = u.id
          WHERE cc."applicantId" = $1
          ORDER BY cc."createdAt" DESC
          LIMIT 10
        `;
        
        const applicantCommentsResult = await client.query(applicantCommentsQuery, [applicantId]);
        
        // Get Applicant transition records
        const transitionRecordsQuery = `
          SELECT 
            tr.stage,
            tr.date,
            tr.notes,
            tr."actingUserId",
            u.name as "actingUserName"
          FROM "TransitionRecord" tr
          LEFT JOIN "User" u ON tr."actingUserId" = u.id
          WHERE tr."applicantId" = $1
          ORDER BY tr.date DESC
          LIMIT 10
        `;
        
        const transitionRecordsResult = await client.query(transitionRecordsQuery, [applicantId]);
        
        // Get Applicant attachments
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
          WHERE a."applicantId" = $1
          ORDER BY a."uploadedAt" DESC
        `;
        
        const attachmentsResult = await client.query(attachmentsQuery, [applicantId]);
        

        
        // Get all job matches for the Applicant (not just the applied position)
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
          WHERE jm."applicantId" = $1
          ORDER BY jm."fitScore" DESC, jm."createdAt" DESC
          LIMIT 10
        `;
        
        const matchesResult = await client.query(matchesQuery, [applicantId]);
        const jobMatches = matchesResult.rows;
        
        // Get the applied position data separately
        let appliedPositionData = null;
        if (applicant.positionId) {
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
          
          const appliedPositionResult = await client.query(appliedPositionQuery, [applicant.positionId]);
          if (appliedPositionResult.rows.length > 0) {
            appliedPositionData = appliedPositionResult.rows[0];
          }
        }
        
        return {
          applicant,
          comments: applicantCommentsResult.rows,
          transitions: transitionRecordsResult.rows,
          resumes: [], // No separate Resume table, resumes are stored in applicant.resumePath
          attachments: attachmentsResult.rows,
          applicantComments: applicantCommentsResult.rows,
          transitionRecords: transitionRecordsResult.rows,
          jobMatches,
          appliedPositionData
        };
      } finally {
        client.release();
      }
    }

    // Fetch comprehensive applicant data
    const applicantData = await getApplicantData(targetApplicantId);
    const { applicant, comments, transitions, resumes, attachments, applicantComments, transitionRecords, jobMatches, appliedPositionData } = applicantData;

    // Create comprehensive context data for AI
    const applicantContext = {
      basicInfo: {
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone,
        status: applicant.currentStage || 'Unknown',
        applicationDate: applicant.applicationDate,
        fitScore: applicant.fitScore,
        dataAiHint: applicant.dataAiHint,
        customAttributes: applicant.customAttributes,
        parsedData: applicant.parsedData,
        assignmentJustification: applicant.assignmentJustification,
        avatarUrl: applicant.avatarUrl
      },
      education: applicant.educationData || [],
      experience: applicant.experienceData || [],
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
      recruiter: applicant.recruiterName ? {
        name: applicant.recruiterName,
        email: applicant.recruiterEmail
      } : null,
      currentStage: {
        name: applicant.currentStage,
        description: applicant.stageDescription,
        color: applicant.stageColor
      },
      documents: {
        resumePath: applicant.resumePath,
        attachments: attachments
      },
      history: {
        comments: comments,
        applicantComments: applicantComments,
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
    const contextInfo = `for applicant: ${applicant.name}`;
    const detailedContext = `
Applicant CONTEXT:
${JSON.stringify(applicantContext, null, 2)}

SYSTEM PROMPT:
${systemPrompt}

Please generate professional, well-formatted content based on the system prompt above, using all the comprehensive Applicant and job data provided. 

IMPORTANT: Pay special attention to the Applicant's education and experience data, as these are crucial for understanding their qualifications and background. Consider:

- Education history, degrees, institutions, and graduation dates
- Work experience, job titles, companies, responsibilities, and duration
- Skills and competencies demonstrated through their experience
- How their education and experience align with the position requirements
- Career progression and growth patterns
- Parsed data from resumes and documents
- Assignment justification and reasoning
- Custom attributes and additional Applicant information
- Resume file path and uploaded attachments
- Detailed transition history and stage progression
- All comments and feedback from recruiters and team members
- Job matching scores and criteria

POSITION AND OPPORTUNITY ANALYSIS:
- The Applicant's applied position and its specific requirements, including detailed match criteria
- All potential job matches with fit scores and match reasons
- Top 3 highest-scoring position matches (fit score > 70%)
- Alternative career opportunities and growth paths
- How the Applicant's profile aligns with different positions and departments
- Recommendations for position transitions or career development
- Analysis of the Applicant's fit across multiple positions and career trajectories
- Insights into the Applicant's potential for different roles and responsibilities
- Strategic recommendations for career advancement opportunities

MATCH CRITERIA AND JOB DESCRIPTION ANALYSIS:
- Detailed analysis of the applied position's match criteria and requirements
- Comparison of Applicant qualifications against specific position criteria
- Analysis of job descriptions and how they align with Applicant experience
- Evaluation of match criteria across different positions and departments
- Identification of skill gaps and areas for development
- Assessment of how well the Applicant meets each position's specific requirements
- Recommendations based on match criteria alignment and job description fit
- Strategic insights into the Applicant's suitability for different role types

Also consider the Applicant's background, position requirements, matching scores, comments, transition history, and all available context to provide the most relevant and insightful analysis.

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
      
      let generatedContent = data.applicants?.[0]?.content?.parts?.[0]?.text || "";

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
      `AI content generated using prompt: ${promptName} (${promptCategory}) for applicant: ${applicant.name}`,
      'API:AI:GenerateContent',
      session.user.id,
      { applicantId: targetApplicantId, applicantName: applicant.name, promptName, promptCategory }
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
