/**
 * @fileOverview Direct Google Gemini API flow for AI-powered Applicant search.
 *
 * - searchApplicantsAIChat - Performs a natural language search across Applicant profiles.
 * - SearchApplicantsInput - Input schema for the search query.
 * - SearchApplicantsOutput - Output schema containing matched Applicant IDs and AI reasoning.
 */

import { z } from 'zod';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { executeWithApiKeyFallback } from '@/lib/aiApiKeyManager';
import { buildGeminiApiUrl } from '@/lib/aiModelManager';
import type { Applicant, ApplicantDetails, EducationEntry, ExperienceEntry, SkillEntry, TransitionRecord } from '@/lib/types';
import { getRecruitmentStageName } from '@/lib/recruitmentStageUtils';

// Input Schema
const SearchApplicantsInputSchema = z.object({
  query: z.string().min(3, "Search query must be at least 3 characters long."),
});
export type SearchApplicantsInput = z.infer<typeof SearchApplicantsInputSchema>;

// Output Schema
const SearchApplicantsOutputSchema = z.object({
  matchedApplicantIds: z.array(z.string()).describe("An array of UUIDs of Applicants that match the search query."),
  aiReasoning: z.string().optional().describe("A brief explanation from the AI on why these Applicants were matched or if no matches were found."),
  recordCount: z.number().describe("The count of records found by the AI search."),
});
export type SearchApplicantsOutput = z.infer<typeof SearchApplicantsOutputSchema>;

// Enhanced helper to create a more comprehensive summary for an applicant
async function createApplicantSummary(applicant: Applicant): Promise<string> {
  const { id, name, email, phone, status, fitScore, position, parsedData, customAttributes, applicationDate, recruiter, transitionHistory } = applicant;
  const details = parsedData as ApplicantDetails | null;

  let summaryParts: string[] = [];
  summaryParts.push(`Applicant ID: ${id}`);
  summaryParts.push(`Name: ${name}`);
  if (email) summaryParts.push(`Email: ${email}`);
  if (phone) summaryParts.push(`Phone: ${phone}`);
  
  if (position?.title) summaryParts.push(`Applied for Position: ${position.title} (Fit Score: ${fitScore < 1 ? Math.round(fitScore * 100) : fitScore}%, Status: ${await getRecruitmentStageName(status || '') || (status || '')})`);
  else summaryParts.push(`General Application (Status: ${await getRecruitmentStageName(status || '') || (status || '')}, Overall Fit Score: ${fitScore < 1 ? Math.round(fitScore * 100) : fitScore}%)`);
  
  if (applicationDate) summaryParts.push(`Application Date: ${new Date(applicationDate).toLocaleDateString()}`);
  if (recruiter?.name) summaryParts.push(`Assigned Recruiter: ${recruiter.name}`);
  
  const latestTransition = transitionHistory?.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    // Check if dates are valid before calling getTime()
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
      return 0; // If either date is invalid, treat as equal
    }
    return dateB.getTime() - dateA.getTime();
  })[0];
  if (latestTransition) {
    const stageName = await getRecruitmentStageName(latestTransition.stage) || latestTransition.stage;
    summaryParts.push(`Last Status Update: ${stageName} on ${new Date(latestTransition.date).toLocaleDateString()}`);
  }


  if (details) {
    if (details.cv_language) summaryParts.push(`CV Language: ${details.cv_language}`);
    
    if (details.personal_info) {
      const pi = details.personal_info;
      if (pi.title_honorific) summaryParts.push(`Title: ${pi.title_honorific}`);
      if (pi.nickname) summaryParts.push(`Nickname: ${pi.nickname}`);
      if (pi.location) summaryParts.push(`Location: ${pi.location}`);
      if (pi.introduction_aboutme) {
        const aboutMe = pi.introduction_aboutme;
        // Check if about me mentions language certifications
        const hasLanguageCert = aboutMe.toLowerCase().includes('toeic') || 
                               aboutMe.toLowerCase().includes('ielts') || 
                               aboutMe.toLowerCase().includes('toefl') ||
                               aboutMe.toLowerCase().includes('language');
        const prefix = hasLanguageCert ? "About Me: " : "About Me: ";
        summaryParts.push(`${prefix}${aboutMe}`);
      }
    }

    if (details.education && details.education.length > 0) {
      summaryParts.push("Education History:");
      details.education.forEach((edu: EducationEntry, index: number) => {
        let eduStr = `  ${index + 1}. University: ${edu.university || 'N/A'}`;
        if (edu.major || edu.field) eduStr += `, Major/Field: ${edu.major || ''}${edu.major && edu.field ? ' / ' : ''}${edu.field || ''}`;
        if (edu.campus) eduStr += `, Campus: ${edu.campus}`;
        if (edu.period) eduStr += `, Period: ${edu.period}`;
        if (edu.duration) eduStr += `, Duration: ${edu.duration}`;
        if (edu.GPA) eduStr += `, GPA: ${edu.GPA}`;
        
        // Check if education mentions language certifications
        const educationText = `${edu.university || ''} ${edu.major || ''} ${edu.field || ''} ${edu.campus || ''}`.toLowerCase();
        const hasLanguageCert = educationText.includes('toeic') || 
                               educationText.includes('ielts') || 
                               educationText.includes('toefl') ||
                               educationText.includes('language') ||
                               educationText.includes('english');
        
        if (hasLanguageCert) {
          eduStr = `  ${index + 1}. University: ${edu.university || 'N/A'}`;
          if (edu.major || edu.field) eduStr += `, Major/Field: ${edu.major || ''}${edu.major && edu.field ? ' / ' : ''}${edu.field || ''}`;
          if (edu.campus) eduStr += `, Campus: ${edu.campus}`;
          if (edu.period) eduStr += `, Period: ${edu.period}`;
          if (edu.duration) eduStr += `, Duration: ${edu.duration}`;
          if (edu.GPA) eduStr += `, GPA: ${edu.GPA}`;
        }
        
        summaryParts.push(eduStr);
      });
    }

    if (details.experience && details.experience.length > 0) {
      summaryParts.push("Work Experience:");
      details.experience.forEach((exp: ExperienceEntry, index: number) => {
        let expStr = `  ${index + 1}. Company: ${exp.company || 'N/A'}, Position: ${exp.position || 'N/A'}`;
        if (exp.positionLevel) expStr += ` (Level: ${exp.positionLevel})`;
        if (exp.period) expStr += `, Period: ${exp.period}`;
        if (exp.duration) expStr += `, Duration: ${exp.duration}`;
        if (exp.is_current_position === true || exp.isCurrent === true) expStr += ` (Current Position)`;
        if (exp.description) {
          const description = exp.description.substring(0, 250) + (exp.description.length > 250 ? '...' : '');
          // Check if description mentions language certifications
          const hasLanguageCert = description.toLowerCase().includes('toeic') || 
                                 description.toLowerCase().includes('ielts') || 
                                 description.toLowerCase().includes('toefl') ||
                                 description.toLowerCase().includes('language');
          const prefix = hasLanguageCert ? "    Description: " : "    Description: ";
          expStr += `\n${prefix}${description}`;
        }
        summaryParts.push(expStr);
      });
    }

    if (details.skills && Array.isArray(details.skills) && details.skills.length > 0) {
      summaryParts.push("Skills:");
      details.skills.forEach((skillEntry: SkillEntry) => {
        let skillStr = `  - Segment: ${skillEntry.segment_skill || 'General'}: `;
        let skillsText = "";
        
        if (skillEntry.skill && skillEntry.skill.length > 0) {
          skillsText = skillEntry.skill.join(', ');
        } else if (skillEntry.skill_string) {
           skillsText = skillEntry.skill_string;
        } else {
            skillsText = "N/A";
        }
        
        // Highlight language certifications in skills
        const hasLanguageCert = skillsText.toLowerCase().includes('toeic') || 
                               skillsText.toLowerCase().includes('ielts') || 
                               skillsText.toLowerCase().includes('toefl') ||
                               (skillEntry.segment_skill && skillEntry.segment_skill.toLowerCase().includes('language'));
        
        if (hasLanguageCert) {
          skillStr = `  - Segment: ${skillEntry.segment_skill || 'General'}: `;
        }
        
        skillStr += skillsText;
        summaryParts.push(skillStr);
      });
    }

    // job_suitable removed
    
    if (details.job_matches && Array.isArray(details.job_matches) && details.job_matches.length > 0) {
      summaryParts.push("Automated Job Matches (from automation):");
      details.job_matches.forEach(match => {
        const displayFitScore = match.fitScore < 1 ? Math.round(match.fitScore * 100) : match.fitScore;
        summaryParts.push(`  - Job: ${match.jobTitle || match.jobId || 'N/A'}, Fit: ${displayFitScore}%, Reasons: ${(match.matchReasons || []).join(', ')}`);
      });
    }
  }
  
  if (customAttributes && Object.keys(customAttributes).length > 0) {
    summaryParts.push("Custom Attributes:");
    for (const [key, value] of Object.entries(customAttributes)) {
        // Highlight language certifications and important custom fields
        const isLanguageCert = key.toLowerCase().includes('toeic') || 
                              key.toLowerCase().includes('ielts') || 
                              key.toLowerCase().includes('language') || 
                              key.toLowerCase().includes('certification');
        const prefix = isLanguageCert ? "  " : "  ";
        summaryParts.push(`${prefix}${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
  }

  const finalSummary = summaryParts.join('\n');
  return finalSummary;
}

// The main flow function
export async function searchApplicantsAIChat(input: SearchApplicantsInput): Promise<SearchApplicantsOutput> {
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

  let filteredApplicants: Applicant[] = [];
  try {
    const applicantsResult = await getPool().query(`
        SELECT 
            c.*, 
            p.title as "positionTitle",
            rec.name as "recruiterName", rec."avatarUrl" as "recruiterAvatarUrl",
            COALESCE(th_data.history, '[]'::json) as "transitionHistory"
        FROM "Applicant" c 
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" rec ON c."recruiterId" = rec.id
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
            ) ORDER BY th.date DESC
          ) AS history
          FROM "TransitionRecord" th
          WHERE th."applicant_id" = c.id
        ) AS th_data ON true
    `);

    filteredApplicants = applicantsResult.rows.map((row: any) => ({
        ...row,
        parsedData: row.parsedData || { personal_info: {}, contact_info: {} },
        position: row.positionId ? { id: row.positionId, title: row.positionTitle } : null,
        recruiter: row.recruiterId ? { 
          id: row.recruiterId, 
          name: row.recruiterName, 
          avatarUrl: row.recruiterAvatarUrl || null,
          email: null 
        } : null,
        transitionHistory: (row.transitionHistory || []) as TransitionRecord[],
        customAttributes: row.customAttributes || {},
        fitScore: row.fitScore || 0, // Convert null to 0 for consistency
    })) as Applicant[];

    if (filteredApplicants.length === 0) {
      return { matchedApplicantIds: [], aiReasoning: "No Applicants found in the database to search.", recordCount: 0 };
    }
  } catch (dbError) {
    return { matchedApplicantIds: [], aiReasoning: "Failed to retrieve Applicant data for searching.", recordCount: 0 };
  }

  const applicantSummariesText = await Promise.all(
    filteredApplicants.map(async c => `Applicant_START\n${await createApplicantSummary(c)}\nApplicant_END`)
  ).then(summaries => summaries.join('\n\n---\n\n'));
  

  
  if (!applicantSummariesText.trim() && filteredApplicants.length > 0) {
      // Applicant summaries text is empty even though Applicants were fetched
  }

  const effectiveApplicantData = applicantSummariesText.trim() ? applicantSummariesText : "No Applicant details available for processing.";

  try {
    // Get configurable system prompt from settings
    const customSystemPrompt = await getSystemSetting('aiPowerSearchSystemPrompt');
    
    // Use custom prompt if available, otherwise use default
    const systemPromptTemplate = customSystemPrompt || `You are a precise HR search assistant. Your task is to find Applicants who EXACTLY match the specific information requested in the user's query.

User Search Query:
"{query}"

Applicant Data (each Applicant is between Applicant_START and Applicant_END):
{ApplicantData}

CRITICAL SEARCH RULES:
1. **EXACT MATCHING ONLY**: Only include Applicants who explicitly have the specific information mentioned in the query
2. **NO SEMANTIC INFERENCE**: Do not include Applicants based on similar or related information
3. **VERIFICATION REQUIRED**: Only include Applicants where the requested information is clearly present in their data
4. **CASE INSENSITIVE**: Match information regardless of case (e.g., "TOEIC" matches "toeic", "Toeic")

SEARCH GUIDELINES BY QUERY TYPE:

**For Language/Certification Searches (e.g., "has TOEIC", "find Applicants with TOEIC"):**
- Only include Applicants who explicitly mention TOEIC in their data
- Check: Skills, Custom Attributes, Education, Experience descriptions, Personal info
- Do NOT include Applicants who only mention "English" or "language skills" without TOEIC
- Do NOT include Applicants based on general language abilities

**For Skill Searches (e.g., "has React", "knows Python"):**
- Only include Applicants who explicitly list the specific skill
- Check: Skills section, Experience descriptions, Job matches
- Do NOT include Applicants with similar technologies unless explicitly mentioned

**For Education Searches (e.g., "graduated from MIT", "has MBA"):**
- Only include Applicants who explicitly mention the specific institution or degree
- Check: Education history, University names, Majors, Degrees
- Do NOT include Applicants from similar institutions

**For Experience Searches (e.g., "worked at Google", "has 5 years experience"):**
- Only include Applicants who explicitly mention the specific company or duration
- Check: Work experience, Company names, Duration fields
- Do NOT include Applicants with similar companies or experience levels

**For Fit Score Searches:**
- Fit scores are displayed as percentages (0-100%)
- Decimal values (0-1) are automatically converted to percentages (e.g., 0.89 becomes 89%)
- When the query mentions "fit score less than X" or "fit score below X", only include Applicants with fit scores < X%
- When the query mentions "fit score greater than X" or "fit score above X", only include Applicants with fit scores > X%
- When the query mentions "fit score between X and Y", only include Applicants with fit scores between X% and Y%

**For Position/Job Searches:**
- Only include Applicants who explicitly applied for or are matched to the specific position
- Check: Applied Position, Job Matches, Position titles
- Do NOT include Applicants with similar positions

**For Date Searches:**
- Only include Applicants who match the specific date criteria
- Check: Application Date, Education dates, Experience dates
- Use exact date matching, not approximate

**For Location Searches:**
- Only include Applicants who explicitly mention the specific location
- Check: Personal info location, Education location, Experience location
- Do NOT include Applicants from nearby areas unless explicitly mentioned

**For Recruiter Searches:**
- Only include Applicants assigned to the specific recruiter
- Check: Assigned Recruiter field
- Do NOT include Applicants with similar recruiter names

**For Status Searches:**
- Only include Applicants with the exact status mentioned
- Check: Status field, Transition history
- Do NOT include Applicants with similar statuses

**For Custom Field Searches:**
- Only include Applicants who have the specific custom field value
- Check: Custom Attributes section
- Match exact values, not similar ones

EXAMPLES OF CORRECT BEHAVIOR:

Query: "find the Applicant has toeic"
- ✅ INCLUDE: Applicant with "Skills: - Segment: Language: TOEIC 850, English"
- ✅ INCLUDE: Applicant with "Custom Attributes: TOEIC_Score: 750"
- ❌ EXCLUDE: Applicant with "Skills: - Segment: Language: English, Spanish" (no TOEIC mentioned)
- ❌ EXCLUDE: Applicant with "Skills: - Segment: Language: IELTS 7.0" (different certification)

Query: "has React experience"
- ✅ INCLUDE: Applicant with "Skills: - Segment: Programming: React, JavaScript"
- ✅ INCLUDE: Applicant with "Experience: React Developer at Company X"
- ❌ EXCLUDE: Applicant with "Skills: - Segment: Programming: Angular, Vue" (different framework)
- ❌ EXCLUDE: Applicant with "Skills: - Segment: Programming: JavaScript" (no React mentioned)

Query: "fit score less than 30"
- ✅ INCLUDE: Applicant with "Fit Score: 25%"
- ✅ INCLUDE: Applicant with "Fit Score: 0.15" (15%)
- ❌ EXCLUDE: Applicant with "Fit Score: 85%" (85% > 30%)
- ❌ EXCLUDE: Applicant with "Fit Score: 0.89" (89% > 30%)

IMPORTANT: 
- If no Applicants have the EXACT information requested, return an empty matchedApplicantIds array
- Do not make assumptions or include Applicants with similar information
- Be strict and precise in your matching
- Always verify the information exists in the Applicant data before including them

Return ONLY a valid JSON object in this exact format:
{
  "matchedApplicantIds": ["uuid1", "uuid2", ...],
  "aiReasoning": "Brief explanation of why these Applicants were included or why none were found"
}

Do not include any markdown formatting, code blocks, or additional text. Only return the JSON object.`;

    // Replace placeholders in the system prompt
    const prompt = systemPromptTemplate
      .replace(/\{query\}/g, input.query)
      .replace(/\{ApplicantData\}/g, effectiveApplicantData);

    // Call Google Gemini API with fallback
    const apiResult = await executeWithApiKeyFallback(async (apiKey, model) => {
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
              parts: [{ text: prompt }]
            }
          ]
        }),
      });

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        throw new Error(`Gemini API error: ${fetchRes.status} ${fetchRes.statusText} - ${errorText}`);
      }

      const data = await fetchRes.json();
      // Gemini API returns applicants[0].content.parts[0].text
      const modelText = data.applicants?.[0]?.content?.parts?.[0]?.text || "";

      return modelText;
    }, 'AI Search');

    if (!apiResult.success) {
      return {
        matchedApplicantIds: [],
        aiReasoning: `AI features are not available due to API key failures. Please check your API key configuration. Attempts: ${apiResult.attempts}, Last error: ${apiResult.error}`,
        recordCount: 0
      };
    }

    const modelText = apiResult.data;

    let result;
    try {
      // Try to extract JSON from the response if it's wrapped in markdown or other text
      let jsonText = modelText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      result = JSON.parse(jsonText);
      
      // Validate the expected structure
      if (!result.hasOwnProperty('matchedApplicantIds') || !Array.isArray(result.matchedApplicantIds)) {
        result.matchedApplicantIds = [];
      }
      
      if (!result.hasOwnProperty('aiReasoning') || typeof result.aiReasoning !== 'string') {
        result.aiReasoning = '';
      }
      
    } catch (parseError) {
      // Try to extract Applicant IDs from the text using regex
      const applicantIdMatches = modelText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
      
      result = { 
        matchedApplicantIds: applicantIdMatches,
        aiReasoning: `Failed to parse AI response as JSON. Raw response: ${modelText.substring(0, 200)}${modelText.length > 200 ? '...' : ''}`
      };
    }

    let finalReasoning = result.aiReasoning;
    if ((result.matchedApplicantIds || []).length > 0 && (!finalReasoning || finalReasoning.trim() === '')) {
      finalReasoning = "The AI model identified matching Applicants based on the query but did not provide specific reasoning.";
    }
    if (input.query && effectiveApplicantData !== "No Applicant details available for processing." && (result.matchedApplicantIds || []).length === 0 && (!finalReasoning || finalReasoning.trim() === '')) {
        finalReasoning = "The AI model reviewed the Applicant data and found no strong matches for the specified query.";
    }

    // Additional validation and sanitization
    const sanitizedApplicantIds = (result.matchedApplicantIds || [])
      .filter((id: any) => typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))
      .slice(0, 50); // Limit to 50 results for performance

    return {
      matchedApplicantIds: sanitizedApplicantIds,
      aiReasoning: finalReasoning || "No reasoning provided by the AI.",
      recordCount: sanitizedApplicantIds.length,
    };

  } catch (error) {
    return {
      matchedApplicantIds: [],
      aiReasoning: `An unexpected error occurred during AI processing. Details: ${(error as Error).message}`,
      recordCount: 0
    };
  }
}
