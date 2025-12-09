"use client";

import React, { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Camera, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Candidate, Position } from '@/lib/types';
import type { AveragedEvaluationData } from '../types';

interface ReportHeaderProps {
  candidate: Candidate;
  position: Position | null;
  organizationLogoUrl: string | null;
  organizationName: string | null;
  appLogoUrl: string | null;
  averagedEvaluationData: AveragedEvaluationData | null;
  allEvaluations: any[];
  canEditCandidateBasic: () => boolean;
  avatarUploading: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  handleAvatarUpload: (file: File) => Promise<void>;
}

export function ReportHeader({
  candidate,
  position,
  organizationLogoUrl,
  organizationName,
  appLogoUrl,
  averagedEvaluationData,
  allEvaluations,
  canEditCandidateBasic,
  avatarUploading,
  avatarInputRef,
  handleAvatarUpload,
}: ReportHeaderProps) {
  return (
    <div className="border-b-2 border-gray-200 pb-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Organization and Application Logos */}
        <div className="flex items-center gap-4">
          {organizationLogoUrl && (
            <>
              <img
                src={organizationLogoUrl}
                alt="Organization Logo"
                className="h-8 w-auto"
                onError={(e) => {
                  console.error('Failed to load organization logo:', organizationLogoUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
              {organizationName && <span className="text-gray-400">|</span>}
            </>
          )}
          {organizationName && (
            <span className="text-lg font-semibold text-gray-900">{organizationName}</span>
          )}
          {appLogoUrl && (
            <>
              <span className="text-gray-400">|</span>
              <img
                src={appLogoUrl}
                alt="Application Logo"
                className="h-12 w-auto"
                onError={(e) => {
                  console.error('Failed to load application logo:', appLogoUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Report Date</p>
            <p className="text-base font-semibold text-gray-900">
              {format(new Date(), 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>
      </div>


      {/* Candidate Name */}
      <div className="mb-6 flex items-start gap-4">
        <div className="relative hidden sm:block">
          <Avatar className="h-20 w-20 border-none ring-0 outline-none shadow-none">
            <AvatarImage src={candidate.avatarUrl || undefined} alt={candidate.name} />
            <AvatarFallback className="bg-gray-200 text-gray-700 text-2xl font-semibold">
              {candidate.name?.charAt(0)?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          {canEditCandidateBasic() && (
            <>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors no-print"
                title="Change avatar"
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                type="file"
                accept="image/*"
                ref={avatarInputRef}
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await handleAvatarUpload(file);
                  }
                  e.target.value = '';
                }}
                tabIndex={-1}
                aria-hidden="true"
              />
            </>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-semibold text-gray-900 mb-2">{candidate.name}</h2>
          {/* Position and Grade */}
          {position && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-medium text-gray-900">{position.title}</span>
              {position.grade && (
                <>
                  <span className="text-gray-400">|</span>
                  <Badge
                    className="text-sm"
                    style={{
                      backgroundColor: position.grade.color || '#3B82F6',
                      color: 'white'
                    }}
                  >
                    {position.grade.label || position.grade.name}
                  </Badge>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Evaluators Section */}
      {averagedEvaluationData && allEvaluations.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">
                {averagedEvaluationData.evaluatorCount} {averagedEvaluationData.evaluatorCount === 1 ? 'Evaluator' : 'Evaluators'}
              </span>
            </div>
            <span className="text-gray-400">|</span>
            <div className="flex items-center gap-3 flex-wrap">
              {Array.from(new Map(allEvaluations.map(e => [e.evaluator?.id, e.evaluator])).values())
                .filter(e => e)
                .map((evaluator, idx) => (
                  <div key={evaluator?.id || idx} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={evaluator?.avatarUrl || evaluator?.image || undefined} alt={evaluator?.name || ''} />
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                        {evaluator?.name?.charAt(0)?.toUpperCase() || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 font-medium">{evaluator?.name || 'Unknown'}</span>
                      {position && (
                        <span className="text-xs text-gray-500">{position.title}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

