"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { 
  BrainCircuit, 
  Save, 
  Loader2, 
  AlertTriangle,
  Edit,
  RotateCcw,
  CheckCircle,
  Info
} from 'lucide-react';

const DEFAULT_AI_POWER_SEARCH_PROMPT = `You are a precise HR search assistant. Your task is to find candidates who EXACTLY match the specific information requested in the user's query.

User Search Query:
"{query}"

Candidate Data (each candidate is between CANDIDATE_START and CANDIDATE_END):
{candidateData}

CRITICAL SEARCH RULES:
1. **EXACT MATCHING ONLY**: Only include candidates who explicitly have the specific information mentioned in the query
2. **NO SEMANTIC INFERENCE**: Do not include candidates based on similar or related information
3. **VERIFICATION REQUIRED**: Only include candidates where the requested information is clearly present in their data
4. **CASE INSENSITIVE**: Match information regardless of case (e.g., "TOEIC" matches "toeic", "Toeic")

SEARCH GUIDELINES BY QUERY TYPE:

**For Language/Certification Searches (e.g., "has TOEIC", "find candidates with TOEIC"):**
- Only include candidates who explicitly mention TOEIC in their data
- Check: Skills, Custom Attributes, Education, Experience descriptions, Personal info
- Do NOT include candidates who only mention "English" or "language skills" without TOEIC
- Do NOT include candidates based on general language abilities

**For Skill Searches (e.g., "has React", "knows Python"):**
- Only include candidates who explicitly list the specific skill
- Check: Skills section, Experience descriptions, Job matches
- Do NOT include candidates with similar technologies unless explicitly mentioned

**For Education Searches (e.g., "graduated from MIT", "has MBA"):**
- Only include candidates who explicitly mention the specific institution or degree
- Check: Education history, University names, Majors, Degrees
- Do NOT include candidates from similar institutions

**For Experience Searches (e.g., "worked at Google", "has 5 years experience"):**
- Only include candidates who explicitly mention the specific company or duration
- Check: Work experience, Company names, Duration fields
- Do NOT include candidates with similar companies or experience levels

**For Fit Score Searches:**
- Fit scores are displayed as percentages (0-100%)
- Decimal values (0-1) are automatically converted to percentages (e.g., 0.89 becomes 89%)
- When the query mentions "fit score less than X" or "fit score below X", only include candidates with fit scores < X%
- When the query mentions "fit score greater than X" or "fit score above X", only include candidates with fit scores > X%
- When the query mentions "fit score between X and Y", only include candidates with fit scores between X% and Y%

**For Position/Job Searches:**
- Only include candidates who explicitly applied for or are matched to the specific position
- Check: Applied Position, Job Matches, Position titles
- Do NOT include candidates with similar positions

**For Date Searches:**
- Only include candidates who match the specific date criteria
- Check: Application Date, Education dates, Experience dates
- Use exact date matching, not approximate

**For Location Searches:**
- Only include candidates who explicitly mention the specific location
- Check: Personal info location, Education location, Experience location
- Do NOT include candidates from nearby areas unless explicitly mentioned

**For Recruiter Searches:**
- Only include candidates assigned to the specific recruiter
- Check: Assigned Recruiter field
- Do NOT include candidates with similar recruiter names

**For Status Searches:**
- Only include candidates with the exact status mentioned
- Check: Status field, Transition history
- Do NOT include candidates with similar statuses

**For Custom Field Searches:**
- Only include candidates who have the specific custom field value
- Check: Custom Attributes section
- Match exact values, not similar ones

EXAMPLES OF CORRECT BEHAVIOR:

Query: "find the candidate has toeic"
- ✅ INCLUDE: Candidate with "Skills: - Segment: Language: TOEIC 850, English"
- ✅ INCLUDE: Candidate with "Custom Attributes: TOEIC_Score: 750"
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Language: English, Spanish" (no TOEIC mentioned)
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Language: IELTS 7.0" (different certification)

Query: "has React experience"
- ✅ INCLUDE: Candidate with "Skills: - Segment: Programming: React, JavaScript"
- ✅ INCLUDE: Candidate with "Experience: React Developer at Company X"
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Programming: Angular, Vue" (different framework)
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Programming: JavaScript" (no React mentioned)

Query: "fit score less than 30"
- ✅ INCLUDE: Candidate with "Fit Score: 25%"
- ✅ INCLUDE: Candidate with "Fit Score: 0.15" (15%)
- ❌ EXCLUDE: Candidate with "Fit Score: 85%" (85% > 30%)
- ❌ EXCLUDE: Candidate with "Fit Score: 0.89" (89% > 30%)

IMPORTANT: 
- If no candidates have the EXACT information requested, return an empty matchedCandidateIds array
- Do not make assumptions or include candidates with similar information
- Be strict and precise in your matching
- Always verify the information exists in the candidate data before including them

Return ONLY a valid JSON object in this exact format:
{
  "matchedCandidateIds": ["uuid1", "uuid2", ...],
  "aiReasoning": "Brief explanation of why these candidates were included or why none were found"
}

Do not include any markdown formatting, code blocks, or additional text. Only return the JSON object.`;

export default function AIPowerSearchTab() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentPrompt();
  }, []);

  const fetchCurrentPrompt = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/system-settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const prompt = data.aiPowerSearchSystemPrompt || DEFAULT_AI_POWER_SEARCH_PROMPT;
        setCurrentPrompt(prompt);
      } else {
        setError('Failed to load current system prompt');
        setCurrentPrompt(DEFAULT_AI_POWER_SEARCH_PROMPT);
      }
    } catch (error) {
      console.error('Error fetching current prompt:', error);
      setError('Failed to load current system prompt');
      setCurrentPrompt(DEFAULT_AI_POWER_SEARCH_PROMPT);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify([
          {
            key: 'aiPowerSearchSystemPrompt',
            value: currentPrompt
          }
        ]),
      });

      if (response.ok) {
        toast.success('AI Power Search system prompt updated successfully');
        setIsEditing(false);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save system prompt');
      }
    } catch (error) {
      console.error('Error saving system prompt:', error);
      toast.error('Failed to save system prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the system prompt to the default? This action cannot be undone.')) {
      setCurrentPrompt(DEFAULT_AI_POWER_SEARCH_PROMPT);
      toast.success('System prompt reset to default');
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This system prompt controls how AI Power Search interprets and matches candidate queries. 
          Changes here will affect all AI-powered candidate searches across the platform. 
          The prompt uses placeholders <code className="bg-muted px-1 rounded">{"{query}"}</code> and <code className="bg-muted px-1 rounded">{"{candidateData}"}</code> 
          which are automatically replaced with actual search queries and candidate data.
        </AlertDescription>
      </Alert>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                System Prompt Configuration
              </CardTitle>
              <CardDescription>
                Define the exact behavior and matching rules for AI Power Search
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Admin Access
              </Badge>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Prompt
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Default
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      fetchCurrentPrompt(); // Reload original
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>System Prompt Content</Label>
                {isEditing ? (
                  <TiptapEditor
                    value={currentPrompt}
                    onChange={setCurrentPrompt}
                    placeholder="Enter the system prompt content..."
                    className="min-h-[600px] border rounded-md"
                  />
                ) : (
                  <div className="border rounded-md p-4 bg-muted/30 min-h-[600px] overflow-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {currentPrompt}
                    </pre>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Use <code className="bg-muted px-1 rounded">{"{query}"}</code> for the user's search query and 
                    <code className="bg-muted px-1 rounded">{"{candidateData}"}</code> for the candidate data.
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
