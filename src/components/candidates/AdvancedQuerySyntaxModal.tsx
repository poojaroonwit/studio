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
      name: 'Basic Search',
      description: 'Search by name, email, or phone',
      examples: [
        { query: 'name:John', description: 'Find candidates named John' },
        { query: 'email:john@example.com', description: 'Find candidate with specific email' },
        { query: 'phone:+1234567890', description: 'Find candidate with specific phone' },
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
      ]
    },
    {
      name: 'Fit Scores',
      description: 'Search by job fit scores',
      examples: [
        { query: 'minFitScore:80', description: 'Find candidates with fit score ≥ 80%' },
        { query: 'maxFitScore:30', description: 'Find candidates with fit score ≤ 30%' },
        { query: 'minFitScore:70 maxFitScore:90', description: 'Find candidates with fit score between 70-90%' },
      ]
    },
    {
      name: 'Status & Position',
      description: 'Search by application status and position',
      examples: [
        { query: 'status:Applied', description: 'Find candidates with Applied status' },
        { query: 'status:Applied,Screening', description: 'Find candidates with multiple statuses' },
        { query: 'position:Software Engineer', description: 'Find candidates for specific position' },
      ]
    },
    {
      name: 'Location & Education',
      description: 'Search by location and education',
      examples: [
        { query: 'location:New York', description: 'Find candidates in New York' },
        { query: 'education:MBA', description: 'Find candidates with MBA degree' },
        { query: 'education:Computer Science', description: 'Find candidates with specific major' },
      ]
    },
    {
      name: 'Recruiter & Source',
      description: 'Search by assigned recruiter and source',
      examples: [
        { query: 'recruiter:John Smith', description: 'Find candidates assigned to John Smith' },
        { query: 'source:LinkedIn', description: 'Find candidates from LinkedIn' },
      ]
    },
    {
      name: 'Complex Queries',
      description: 'Combine multiple filters for precise searches',
      examples: [
        { query: 'minFitScore:80 status:Applied skills:React', description: 'High-fit React developers who applied' },
        { query: 'location:San Francisco minExperienceYears:3 skills:Python,JavaScript', description: 'Experienced developers in SF with Python/JS skills' },
        { query: 'minFitScore:70 maxFitScore:90 status:Screening position:Senior Engineer', description: 'Senior engineers in screening with good fit scores' },
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { field: 'name', description: 'Candidate name' },
                { field: 'email', description: 'Email address' },
                { field: 'phone', description: 'Phone number' },
                { field: 'skills', description: 'Skills (comma-separated)' },
                { field: 'location', description: 'Location' },
                { field: 'status', description: 'Application status' },
                { field: 'position', description: 'Position title' },
                { field: 'recruiter', description: 'Assigned recruiter' },
                { field: 'education', description: 'Education/degree' },
                { field: 'minFitScore', description: 'Minimum fit score (%)' },
                { field: 'maxFitScore', description: 'Maximum fit score (%)' },
                { field: 'minExperienceYears', description: 'Minimum experience years' },
                { field: 'maxExperienceYears', description: 'Maximum experience years' },
              ].map((item) => (
                <div key={item.field} className="bg-muted/50 p-3 rounded-lg border">
                  <Badge variant="secondary" className="text-xs mb-1">{item.field}</Badge>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
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
                  {['Applied', 'Screening', 'Shortlisted', 'Interviewing', 'On Hold', 'Hired', 'Rejected', 'Withdrawn'].map(status => (
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
                  <div className="space-y-2">
                    {category.examples.map((example, exampleIndex) => (
                      <div key={exampleIndex} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
                            {example.query}
                          </code>
                          <p className="text-xs text-muted-foreground mt-1">{example.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(example.query, `${category.name}-${exampleIndex}`)}
                          className="ml-2"
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

          {/* Tips */}
          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">💡 Pro Tips</h3>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>• Use comma-separated values for multiple options: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">status:Applied,Screening</code></li>
              <li>• Combine multiple filters for precise searches</li>
              <li>• Fit scores are percentages (0-100), not decimals</li>
              <li>• Text searches are case-insensitive</li>
              <li>• Use quotes for values with spaces: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">name:"John Smith"</code></li>
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
