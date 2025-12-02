"use client";

import React from 'react';
import { Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Interviewer } from '../types';

interface InterviewerSelectionSectionProps {
  interviewers: Interviewer[];
  selectedInterviewerId: string | null;
  allEvaluations: Map<string, any>;
  hasToken: boolean;
  evaluationLinkRequireLogin: boolean | null;
  status: string;
  candidateData: any;
  interviewerSelectedBgColor: string;
  interviewerSelectedTextColor: string;
  interviewerSelectedBorderColor: string;
  interviewerSelectedBorderWidth: string;
  interviewerNonSelectedBgColor: string;
  interviewerNonSelectedTextColor: string;
  interviewerNonSelectedBorderColor: string;
  interviewerNonSelectedBorderWidth: string;
  onInterviewerSelect: (interviewerId: string, evaluation: any | null, testingResults: any[]) => void;
  testingResultsRef: React.MutableRefObject<any[]>;
}

export function InterviewerSelectionSection({
  interviewers,
  selectedInterviewerId,
  allEvaluations,
  hasToken,
  evaluationLinkRequireLogin,
  status,
  candidateData,
  interviewerSelectedBgColor,
  interviewerSelectedTextColor,
  interviewerSelectedBorderColor,
  interviewerSelectedBorderWidth,
  interviewerNonSelectedBgColor,
  interviewerNonSelectedTextColor,
  interviewerNonSelectedBorderColor,
  interviewerNonSelectedBorderWidth,
  onInterviewerSelect,
  testingResultsRef,
}: InterviewerSelectionSectionProps) {
  const handleInterviewerClick = (p: Interviewer) => {
    const evaluation = allEvaluations.get(p.userId);
    onInterviewerSelect(p.userId, evaluation || null, []);
  };

  return (
    <div className="order-1 md:order-none md:col-span-4 md:border-r md:pr-4 md:pr-6">
      <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Interviewer
      </h3>
      {/* Show login required message if link requires login and user is not authenticated */}
      {hasToken && evaluationLinkRequireLogin === true && status !== 'authenticated' && (
        <Alert className="mb-4">
          <AlertDescription className="text-base">
            Please login first to access this evaluation.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Mobile: Horizontal scrollable carousel view */}
      <div className="block md:hidden">
        {interviewers.length > 0 ? (
          <div 
            className="overflow-x-auto pb-2 mx-6 ml-2 sm:-mx-10 px-6 sm:px-10 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory'
            }}
          >
            <div className="flex gap-3 pl-4 sm:pl-6">
              {interviewers.map((p, idx) => {
                const name = p.userName || p.userEmail || 'Interviewer';
                const initials = name.split(' ').map(s => s?.[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
                const isSelected = selectedInterviewerId === p.userId;
                return (
                  <div 
                    key={p.id || idx} 
                    className="flex-shrink-0 w-[80%]"
                    style={{
                      scrollSnapAlign: 'start'
                    }}
                  >
                    <button
                      onClick={() => handleInterviewerClick(p)}
                      className="w-full p-4 text-left transition-colors rounded-md"
                      style={isSelected ? {
                        ...(interviewerSelectedBgColor && interviewerSelectedBgColor.trim() && interviewerSelectedBgColor.includes('gradient') 
                          ? { background: interviewerSelectedBgColor }
                          : { backgroundColor: interviewerSelectedBgColor && interviewerSelectedBgColor.trim() ? `hsl(${interviewerSelectedBgColor})` : 'hsl(220 25% 97%)' }
                        ),
                        color: interviewerSelectedTextColor && interviewerSelectedTextColor.trim() ? `hsl(${interviewerSelectedTextColor})` : 'hsl(0 0% 0%)',
                        borderColor: interviewerSelectedBorderColor && interviewerSelectedBorderColor.trim() ? `hsl(${interviewerSelectedBorderColor})` : 'hsl(220 15% 50%)',
                        borderWidth: interviewerSelectedBorderWidth || '2px',
                        borderStyle: 'solid'
                      } : {
                        backgroundColor: interviewerNonSelectedBgColor && interviewerNonSelectedBgColor.trim() ? `hsl(${interviewerNonSelectedBgColor})` : 'hsl(220 25% 97%)',
                        color: interviewerNonSelectedTextColor && interviewerNonSelectedTextColor.trim() ? `hsl(${interviewerNonSelectedTextColor})` : 'hsl(220 25% 50%)',
                        borderColor: interviewerNonSelectedBorderColor && interviewerNonSelectedBorderColor.trim() ? `hsl(${interviewerNonSelectedBorderColor})` : 'hsl(220 15% 85%)',
                        borderWidth: interviewerNonSelectedBorderWidth || '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      <div className="flex items-center gap-3 justify-start">
                        <Avatar className="h-12 w-12 rounded-full">
                          <AvatarImage src={(p.avatarUrl || undefined) as any} alt={name} />
                          <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left flex-1">
                          <div className="text-base font-medium truncate text-left">{name}</div>
                          <div className="text-sm truncate text-left">{p.userRole || p.userEmail || ''}</div>
                          {p.positionTitle && (
                            <div className="text-sm truncate text-left mt-0.5 opacity-80">{p.positionTitle}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-left">No interviewers assigned to this position</div>
        )}
      </div>

      {/* Desktop: Scrollable list view */}
      <div className="hidden md:block">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <div className="space-y-3 text-left">
            {(interviewers.length > 0 ? interviewers : []).map((p, idx) => {
              const name = p.userName || p.userEmail || 'Interviewer';
              const initials = name.split(' ').map(s => s?.[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
              const isSelected = selectedInterviewerId === p.userId;
              return (
                <div key={p.id || idx} className="mb-3">
                  <button
                    onClick={() => handleInterviewerClick(p)}
                    className="w-full p-3 text-left transition-colors rounded-md"
                    style={isSelected ? {
                      ...(interviewerSelectedBgColor && interviewerSelectedBgColor.trim() && interviewerSelectedBgColor.includes('gradient') 
                        ? { background: interviewerSelectedBgColor }
                        : { backgroundColor: interviewerSelectedBgColor && interviewerSelectedBgColor.trim() ? `hsl(${interviewerSelectedBgColor})` : 'hsl(220 25% 97%)' }
                      ),
                      color: interviewerSelectedTextColor && interviewerSelectedTextColor.trim() ? `hsl(${interviewerSelectedTextColor})` : 'hsl(0 0% 0%)',
                      borderColor: interviewerSelectedBorderColor && interviewerSelectedBorderColor.trim() ? `hsl(${interviewerSelectedBorderColor})` : 'hsl(220 15% 50%)',
                      borderWidth: interviewerSelectedBorderWidth || '2px',
                      borderStyle: 'solid'
                    } : {
                      backgroundColor: interviewerNonSelectedBgColor && interviewerNonSelectedBgColor.trim() ? `hsl(${interviewerNonSelectedBgColor})` : 'hsl(220 25% 97%)',
                      color: interviewerNonSelectedTextColor && interviewerNonSelectedTextColor.trim() ? `hsl(${interviewerNonSelectedTextColor})` : 'hsl(220 25% 50%)',
                      borderColor: interviewerNonSelectedBorderColor && interviewerNonSelectedBorderColor.trim() ? `hsl(${interviewerNonSelectedBorderColor})` : 'hsl(220 15% 85%)',
                      borderWidth: interviewerNonSelectedBorderWidth || '1px',
                      borderStyle: 'solid'
                    }}
                  >
                    <div className="flex items-center gap-3 justify-start">
                      <Avatar className="h-10 w-10 rounded-full">
                        <AvatarImage src={(p.avatarUrl || undefined) as any} alt={name} />
                        <AvatarFallback className="rounded-full">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 text-left flex-1">
                        <div className="text-base font-medium truncate text-left">{name}</div>
                        <div className="text-sm truncate text-left">{p.userRole || p.userEmail || ''}</div>
                        {p.positionTitle && (
                          <div className="text-sm truncate text-left mt-0.5 opacity-80">{p.positionTitle}</div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
            {interviewers.length === 0 && (
              <div className="text-base text-muted-foreground text-left">No interviewers assigned to this position</div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Mobile: Separator line under interviewer section */}
      <div className="block md:hidden border-t my-4 -mx-6 sm:-mx-10" />
    </div>
  );
}

