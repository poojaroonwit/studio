import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const generateContentSchema = z.object({
  candidateId: z.string().optional(),
  candidateName: z.string().optional(),
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

  const { candidateId, candidateName, systemPrompt, promptName, promptCategory } = validationResult.data;

  try {
    // Here you would integrate with your AI service (OpenAI, Azure OpenAI, etc.)
    // For now, we'll simulate the AI response with a template-based approach
    
    let generatedContent = '';
    
    // Generate content based on the system prompt and context
    if (promptCategory === 'Job Description Generation') {
      generatedContent = generateJobDescription(systemPrompt, candidateName);
    } else if (promptCategory === 'Candidate Analysis') {
      generatedContent = generateCandidateAnalysis(systemPrompt, candidateName);
    } else if (promptCategory === 'Email Templates') {
      generatedContent = generateEmailTemplate(systemPrompt, candidateName);
    } else if (promptCategory === 'Report Generation') {
      generatedContent = generateReport(systemPrompt, candidateName);
    } else {
      // Generic content generation
      generatedContent = generateGenericContent(systemPrompt, candidateName);
    }

    return NextResponse.json({ 
      content: generatedContent,
      promptUsed: promptName,
      category: promptCategory
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json({ message: 'Failed to generate content' }, { status: 500 });
  }
}

// Helper functions for different types of content generation
function generateJobDescription(systemPrompt: string, candidateName?: string): string {
  const context = candidateName ? `for ${candidateName}` : '';
  
  return `
<h2>Generated Job Description ${context}</h2>

<p>Based on the system prompt: <em>"${systemPrompt}"</em></p>

<h3>Position Overview</h3>
<p>We are seeking a talented and experienced professional to join our dynamic team. This role offers an exciting opportunity to contribute to our organization's success while developing your skills and advancing your career.</p>

<h3>Key Responsibilities</h3>
<ul>
<li>Collaborate with cross-functional teams to deliver high-quality solutions</li>
<li>Analyze requirements and develop innovative approaches</li>
<li>Maintain best practices and industry standards</li>
<li>Contribute to continuous improvement initiatives</li>
</ul>

<h3>Required Qualifications</h3>
<ul>
<li>Bachelor's degree in relevant field or equivalent experience</li>
<li>Proven track record of success in similar roles</li>
<li>Strong analytical and problem-solving skills</li>
<li>Excellent communication and interpersonal abilities</li>
</ul>

<h3>Preferred Qualifications</h3>
<ul>
<li>Advanced degree or certifications</li>
<li>Experience with modern technologies and methodologies</li>
<li>Leadership or mentoring experience</li>
</ul>

<h3>Benefits</h3>
<p>We offer a competitive compensation package including health benefits, professional development opportunities, and a collaborative work environment.</p>
  `.trim();
}

function generateCandidateAnalysis(systemPrompt: string, candidateName?: string): string {
  const context = candidateName ? `for ${candidateName}` : '';
  
  return `
<h2>Candidate Analysis Report ${context}</h2>

<p>Analysis based on system prompt: <em>"${systemPrompt}"</em></p>

<h3>Executive Summary</h3>
<p>This candidate demonstrates strong potential with a solid foundation in their field. Their background aligns well with our requirements and organizational culture.</p>

<h3>Strengths</h3>
<ul>
<li>Relevant experience in target industry</li>
<li>Strong technical skills and knowledge</li>
<li>Proven track record of achievement</li>
<li>Good communication abilities</li>
</ul>

<h3>Areas for Development</h3>
<ul>
<li>Could benefit from additional leadership experience</li>
<li>May need exposure to specific technologies</li>
<li>Opportunity to enhance strategic thinking</li>
</ul>

<h3>Recommendation</h3>
<p>This candidate is recommended for further consideration. Their qualifications and potential make them a strong fit for the role.</p>

<h3>Next Steps</h3>
<ul>
<li>Schedule technical interview</li>
<li>Conduct reference checks</li>
<li>Assess cultural fit</li>
</ul>
  `.trim();
}

function generateEmailTemplate(systemPrompt: string, candidateName?: string): string {
  const context = candidateName ? `for ${candidateName}` : '';
  
  return `
<h2>Email Template ${context}</h2>

<p>Template based on system prompt: <em>"${systemPrompt}"</em></p>

<div style="font-family: Arial, sans-serif; line-height: 1.6;">
<p><strong>Subject:</strong> [Customize based on context]</p>

<p>Dear [Recipient Name],</p>

<p>I hope this email finds you well. I am writing to [purpose of the email].</p>

<p>[Main content paragraph with specific details and context]</p>

<p>I would appreciate the opportunity to discuss this further and answer any questions you may have.</p>

<p>Thank you for your time and consideration.</p>

<p>Best regards,<br>
[Your Name]<br>
[Your Title]<br>
[Your Company]<br>
[Contact Information]</p>
</div>
  `.trim();
}

function generateReport(systemPrompt: string, candidateName?: string): string {
  const context = candidateName ? `for ${candidateName}` : '';
  
  return `
<h2>Generated Report ${context}</h2>

<p>Report based on system prompt: <em>"${systemPrompt}"</em></p>

<h3>Executive Summary</h3>
<p>This report provides a comprehensive analysis of the current situation and recommendations for future actions.</p>

<h3>Key Findings</h3>
<ul>
<li>Finding 1: [Description]</li>
<li>Finding 2: [Description]</li>
<li>Finding 3: [Description]</li>
</ul>

<h3>Analysis</h3>
<p>Detailed analysis of the findings and their implications for the organization.</p>

<h3>Recommendations</h3>
<ol>
<li><strong>Immediate Actions:</strong> [Description]</li>
<li><strong>Short-term Goals:</strong> [Description]</li>
<li><strong>Long-term Strategy:</strong> [Description]</li>
</ol>

<h3>Conclusion</h3>
<p>Summary of key points and next steps for implementation.</p>

<h3>Appendices</h3>
<p>Additional supporting information and data can be found in the appendices.</p>
  `.trim();
}

function generateGenericContent(systemPrompt: string, candidateName?: string): string {
  const context = candidateName ? `for ${candidateName}` : '';
  
  return `
<h2>AI Generated Content ${context}</h2>

<p>Content generated based on system prompt: <em>"${systemPrompt}"</em></p>

<h3>Overview</h3>
<p>This content has been generated using artificial intelligence to assist with your specific requirements. The content is designed to be informative, professional, and tailored to your needs.</p>

<h3>Key Points</h3>
<ul>
<li>Point 1: [Generated content based on prompt]</li>
<li>Point 2: [Generated content based on prompt]</li>
<li>Point 3: [Generated content based on prompt]</li>
</ul>

<h3>Details</h3>
<p>Additional detailed information and context relevant to your specific requirements and the system prompt provided.</p>

<h3>Next Steps</h3>
<p>Recommendations for how to proceed with this information and any additional actions that may be required.</p>

<p><em>Note: This content has been generated by AI and should be reviewed and customized as needed for your specific use case.</em></p>
  `.trim();
}
