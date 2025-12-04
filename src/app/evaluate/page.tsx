"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileCheck, User } from 'lucide-react';
import { CandidateAvatarCompact } from '@/components/ui/candidate-avatar';
import { formatCandidateNameWithLang } from '@/lib/candidateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface CandidateWithEvaluationLink {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  evaluationLink: {
    url: string;
    expiresAt: string;
  };
}

export default function EvaluatePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [candidates, setCandidates] = useState<CandidateWithEvaluationLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidatesWithEvaluationLinks();
  }, []);

  const fetchCandidatesWithEvaluationLinks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch evaluation links
      const response = await fetch('/api/v1/evaluation/links?status=active&limit=100', {
        credentials: 'include'
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to fetch candidates with evaluation links';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          if (errorData.hint) {
            errorMessage += ` - ${errorData.hint}`;
          }
        } catch (parseError) {
          // If response is not JSON, use status-based message
          if (response.status === 401) {
            errorMessage = 'Unauthorized. Please log in to view evaluation links.';
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to view evaluation links.';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Transform the data to include candidate info
      const candidatesWithLinks: CandidateWithEvaluationLink[] = (data.data || [])
        .filter((item: any) => item.candidate && item.url)
        .map((item: any) => ({
          id: item.candidate.id,
          name: item.candidate.name || 'Unknown',
          email: item.candidate.email,
          avatarUrl: null, // Will be fetched separately if needed
          evaluationLink: {
            url: item.url,
            expiresAt: item.expiresAt
          }
        }));

      setCandidates(candidatesWithLinks);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCandidateClick = (candidateId: string) => {
    router.push(`/candidates/${candidateId}/evaluate`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-screen",
        isMobile ? "p-4" : "p-6"
      )}>
        <div className={cn(
          "w-full text-center",
          isMobile ? "max-w-sm" : "max-w-md"
        )}>
          <FileCheck className={cn(
            "text-destructive mx-auto mb-4",
            isMobile ? "h-10 w-10" : "h-12 w-12"
          )} />
          <h2 className={cn(
            "font-semibold mb-2 text-destructive",
            isMobile ? "text-base" : "text-lg"
          )}>
            Error Loading Evaluation Links
          </h2>
          <p className={cn(
            "text-muted-foreground mb-6",
            isMobile ? "text-sm" : "text-base"
          )}>
            {error}
          </p>
          <div className="space-y-2">
            <Button 
              onClick={fetchCandidatesWithEvaluationLinks} 
              className="w-full"
              size={isMobile ? "default" : "lg"}
            >
              Retry
            </Button>
            {error.includes('permission') && (
              <p className="text-xs text-muted-foreground mt-4">
                If you believe you should have access, please contact your administrator.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("container mx-auto py-4", isMobile ? "px-4" : "px-6")}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Evaluate Candidates</h1>
        <p className="text-muted-foreground">
          Candidates with active evaluation links
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No candidates with evaluation links
          </h3>
          <p className="text-sm text-muted-foreground">
            Candidates with active evaluation links will appear here.
          </p>
        </div>
      ) : (
        <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3")}>
          {candidates.map((candidate) => {
            const nameInfo = formatCandidateNameWithLang({ name: candidate.name } as any);
            return (
              <Card
                key={candidate.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCandidateClick(candidate.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CandidateAvatarCompact
                      user={{
                        id: candidate.id,
                        name: candidate.name,
                        avatarUrl: candidate.avatarUrl,
                        email: candidate.email || undefined
                      }}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={cn("font-semibold text-base truncate", nameInfo.fontClass)} lang={nameInfo.lang}>
                        {candidate.name}
                      </h3>
                      {candidate.email && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {candidate.email}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          Evaluation Link Active
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

