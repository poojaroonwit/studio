import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface AiPromptsTabProps {
  jobDescriptionSystemPrompt: string;
  setJobDescriptionSystemPrompt: (value: string) => void;
  applicantEvaluationCriteriaPrompt: string;
  setApplicantEvaluationCriteriaPrompt: (value: string) => void;
  isSaving: boolean;
}

const DEFAULT_JOB_DESCRIPTION_PROMPT = `Generate a professional job description for a \${positionLevel || 'professional'} \${title} position in the \${department} department.

Please include:
1. Job Summary
2. Key Responsibilities (5-8 bullet points)
3. Required Qualifications
4. Preferred Qualifications
5. Key Competencies

Format the response in HTML with h2 and h3 headings and bullet points (ul, li). Make it professional and comprehensive.

Return ONLY the HTML-formatted job description without any additional text or explanations.`;

const DEFAULT_APPLICANT_EVALUATION_PROMPT = `Evaluate the Applicant against the position requirements using the configured expertise skills, personality traits, interviewer scores, and written feedback.

Please consider:
1. Evidence from the Applicant's resume and parsed profile
2. Alignment with the position's evaluation criteria
3. Consistency across interviewer ratings
4. Strengths, risks, and follow-up questions
5. A concise hiring recommendation

Use practical recruiting language. Be fair, specific, and evidence-based. Avoid unsupported assumptions.

Return a structured evaluation summary with clear sections for strengths, concerns, score rationale, and recommendation.`;

export default function AiPromptsTab({
  jobDescriptionSystemPrompt,
  setJobDescriptionSystemPrompt,
  applicantEvaluationCriteriaPrompt,
  setApplicantEvaluationCriteriaPrompt,
  isSaving
}: AiPromptsTabProps) {

  const handleResetJobDescription = () => {
    if (confirm('Are you sure you want to reset the prompt to the default system value?')) {
      setJobDescriptionSystemPrompt(DEFAULT_JOB_DESCRIPTION_PROMPT);
    }
  };

  const handleResetEvaluationCriteria = () => {
    if (confirm('Are you sure you want to reset the evaluation prompt to the default system value?')) {
      setApplicantEvaluationCriteriaPrompt(DEFAULT_APPLICANT_EVALUATION_PROMPT);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-6 overflow-y-auto">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">AI System Prompts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the system prompts used by AI features to tailor output to your organization's needs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Job Description Generation</CardTitle>
              <CardDescription>
                Customize the instructions sent to the AI when generating job descriptions.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetJobDescription} disabled={isSaving}>
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset to Default
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jd-prompt">System Prompt</Label>
            <Textarea
              id="jd-prompt"
              value={jobDescriptionSystemPrompt}
              onChange={(e) => setJobDescriptionSystemPrompt(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Enter system prompt..."
              disabled={isSaving}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="font-semibold">Available Variables:</span></p>
              <ul className="list-disc list-inside">
                <li><code>${'{title}'}</code> - Position Title</li>
                <li><code>${'{department}'}</code> - Department Name</li>
                <li><code>${'{positionLevel}'}</code> - Position Level (e.g. Senior, Junior)</li>
              </ul>
              <p className="mt-2 text-amber-600 dark:text-amber-400">
                Note: Ensure you instruct the AI to return <strong>ONLY HTML</strong> content without markdown code blocks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Applicant Evaluation Criteria</CardTitle>
              <CardDescription>
                Customize the instructions used when AI summarizes Applicant evaluation results.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetEvaluationCriteria} disabled={isSaving}>
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset to Default
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evaluation-prompt">System Prompt</Label>
            <Textarea
              id="evaluation-prompt"
              value={applicantEvaluationCriteriaPrompt}
              onChange={(e) => setApplicantEvaluationCriteriaPrompt(e.target.value)}
              className="min-h-[260px] font-mono text-sm"
              placeholder="Enter evaluation prompt..."
              disabled={isSaving}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="font-semibold">Recommended Focus:</span></p>
              <ul className="list-disc list-inside">
                <li>Applicant evidence and position requirements</li>
                <li>Interviewer scores and written feedback</li>
                <li>Strengths, risks, follow-up questions, and recommendation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
