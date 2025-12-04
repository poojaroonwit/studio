"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, FileText, Star } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Candidate } from '@/lib/types';

interface DesktopEvaluatePageProps {
  candidateId: string;
  candidateData: any;
  attachments: any[];
  testingResults: any[];
  interviewers: any[];
  allEvaluations: Map<string, any>;
  selectedInterviewerId: string | null;
  onInterviewerSelect: (id: string) => void;
  onTestResultUpdate?: (index: number, newScore: number) => void;
  onBack: () => void;
  appLogoUrl: string | null;
  evaluateHeaderBackgroundType: 'image' | 'gradient' | 'solid';
  evaluateHeaderBackgroundImage: string | null;
  evaluateHeaderBackgroundGradient: string | null;
  evaluateHeaderBackgroundColor: string;
  evaluateHeaderTextColor: string;
}

export function DesktopEvaluatePage({
  candidateId,
  candidateData,
  attachments,
  testingResults,
  interviewers,
  allEvaluations,
  selectedInterviewerId,
  onInterviewerSelect,
  onTestResultUpdate,
  onBack,
  appLogoUrl,
  evaluateHeaderBackgroundType,
  evaluateHeaderBackgroundImage,
  evaluateHeaderBackgroundGradient,
  evaluateHeaderBackgroundColor,
  evaluateHeaderTextColor,
}: DesktopEvaluatePageProps) {
  // State for editing test results
  const [isTestResultEditOpen, setIsTestResultEditOpen] = useState(false);
  const [editingTestResult, setEditingTestResult] = useState<any>(null);
  const [editingTestResultIndex, setEditingTestResultIndex] = useState<number>(-1);
  const [editingTestResultValue, setEditingTestResultValue] = useState<number>(0);
  const router = useRouter();

  const getEvaluateHeaderBackgroundStyle = () => {
    if (evaluateHeaderBackgroundType === 'image' && evaluateHeaderBackgroundImage) {
      return {
        backgroundImage: `url(${evaluateHeaderBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (evaluateHeaderBackgroundType === 'gradient' && evaluateHeaderBackgroundGradient) {
      return {
        background: evaluateHeaderBackgroundGradient,
      };
    }
    if (evaluateHeaderBackgroundType === 'solid') {
      return {
        background: `hsl(${evaluateHeaderBackgroundColor})`,
      };
    }
    return {
      background: `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`,
    };
  };

  // Calculate average score
  const calculateAverageScore = () => {
    if (allEvaluations.size === 0) return null;
    let totalScore = 0;
    let count = 0;
    allEvaluations.forEach((evaluation) => {
      if (evaluation.overallScore !== null && evaluation.overallScore !== undefined) {
        totalScore += evaluation.overallScore;
        count++;
      }
    });
    return count > 0 ? (totalScore / count).toFixed(1) : null;
  };

  const averageScore = calculateAverageScore();

  // Get parsed data properties
  const getParsedDataProperty = (propertyName: string) => {
    const parsedData = candidateData?.parsedData;
    if (!parsedData) return null;
    
    if (typeof parsedData === 'string') {
      try {
        const parsed = JSON.parse(parsedData);
        return parsed[propertyName];
      } catch {
        return null;
      }
    }
    return parsedData[propertyName];
  };

  const experiences = getParsedDataProperty('experience') || [];
  const education = getParsedDataProperty('education') || [];
  const skills = getParsedDataProperty('skills') || [];

  return (
    <>
    <div className="min-h-screen w-full flex flex-col" style={getEvaluateHeaderBackgroundStyle()}>
      {/* Header */}
      <div className="py-8 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-12 w-12"
            style={{ color: `hsl(${evaluateHeaderTextColor})`, borderColor: `hsl(${evaluateHeaderTextColor})` }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: `hsl(${evaluateHeaderTextColor})` }} />
          </Button>
          <div>
            <div className="text-sm uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>
              Candidate Evaluation
            </div>
            <h1 className="text-3xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>
              {candidateData?.name || 'Unknown Candidate'}
            </h1>
          </div>
        </div>
        {appLogoUrl && (
          <div>
            <img src={appLogoUrl} alt="App Logo" className="h-10 w-auto" />
          </div>
        )}
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 grid grid-cols-2 gap-6 px-8 pb-8">
        {/* Left Column - Candidate Details */}
        <Card className="h-full overflow-hidden">
          <ScrollArea className="h-full">
            <CardContent className="p-6">
              {/* Candidate Info Header */}
              <div className="flex items-start gap-4 mb-6 pb-6 border-b">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={candidateData?.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {candidateData?.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{candidateData?.name}</h2>
                  {candidateData?.email && (
                    <p className="text-sm text-muted-foreground mb-1">{candidateData.email}</p>
                  )}
                  {candidateData?.phone && (
                    <p className="text-sm text-muted-foreground">{candidateData.phone}</p>
                  )}
                  {candidateData?.position?.title && (
                    <Badge variant="secondary" className="mt-2">
                      {candidateData.position.title}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Accordion Sections */}
              <Accordion type="multiple" defaultValue={['experience', 'education', 'skills']} className="w-full">
                {/* Experience Section */}
                {experiences && experiences.length > 0 && (
                  <AccordionItem value="experience">
                    <AccordionTrigger className="text-lg font-semibold">
                      Experience
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {experiences.map((exp: any, index: number) => (
                          <div key={index} className="border-l-2 border-primary pl-4">
                            <h4 className="font-semibold">{exp.title || exp.position}</h4>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {exp.start_date} - {exp.end_date || 'Present'}
                            </p>
                            {exp.description && (
                              <p className="text-sm mt-2">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Education Section */}
                {education && education.length > 0 && (
                  <AccordionItem value="education">
                    <AccordionTrigger className="text-lg font-semibold">
                      Education
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {education.map((edu: any, index: number) => (
                          <div key={index} className="border-l-2 border-primary pl-4">
                            <h4 className="font-semibold">{edu.degree}</h4>
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {edu.start_date} - {edu.end_date || 'Present'}
                            </p>
                            {edu.field_of_study && (
                              <p className="text-sm mt-1">Field: {edu.field_of_study}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Skills Section */}
                {skills && skills.length > 0 && (
                  <AccordionItem value="skills">
                    <AccordionTrigger className="text-lg font-semibold">
                      Skills
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill: any, index: number) => (
                          <Badge key={index} variant="outline">
                            {typeof skill === 'string' ? skill : skill.name || skill.skill}
                          </Badge>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Right Column - Evaluation Details */}
        <div className="flex flex-col gap-6 h-full overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4">
              {/* Attachments Section */}
              {attachments && attachments.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Attachments ({attachments.length})
                    </h3>
                    <div className={cn(
                      "grid gap-3",
                      attachments.length === 1 ? "grid-cols-1" :
                      attachments.length === 2 ? "grid-cols-2" :
                      attachments.length === 3 ? "grid-cols-3" :
                      attachments.length === 4 ? "grid-cols-2" :
                      "grid-cols-3"
                    )}>
                      {attachments.map((attachment) => (
                        <Button
                          key={attachment.id}
                          variant="outline"
                          className="h-24 flex flex-col items-center justify-center gap-2 p-2 hover:bg-accent"
                          onClick={() => window.open(attachment.url, '_blank')}
                        >
                          <FileText className="h-8 w-8" />
                          <span className="text-xs truncate w-full text-center">
                            {attachment.filename || 'Document'}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Testing Results */}
              {testingResults && testingResults.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Testing Results</h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {testingResults.map((result, index) => (
                        <div 
                          key={result.id} 
                          className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setEditingTestResult(result);
                            setEditingTestResultIndex(index);
                            setEditingTestResultValue(result.score);
                            setIsTestResultEditOpen(true);
                          }}
                        >
                          <div className="relative w-12 h-12 md:w-16 md:h-16">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="50%"
                                cy="50%"
                                r="40%"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                className="text-muted"
                              />
                              <circle
                                cx="50%"
                                cy="50%"
                                r="40%"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={`${(result.score / result.maxScore) * 176} 176`}
                                className="text-primary"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] md:text-xs font-bold">{result.score}/{result.maxScore}</span>
                            </div>
                          </div>
                          <p className="text-[10px] md:text-xs text-center mt-2 line-clamp-2">{result.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Interviewers Selection - Floating Left */}
              {interviewers && interviewers.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Interviewers</h3>
                    <div className="flex flex-col gap-2">
                      {interviewers.map((interviewer) => (
                        <Button
                          key={interviewer.userId}
                          variant={selectedInterviewerId === interviewer.userId ? 'default' : 'outline'}
                          className="rounded-full h-auto py-2 px-4 justify-start"
                          onClick={() => onInterviewerSelect(interviewer.userId)}
                        >
                          <Avatar className="h-7 w-7 mr-3">
                            <AvatarImage src={interviewer.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {interviewer.userName?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{interviewer.userName}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Average Score */}
              {averageScore && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Average Score
                    </h3>
                    <div className="flex items-center justify-center">
                      <div className="text-5xl font-bold text-primary">{averageScore}</div>
                      <div className="text-2xl text-muted-foreground ml-2">/10</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Evaluation Results - Skills with Comments */}
              {selectedInterviewerId && allEvaluations.has(selectedInterviewerId) && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Evaluation Results</h3>
                    {(() => {
                      const evaluation = allEvaluations.get(selectedInterviewerId);
                      return (
                        <div className="space-y-4">
                          {/* Personality Scores */}
                          {evaluation.personalityScores && evaluation.personalityScores.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-3">Personality Traits</h4>
                              <div className="space-y-3">
                                {evaluation.personalityScores.map((ps: any) => (
                                  <div key={ps.trait.id} className="border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">{ps.trait.name}</span>
                                      <Badge variant="secondary">{ps.score}/10</Badge>
                                    </div>
                                    {ps.notes && (
                                      <p className="text-sm text-muted-foreground">{ps.notes}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Comments */}
                          {evaluation.comments && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <h4 className="font-semibold mb-2">Comments</h4>
                              <p className="text-sm">{evaluation.comments}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>

    <Dialog open={isTestResultEditOpen} onOpenChange={setIsTestResultEditOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Test Score</DialogTitle>
        </DialogHeader>
        {editingTestResult && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">{editingTestResult.label}</p>
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(editingTestResultValue / editingTestResult.maxScore) * 251} 251`}
                    className="text-primary transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{editingTestResultValue}/{editingTestResult.maxScore}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="score-input">Score</Label>
              <Input
                id="score-input"
                type="number"
                min={0}
                max={editingTestResult.maxScore}
                value={editingTestResultValue}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(editingTestResult.maxScore, parseInt(e.target.value || '0', 10)));
                  setEditingTestResultValue(val);
                }}
                className="text-center text-2xl font-bold"
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter a value between 0 and {editingTestResult.maxScore}
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTestResultEditOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (onTestResultUpdate && editingTestResultIndex >= 0) {
                onTestResultUpdate(editingTestResultIndex, editingTestResultValue);
              }
              setIsTestResultEditOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
