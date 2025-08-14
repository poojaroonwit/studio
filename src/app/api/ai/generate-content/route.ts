import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import { z } from 'zod';

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
            c.status,
            c."applicationDate",
            c."fitScore",
            c."dataAiHint",
            c."customAttributes",
            c."parsedData",
            c."assignmentJustification",
            c."educationData",
            c."experienceData",
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
          LEFT JOIN "RecruitmentStage" rs ON c."status" = rs.name
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
        

        
        // Get job matches if position exists
        let jobMatches = null;
        if (candidate.positionId) {
          const matchesQuery = `
            SELECT 
              "matchScore",
              "matchDetails",
              "matchedAt",
              "matchCriteria"
            FROM "JobMatch"
            WHERE "candidateId" = $1 AND "positionId" = $2
            ORDER BY "matchedAt" DESC
            LIMIT 5
          `;
          
          const matchesResult = await client.query(matchesQuery, [candidateId, candidate.positionId]);
          jobMatches = matchesResult.rows;
        }
        
        return {
          candidate,
          comments: candidateCommentsResult.rows,
          transitions: transitionRecordsResult.rows,
          resumes: [], // No separate Resume table, resumes are stored in Candidate.resumePath
          attachments: attachmentsResult.rows,
          candidateComments: candidateCommentsResult.rows,
          transitionRecords: transitionRecordsResult.rows,
          jobMatches
        };
      } finally {
        client.release();
      }
    }

    // Get API key from system settings or environment
    async function getSystemSetting(key: string): Promise<string | null> {
      const client = await getPool().connect();
      try {
        const res = await client.query('SELECT value FROM "SystemSetting" WHERE key = $1', [key]);
        if (res.rows.length > 0) {
          return res.rows[0].value;
        }
        return null;
      } finally {
        client.release();
      }
    }

    // Fetch comprehensive candidate data
    const candidateData = await getCandidateData(candidateId);
    const { candidate, comments, transitions, resumes, attachments, candidateComments, transitionRecords, jobMatches } = candidateData;
    
    const dbApiKey = await getSystemSetting('geminiApiKey');
    const apiKey = dbApiKey || process.env.GOOGLE_API_KEY;
    
    console.log('Generative AI: API Key check - DB Key:', dbApiKey ? 'Configured' : 'Not found', 'Env Key:', process.env.GOOGLE_API_KEY ? 'Configured' : 'Not found');
    
    if (!apiKey) {
      console.error('Generative AI: Gemini API Key not configured. AI features unavailable.');
      return NextResponse.json(
        { 
          message: 'AI features are not available due to missing API Key configuration. Please configure the Gemini API Key in System Settings or set GOOGLE_API_KEY environment variable.',
          error: 'MISSING_API_KEY',
          setupInstructions: 'To enable AI features, either: 1) Add a "geminiApiKey" setting in System Settings, or 2) Set GOOGLE_API_KEY environment variable'
        },
        { status: 503 }
      );
    }

    // Create comprehensive context data for AI
    const candidateContext = {
      basicInfo: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        status: candidate.status,
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
      position: candidate.positionId ? {
        title: candidate.positionTitle,
        department: candidate.positionDepartment,
        description: candidate.positionDescription,
        level: candidate.positionLevel,
        isOpen: candidate.positionIsOpen,
        customAttributes: candidate.positionCustomAttributes
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

Also consider the candidate's background, position requirements, matching scores, comments, transition history, and all available context to provide the most relevant and insightful analysis.

Format the response in HTML with appropriate headings (h2, h3) and bullet points (ul, li) where appropriate. Make it comprehensive and professional.

Return ONLY the HTML-formatted content without any additional text or explanations.`;

    // Call Google Gemini API directly
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    console.log('Generative AI: Making request to Gemini API with key:', apiKey ? 'API Key configured' : 'No API Key');
    console.log('Generative AI: Request URL:', url);
    
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
    console.log('Generative AI: Response received from Gemini API');
    
    // Check for API errors
    if (data.error) {
      console.error('Generative AI: Gemini API error:', data.error);
      throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    let generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log('Generative AI: Generated content length:', generatedContent.length);

    if (!generatedContent.trim()) {
      console.error('Generative AI: Empty response from Gemini API');
      console.error('Generative AI: Full response data:', JSON.stringify(data, null, 2));
      throw new Error('No content generated by AI');
    }

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
