"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, X, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdvancedQuerySyntaxModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvancedQuerySyntaxModal({ isOpen, onOpenChange }: AdvancedQuerySyntaxModalProps) {
  const [copiedExample, setCopiedExample] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = async (text: string, exampleName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedExample(exampleName);
      toast.success('Example copied to clipboard!');
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => setCopiedExample(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Cleanup timeout on component unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const examples = [
    {
      name: 'Quick Commands',
      description: 'Common search patterns for immediate use',
      examples: [
        { query: 'minFitScore:80', description: 'High-priority candidates (≥80% fit score)' },
        { query: 'status:Applied,Screening', description: 'Active candidates in early stages' },
        { query: 'recruiterId:unassigned', description: 'Unassigned candidates needing attention' },
        { query: 'status:Off', description: 'Candidates with no status assigned' },
        { query: 'applicationDateStart:2024-01-15', description: 'Candidates who applied today' },
        { query: 'applicationDateStart:2024-01-08', description: 'Candidates who applied this week' },
        { query: 'status:Offer Extended,Offer Accepted,Hired', description: 'Candidates in final hiring stages' },
        { query: 'status:Interviewing,Offer Extended,Offer Accepted,Hired', description: 'Candidates in hiring pipeline' },
        { query: 'positionId:not-applied', description: 'Candidates without applied positions' },
        { query: 'recruiterId:unassigned', description: 'Candidates without assigned recruiter' },
        { query: 'minExperienceYears:5 skills:React,Python', description: 'Senior developers with key skills' },
      ]
    },
    {
      name: 'Basic Search',
      description: 'Search by name, email, or phone',
      examples: [
        { query: 'name:John', description: 'Find candidates named John' },
        { query: 'email:john@example.com', description: 'Find candidate with specific email' },
        { query: 'phone:+1234567890', description: 'Find candidate with specific phone' },
        { query: 'name:John email:gmail.com', description: 'Find John with Gmail address' },
      ]
    },
    {
      name: 'Skills & Experience',
      description: 'Search by skills and experience',
      examples: [
        { query: 'skills:React', description: 'Find candidates with React skills' },
        { query: 'skills:Python,JavaScript', description: 'Find candidates with multiple skills' },
        { query: 'minExperienceYears:5', description: 'Find candidates with at least 5 years experience' },
        { query: 'maxExperienceYears:10', description: 'Find candidates with maximum 10 years experience' },
        { query: 'minExperienceYears:3 maxExperienceYears:7', description: 'Mid-level candidates (3-7 years)' },
      ]
    },
    {
      name: 'Fit Scores',
      description: 'Search by job fit scores',
      examples: [
        { query: 'minFitScore:80', description: 'Find candidates with fit score ≥ 80%' },
        { query: 'maxFitScore:30', description: 'Find candidates with fit score ≤ 30%' },
        { query: 'minFitScore:70 maxFitScore:90', description: 'Find candidates with fit score between 70-90%' },
        { query: 'minMatchingJobFitScore:75', description: 'Find candidates with good matching job fit' },
        { query: 'maxMatchingJobFitScore:50', description: 'Find candidates with low matching job fit' },
      ]
    },
    {
      name: 'Status & Position',
      description: 'Search by application status and position',
      examples: [
        { query: 'status:Applied', description: 'Find candidates with Applied status' },
        { query: 'status:Applied,Screening', description: 'Find candidates with multiple statuses' },
        { query: 'positionId:pos1,pos2', description: 'Find candidates for specific positions (by ID)' },
        { query: 'status:Interviewing,Offer Extended', description: 'Candidates in final stages' },
        { query: 'status:Rejected,On Hold', description: 'Candidates not moving forward' },
      ]
    },
    {
      name: 'Location & Education',
      description: 'Search by location and education',
      examples: [
        { query: 'location:New York', description: 'Find candidates in New York' },
        { query: 'location:Bangkok locationOperator:contains', description: 'Find candidates in Bangkok area' },
        { query: 'education:MBA', description: 'Find candidates with MBA degree' },
        { query: 'education:Computer Science', description: 'Find candidates with specific major' },
        { query: 'location:San Francisco education:Engineering', description: 'Engineers in San Francisco' },
      ]
    },
    {
      name: 'Recruiter & Source',
      description: 'Search by assigned recruiter and source',
      examples: [
        { query: 'recruiterId:recruiter123', description: 'Find candidates assigned to specific recruiter' },
        { query: 'recruiterId:unassigned', description: 'Find unassigned candidates' },
        { query: 'selectedSourceIds:source1,source2', description: 'Find candidates from specific sources' },
        { query: 'recruiterId:recruiter123 status:Applied', description: 'Applied candidates for specific recruiter' },
      ]
    },
    {
      name: 'Time-Based Queries',
      description: 'Search by application dates and time periods',
      examples: [
        { query: 'applicationDateStart:2024-01-15', description: 'Candidates who applied today' },
        { query: 'applicationDateStart:2024-01-08', description: 'Candidates who applied this week' },
        { query: 'applicationDateStart:2024-01-01', description: 'Candidates who applied after Jan 1, 2024' },
        { query: 'applicationDateEnd:2024-01-31', description: 'Candidates who applied before Jan 31, 2024' },
        { query: 'applicationDateStart:2024-01-01 applicationDateEnd:2024-01-31', description: 'Candidates who applied in January 2024' },
        { query: 'applicationDateStart:2024-01-01 status:Applied', description: 'Recent applications' },
      ]
    },
    {
      name: 'Hiring Pipeline',
      description: 'Search by hiring stages and status',
      examples: [
        { query: 'status:Offer Extended,Offer Accepted,Hired', description: 'Candidates in final hiring stages' },
        { query: 'status:Interviewing,Offer Extended,Offer Accepted,Hired', description: 'Candidates in hiring pipeline' },
        { query: 'status:Interviewing', description: 'Candidates currently being interviewed' },
        { query: 'status:Offer Extended', description: 'Candidates with pending offers' },
        { query: 'status:Hired', description: 'Successfully hired candidates' },
      ]
    },
    {
      name: 'Assignment & Status',
      description: 'Search by recruiter assignment and application status',
      examples: [
        { query: 'recruiterId:unassigned', description: 'Candidates without assigned recruiter' },
        { query: 'positionId:not-applied', description: 'Candidates without applied positions' },
        { query: 'status:Off', description: 'Candidates with no status assigned' },
        { query: 'status:Applied,Screening', description: 'Candidates in early stages' },
        { query: 'status:Rejected,On Hold', description: 'Candidates not moving forward' },
      ]
    },
    {
      name: 'Complex Queries',
      description: 'Combine multiple filters for precise searches',
      examples: [
        { query: 'minFitScore:80 status:Applied skills:React', description: 'High-fit React developers who applied' },
        { query: 'location:San Francisco minExperienceYears:3 skills:Python,JavaScript', description: 'Experienced developers in SF with Python/JS skills' },
        { query: 'minFitScore:70 maxFitScore:90 status:Screening positionId:senior-engineer', description: 'Senior engineers in screening with good fit scores' },
        { query: 'recruiterId:unassigned minFitScore:60 status:Applied', description: 'High-potential unassigned candidates' },
        { query: 'applicationDateStart:2024-01-01 minExperienceYears:5 skills:AI,Machine Learning', description: 'Recent senior AI/ML candidates' },
      ]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-blue-600" />
            Advanced Query Syntax Guide
          </DialogTitle>
          <DialogDescription className="text-base">
            Learn how to use advanced search syntax to find candidates with precision. 
            Combine multiple filters using the format <code className="bg-muted px-1 rounded">field:value</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Syntax */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📝 Basic Syntax</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">field:value</code> format to search specific fields.
              Multiple filters can be combined with spaces.
            </p>
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded border border-blue-200 dark:border-blue-700">
              <code className="text-sm text-blue-900 dark:text-blue-100">
                minFitScore:80 status:Applied skills:React
              </code>
            </div>
          </div>

          {/* Available Fields */}
          <div>
            <h3 className="font-semibold text-lg mb-3">🔍 Available Search Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { field: 'name', description: 'Candidate name', example: 'name:John' },
                { field: 'email', description: 'Email address', example: 'email:john@example.com' },
                { field: 'phone', description: 'Phone number', example: 'phone:+1234567890' },
                { field: 'skills', description: 'Skills (comma-separated)', example: 'skills:React,Python' },
                { field: 'location', description: 'Location', example: 'location:New York' },
                { field: 'status', description: 'Application status', example: 'status:Applied,Screening' },
                { field: 'positionId', description: 'Position ID(s)', example: 'positionId:pos1,pos2' },
                { field: 'recruiterId', description: 'Recruiter ID', example: 'recruiterId:recruiter123' },
                { field: 'selectedSourceIds', description: 'Source ID(s)', example: 'selectedSourceIds:source1,source2' },
                { field: 'education', description: 'Education/degree', example: 'education:MBA' },
                { field: 'minFitScore', description: 'Minimum fit score (%)', example: 'minFitScore:80' },
                { field: 'maxFitScore', description: 'Maximum fit score (%)', example: 'maxFitScore:30' },
                { field: 'minMatchingJobFitScore', description: 'Min matching job fit (%)', example: 'minMatchingJobFitScore:75' },
                { field: 'maxMatchingJobFitScore', description: 'Max matching job fit (%)', example: 'maxMatchingJobFitScore:50' },
                { field: 'minExperienceYears', description: 'Minimum experience years', example: 'minExperienceYears:5' },
                { field: 'maxExperienceYears', description: 'Maximum experience years', example: 'maxExperienceYears:10' },
                { field: 'applicationDateStart', description: 'Application date from', example: 'applicationDateStart:2024-01-01' },
                { field: 'applicationDateEnd', description: 'Application date to', example: 'applicationDateEnd:2024-01-31' },
                { field: 'locationOperator', description: 'Location search type', example: 'locationOperator:contains' },
              ].map((item) => (
                <div key={item.field} className="bg-muted/50 p-3 rounded-lg border">
                  <Badge variant="secondary" className="text-xs mb-1">{item.field}</Badge>
                  <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                  <code className="text-xs bg-background px-1 py-0.5 rounded border text-blue-600">
                    {item.example}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Special Values & Status Handling */}
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🔑 Special Values & Status Handling</h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Status Field</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  Status names are automatically converted to UUIDs. Use these common status names:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Applied', 'Screening', 'Shortlisted', 'Interview Scheduled', 'Interviewing', 'Offer Extended', 'Offer Accepted', 'Hired', 'Rejected', 'On Hold'].map(status => (
                    <Badge key={status} variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Special Values</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="text-sm">
                    <code className="bg-green-100 dark:bg-green-900 px-1 rounded">unassigned</code> - Find records without assignment
                  </div>
                  <div className="text-sm">
                    <code className="bg-green-100 dark:bg-green-900 px-1 rounded">select-all</code> - Show all options (no filter)
                  </div>
                  <div className="text-sm">
                    <code className="bg-green-100 dark:bg-green-900 px-1 rounded">not-applied</code> - Find candidates without positions
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Examples */}
          <div>
            <h3 className="font-semibold text-lg mb-4">💡 Search Examples</h3>
            <div className="space-y-6">
              {examples.map((category, categoryIndex) => (
                <div key={categoryIndex} className="border rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-medium text-base">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className={category.name === 'Quick Commands' ? 'grid grid-cols-1 gap-2' : 'space-y-2'}>
                    {category.examples.map((example, exampleIndex) => (
                      <div key={exampleIndex} className={category.name === 'Quick Commands' 
                        ? 'flex flex-col p-3 bg-muted/30 rounded-lg' 
                        : 'flex items-center justify-between p-3 bg-muted/30 rounded-lg'
                      }>
                        <div className={category.name === 'Quick Commands' ? 'w-full' : 'flex-1'}>
                          <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
                            {example.query}
                          </code>
                          <p className="text-xs text-muted-foreground mt-1">{example.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(example.query, `${category.name}-${exampleIndex}`)}
                          className={category.name === 'Quick Commands' ? 'mt-2 self-end' : 'ml-2'}
                        >
                          {copiedExample === `${category.name}-${exampleIndex}` ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">⌨️ Keyboard Shortcuts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-800 dark:text-purple-200">Apply Query</span>
                  <kbd className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-xs rounded border">Enter</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-800 dark:text-purple-200">Clear Query</span>
                  <kbd className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-xs rounded border">Ctrl+Backspace</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-800 dark:text-purple-200">Open Syntax Guide</span>
                  <kbd className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-xs rounded border">Ctrl+?</kbd>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-800 dark:text-purple-200">Quick Commands</span>
                  <kbd className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-xs rounded border">Ctrl+Space</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-800 dark:text-purple-200">Copy Query</span>
                  <kbd className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-xs rounded border">Ctrl+C</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-800 dark:text-purple-200">Paste Query</span>
                  <kbd className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-xs rounded border">Ctrl+V</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>• Use comma-separated values for multiple options: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">status:Applied,Screening</code></li>
              <li>• Combine multiple filters for precise searches</li>
              <li>• Fit scores are percentages (0-100), not decimals</li>
              <li>• Text searches are case-insensitive</li>
              <li>• Use quotes for values with spaces: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">name:"John Smith"</code></li>
              <li>• Use <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">unassigned</code> to find records without assignment</li>
              <li>• Date format: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">YYYY-MM-DD</code> (e.g., 2024-01-15)</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
