"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Target, BrainCircuit, FileText, AlertCircle, CheckCircle, ArrowLeft, ChevronRight, ChevronDown, Folder, FileX, FileTextIcon, FileIcon, ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Candidate, Position } from '@/lib/types';
import type { PersonalityGroup } from '@prisma/client';
import { getScoreColorInfo } from '@/components/ui/score-color';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { Badge } from '@/components/ui/badge';

interface EvaluationData {
  expertiseScores: any[];
  personalityScores: any[];
  overallScore: number;
  status: string;
  comments: string;
  evaluator: {
    name: string;
    email: string;
  };
  completedAt: string;
}

interface AveragedEvaluationData {
  overallScore: number;
  personalityScores: Array<{
    trait: {
      id: string;
      name: string;
      description?: string;
      group?: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
    averageScore: number;
    evaluatorCount: number;
  }>;
  evaluatorCount: number;
  expertiseScores?: Array<{
    skill: {
      id: string;
      name: string;
      maxScore: number;
      group: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
    averageScore: number;
    evaluatorCount: number;
  }>;
}

interface GroupedTrait {
  groupId: string;
  groupName: string;
  groupColor: string;
  traits: Array<{
    id: string;
    name: string;
    score: number;
    percentage: number;
  }>;
}

// Format personality score: show as integer if whole number, otherwise 1 decimal
const formatPersonalityScore = (score: number): string => {
  // If score is a whole number, display as integer
  if (score % 1 === 0) {
    return score.toString();
  }
  // Otherwise show 1 decimal place
  return score.toFixed(1);
};

// Helper function to build preview URL for attachments
const buildPreviewUrl = (att: any, candidateId: string, thumbnail: boolean = false): string => {
  if (att.filePath) {
    const params = new URLSearchParams({ filePath: att.filePath });
    if (att.fileName) params.set('fileName', att.fileName);
    if (candidateId) params.set('candidateId', candidateId);
    if (thumbnail) params.set('thumbnail', 'true');
    return `/api/secure-file/preview?${params.toString()}`;
  }
  
  // Legacy URL handling
  let url = att.url || '';
  if (url.includes('/api/secure-file/stream')) {
    url = url.replace('/api/secure-file/stream', '/api/secure-file/preview');
  }
  
  if (thumbnail && url.includes('/api/secure-file/preview')) {
    try {
      const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8021');
      urlObj.searchParams.set('thumbnail', 'true');
      return urlObj.toString();
    } catch {
      // If URL parsing fails, append as query string
      return `${url}${url.includes('?') ? '&' : '?'}thumbnail=true`;
    }
  }
  
  return url;
};

// Helper function to check if file is an image
const isImageFile = (fileName: string): boolean => {
  return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName || '');
};

// Helper function to get file icon based on extension
const getFileIcon = (fileName: string, size = 'w-6 h-6') => {
  if (isImageFile(fileName)) {
    return <ImageIcon className={`${size} text-blue-500`} />;
  }
  if (/\.pdf$/i.test(fileName)) {
    return <FileTextIcon className={`${size} text-red-500`} />;
  }
  return <FileIcon className={`${size} text-gray-500`} />;
};

// Component for attachment thumbnail button
const AttachmentThumbnailButton: React.FC<{
  attachment: any;
  thumbnailUrl: string | null;
  isImage: boolean;
  candidateId: string;
  onSelect: () => void;
}> = ({ attachment, thumbnailUrl, isImage, onSelect }) => {
  const [imageError, setImageError] = React.useState(false);
  
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group text-left relative"
      title={attachment.fileName}
    >
      <div className="relative w-full rounded-md border overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex flex-col items-center justify-center" style={{ aspectRatio: '1/1' }}>
        {isImage && thumbnailUrl && !imageError ? (
          <>
            <img
              src={thumbnailUrl}
              alt={attachment.fileName}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
            {/* Badges overlay */}
            <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none">
              <div className="flex flex-wrap items-start justify-end gap-0.5">
                {attachment.label && String(attachment.label).toLowerCase().includes('ai') && (
                  <Badge variant="default" className="text-[8px] px-1 py-0">
                    AI
                  </Badge>
                )}
                {attachment.label && !String(attachment.label).toLowerCase().includes('ai') && (
                  <Badge variant="secondary" className="text-[8px] px-1 py-0">
                    {attachment.label}
                  </Badge>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* File Icon */}
            <div className="flex-1 flex items-center justify-center p-1.5 sm:p-2">
              {getFileIcon(attachment.fileName, 'w-4 h-4 sm:w-5 sm:h-5')}
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-0.5 mt-1 w-full pb-1.5 sm:pb-2">
              {attachment.label && String(attachment.label).toLowerCase().includes('ai') && (
                <Badge variant="default" className="text-[8px] px-1 py-0">
                  AI
                </Badge>
              )}
              {attachment.label && !String(attachment.label).toLowerCase().includes('ai') && (
                <Badge variant="secondary" className="text-[8px] px-1 py-0">
                  {attachment.label}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
      <div className="mt-1 text-[9px] sm:text-[10px] text-muted-foreground line-clamp-2 text-center">{attachment.fileName}</div>
    </button>
  );
};

export default function EvaluateResultPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [averagedEvaluationData, setAveragedEvaluationData] = useState<AveragedEvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [evaluateHeaderBackgroundType, setEvaluateHeaderBackgroundType] = useState<'image' | 'gradient' | 'solid'>('gradient');
  const [evaluateHeaderBackgroundImage, setEvaluateHeaderBackgroundImage] = useState<string | null>(null);
  const [evaluateHeaderBackgroundGradient, setEvaluateHeaderBackgroundGradient] = useState<string | null>(null);
  const [evaluateHeaderBackgroundColor, setEvaluateHeaderBackgroundColor] = useState<string>('220 25% 97%');
  const [evaluateHeaderTextColor, setEvaluateHeaderTextColor] = useState<string>('0 0% 0%');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [personalityGroupsConfig, setPersonalityGroupsConfig] = useState<PersonalityGroup[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);

  useEffect(() => {
    if (candidateId) {
      fetchCandidateData();
      fetchEvaluationData();
      fetchHeaderSettings();
      fetchPersonalityGroupsConfig();
      fetchAttachments();
    }
  }, [candidateId]);

  const fetchCandidateData = async () => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCandidate(data);
        
        // Fetch position if candidate has positionId
        if (data.positionId) {
          const posResponse = await fetch(`/api/positions/${data.positionId}`, { credentials: 'include' });
          if (posResponse.ok) {
            const posData = await posResponse.json();
            setPosition(posData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching candidate data:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/resumes?limit=50&offset=0`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAttachments(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const fetchEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all evaluations for this candidate
      const response = await fetch(`/api/v1/candidates/${candidateId}/evaluations`);
      if (response.ok) {
        const evaluations = await response.json();
        
        if (!Array.isArray(evaluations) || evaluations.length === 0) {
          setEvaluationData(null);
          setAveragedEvaluationData(null);
          return;
        }

        // Calculate average personality scores across all interviewers
        const traitScoreMap = new Map<string, { scores: number[]; trait: any }>();
        const skillScoreMap = new Map<string, { scores: number[]; skill: any }>();
        let totalOverallScore = 0;
        let overallScoreCount = 0;
        // Track unique evaluators (interviewers)
        const uniqueEvaluatorIds = new Set<string>();

        evaluations.forEach((evaluation: any) => {
          // Track unique evaluators
          if (evaluation.evaluator?.id) {
            uniqueEvaluatorIds.add(evaluation.evaluator.id);
          }
          
          // Sum overall scores
          if (evaluation.overallScore !== null && evaluation.overallScore !== undefined) {
            totalOverallScore += evaluation.overallScore;
            overallScoreCount++;
          }

          // Collect personality scores by trait
          if (evaluation.personalityScores && Array.isArray(evaluation.personalityScores)) {
            evaluation.personalityScores.forEach((ps: any) => {
              if (ps.trait && ps.score) {
                const traitId = ps.trait.id;
                if (!traitScoreMap.has(traitId)) {
                  traitScoreMap.set(traitId, { scores: [], trait: ps.trait });
                }
                traitScoreMap.get(traitId)!.scores.push(ps.score);
              }
            });
          }

          // Collect expertise scores by skill
          if (evaluation.expertiseScores && Array.isArray(evaluation.expertiseScores)) {
            evaluation.expertiseScores.forEach((es: any) => {
              if (es.skill && es.score !== undefined) {
                const skillId = es.skill.id;
                if (!skillScoreMap.has(skillId)) {
                  skillScoreMap.set(skillId, { scores: [], skill: es.skill });
                }
                skillScoreMap.get(skillId)!.scores.push(es.score);
              }
            });
          }
        });

        // Calculate averages
        const averagedPersonalityScores = Array.from(traitScoreMap.entries()).map(([traitId, data]) => ({
          trait: data.trait,
          averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
          evaluatorCount: data.scores.length
        }));

        const averagedExpertiseScores = Array.from(skillScoreMap.entries()).map(([skillId, data]) => ({
          skill: data.skill,
          averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
          evaluatorCount: data.scores.length
        }));

        const averageOverallScore = overallScoreCount > 0 ? totalOverallScore / overallScoreCount : 0;

        // Count unique evaluators instead of total evaluations
        const uniqueEvaluatorCount = uniqueEvaluatorIds.size > 0 ? uniqueEvaluatorIds.size : evaluations.length;

        setAveragedEvaluationData({
          overallScore: averageOverallScore,
          personalityScores: averagedPersonalityScores,
          evaluatorCount: uniqueEvaluatorCount,
          expertiseScores: averagedExpertiseScores
        });

        // Keep the first evaluation for backward compatibility (comments, etc.)
        setEvaluationData(evaluations[0] || null);
      } else {
        // Fallback to single evaluation endpoint
        const fallbackResponse = await fetch(`/api/v1/candidates/${candidateId}/evaluation`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setEvaluationData(data || null);
          if (data) {
            setAveragedEvaluationData({
              overallScore: data.overallScore || 0,
              personalityScores: (data.personalityScores || []).map((ps: any) => ({
                trait: ps.trait,
                averageScore: ps.score,
                evaluatorCount: 1
              })),
              evaluatorCount: 1,
              expertiseScores: (data.expertiseScores || []).map((es: any) => ({
                skill: es.skill,
                averageScore: es.score,
                evaluatorCount: 1
              }))
            });
          } else {
            setAveragedEvaluationData(null);
          }
        } else {
          setEvaluationData(null);
          setAveragedEvaluationData(null);
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
      setError('Failed to load evaluation data');
      toast.error('Failed to load evaluation data');
      setEvaluationData(null);
      setAveragedEvaluationData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalityGroupsConfig = async () => {
    try {
      const response = await fetch('/api/evaluation/personality-traits');
      if (response.ok) {
        const data = await response.json();
        if (data.groups && Array.isArray(data.groups)) {
          // Sort groups by sortOrder
          const sortedGroups = [...data.groups].sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }
            return a.name.localeCompare(b.name);
          });
          setPersonalityGroupsConfig(sortedGroups);
        }
      }
    } catch (error) {
      console.error('Error fetching personality groups config:', error);
      // Silently fail - will fall back to alphabetical sorting
    }
  };

  const fetchHeaderSettings = async () => {
    try {
      const settingsRes = await fetch('/api/settings/system-settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const prefs = settingsData.settings && Array.isArray(settingsData.settings)
          ? Object.fromEntries(settingsData.settings.map((s: any) => [s.key, s.value]))
          : settingsData;
        // Use evaluate platform logo if set, otherwise fallback to app logo
        setAppLogoUrl(prefs.evaluatePlatformLogoDataUrl || prefs.appLogoDataUrl || null);
        
        // Load evaluate header background settings
        setEvaluateHeaderBackgroundType(prefs.evaluateHeaderBackgroundType || 'gradient');
        setEvaluateHeaderBackgroundImage(prefs.evaluateHeaderBackgroundImageUrl || null);
        if (prefs.evaluateHeaderBackgroundGradient) {
          setEvaluateHeaderBackgroundGradient(prefs.evaluateHeaderBackgroundGradient);
        } else if (prefs.evaluateHeaderBackgroundGradientStart && prefs.evaluateHeaderBackgroundGradientEnd) {
          setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(${prefs.evaluateHeaderBackgroundGradientStart}), hsl(${prefs.evaluateHeaderBackgroundGradientEnd}))`);
        } else {
          setEvaluateHeaderBackgroundGradient(`linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`);
        }
        setEvaluateHeaderBackgroundColor(prefs.evaluateHeaderBackgroundColor || '220 25% 97%');
        setEvaluateHeaderTextColor(prefs.evaluateHeaderTextColor || '0 0% 0%');
      }
    } catch (e) {
      // ignore silently
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Helper function to get evaluate header background style
  const getEvaluateHeaderBackgroundStyle = () => {
    if (evaluateHeaderBackgroundType === 'image' && evaluateHeaderBackgroundImage) {
      return {
        backgroundImage: `url(${evaluateHeaderBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    } else if (evaluateHeaderBackgroundType === 'gradient') {
      return {
        background: evaluateHeaderBackgroundGradient || `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`
      };
    } else if (evaluateHeaderBackgroundType === 'solid') {
      return {
        backgroundColor: `hsl(${evaluateHeaderBackgroundColor})`
      };
    }
    return {
      background: `linear-gradient(135deg, hsl(179 67% 66%), hsl(238 74% 61%))`
    };
  };

  // Group personality traits by group
  const groupPersonalityTraits = (): GroupedTrait[] => {
    if (!averagedEvaluationData?.personalityScores) return [];

    const groupMap = new Map<string, GroupedTrait>();

    averagedEvaluationData.personalityScores.forEach(ps => {
      const group = ps.trait.group;
      const groupId = group?.id || 'ungrouped';
      const groupName = group?.name || 'No Group';
      const groupColor = group?.color || '#6B7280';

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          groupId,
          groupName,
          groupColor,
          traits: []
        });
      }

      // Personality scores are 1-5, convert to percentage
      const percentage = ((ps.averageScore - 1) / 4) * 100;
      groupMap.get(groupId)!.traits.push({
        id: ps.trait.id,
        name: ps.trait.name,
        score: ps.averageScore,
        percentage
      });
    });

    // Sort groups by their sortOrder from config, then alphabetically
    const groups = Array.from(groupMap.values());
    return groups.sort((a, b) => {
      // Find groups in config by name
      const aGroup = personalityGroupsConfig.find(g => g.name === a.groupName);
      const bGroup = personalityGroupsConfig.find(g => g.name === b.groupName);
      
      // If both groups are in config, sort by sortOrder
      if (aGroup && bGroup) {
        if (aGroup.sortOrder !== bGroup.sortOrder) {
          return aGroup.sortOrder - bGroup.sortOrder;
        }
        return a.groupName.localeCompare(b.groupName);
      }
      
      // If only one is in config, prioritize it
      if (aGroup) return -1;
      if (bGroup) return 1;
      
      // If neither is in config, sort alphabetically
      return a.groupName.localeCompare(b.groupName);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading evaluation data...</span>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Candidate not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const personalityGroups = groupPersonalityTraits();

  return (
    <div 
      className="min-h-screen px-0 flex flex-col" 
      style={getEvaluateHeaderBackgroundStyle()}
    >
      {/* Header with logo - same as evaluate page */}
      <div className="py-6 flex items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/candidates/${candidateId}/evaluate`)}
            className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10"
            style={{ color: `hsl(${evaluateHeaderTextColor})`, borderColor: `hsl(${evaluateHeaderTextColor})` }}
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: `hsl(${evaluateHeaderTextColor})` }} />
          </Button>
          <div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wide" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>Candidate</div>
            <h1 className="text-lg sm:text-2xl font-semibold leading-tight" style={{ color: `hsl(${evaluateHeaderTextColor})` }}>{candidate.name}</h1>
          </div>
        </div>
        {appLogoUrl && (
          <div>
            <img src={appLogoUrl} alt="App Logo" className="h-6 sm:h-8 w-auto" />
          </div>
        )}
      </div>

      {/* Main card - more rounded */}
      <Card className="rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-none flex-1 border-0 shadow-lg">
        <CardContent className="h-full p-6 sm:p-10 space-y-6 overflow-y-auto">
          {/* Candidate Asset Section */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Folder className="h-3 w-3" />
              Candidate Asset
            </h3>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 sm:gap-2">
              {(attachments && attachments.length > 0 ? attachments : []).map((att: any) => {
                const isImage = isImageFile(att.fileName);
                const thumbnailUrl = isImage ? buildPreviewUrl(att, candidateId, true) : null;
                
                return (
                  <AttachmentThumbnailButton
                    key={att.id}
                    attachment={att}
                    thumbnailUrl={thumbnailUrl}
                    isImage={isImage}
                    candidateId={candidateId}
                    onSelect={() => {
                      setSelectedFile({ 
                        fileName: att.fileName, 
                        url: att.url, 
                        filePath: att.filePath, 
                        candidateId,
                        label: att.label,
                        updatedAt: att.updatedAt,
                        fileSize: att.fileSize
                      }); 
                      setFileViewerOpen(true);
                    }}
                  />
                );
              })}
              {(!attachments || attachments.length === 0) && (
                <div className="col-span-full">
                  <div className="h-20 rounded-md border-dashed border-2 bg-muted/20 flex flex-col items-center justify-center gap-1">
                    <FileX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">No attachment files available for this candidate</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expertise Skills - Horizontal Display (no groups) */}
            {averagedEvaluationData?.expertiseScores && averagedEvaluationData.expertiseScores.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-6 justify-start">
                  {averagedEvaluationData.expertiseScores.map((es) => {
                    const percentage = (es.averageScore / es.skill.maxScore) * 100;
                    const colorInfo = getScoreColorInfo(percentage);
                    const displayScore = es.averageScore % 1 === 0 ? es.averageScore.toFixed(0) : es.averageScore.toFixed(1);
                    
                    return (
                      <div key={es.skill.id} className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-muted bg-muted flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-xl sm:text-3xl font-bold ${colorInfo.text}`}>
                              {displayScore}
                            </div>
                            <div className="text-xs text-muted-foreground">/{es.skill.maxScore}</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="mt-1 text-sm font-medium">{es.skill.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="border-t my-4 -mx-6 sm:-mx-10" />

          {/* Personality Evaluation Section */}
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Personality Evaluation
            </h3>

            {averagedEvaluationData ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Overall Score
                      {averagedEvaluationData.evaluatorCount > 1 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          (Average from {averagedEvaluationData.evaluatorCount} interviewers)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {formatPersonalityScore(averagedEvaluationData.overallScore)}/5 ({Math.round(averagedEvaluationData.overallScore * 20)}%)
                    </div>
                  </CardContent>
                </Card>

                {/* Personality Traits - Grouped */}
                {personalityGroups.length > 0 && (
                  <div className="space-y-1">
                    {personalityGroups.map(group => {
                      const isExpanded = expandedGroups.has(group.groupId);
                      const avgScore = group.traits.reduce((sum, t) => sum + t.percentage, 0) / group.traits.length;
                      const colorInfo = getScoreColorInfo(avgScore);

                      return (
                        <div key={group.groupId} className="border rounded-md">
                          {/* Group Header */}
                          <button
                            onClick={() => toggleGroup(group.groupId)}
                            className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <span 
                                className="text-xs font-medium truncate"
                                style={{ color: group.groupColor }}
                              >
                                {group.groupName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colorInfo.bg} ${colorInfo.text}`}>
                                {avgScore.toFixed(1)}%
                              </span>
                            </div>
                          </button>

                          {/* Group Traits */}
                          {isExpanded && (
                            <div className="border-t bg-muted/20">
                              {group.traits.map(trait => {
                                const traitColorInfo = getScoreColorInfo(trait.percentage);
                                return (
                                  <div
                                    key={trait.id}
                                    className="flex items-center justify-between p-2 pl-8 hover:bg-muted/30 transition-colors"
                                  >
                                    <span className="text-xs text-foreground flex-1 min-w-0 truncate">
                                      {trait.name}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${traitColorInfo.bg} ${traitColorInfo.text}`}>
                                        {formatPersonalityScore(trait.score)}/5 ({trait.percentage.toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comments */}
                {evaluationData?.comments && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle>Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-blue-800">{evaluationData.comments}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No evaluation has been completed yet.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Viewer Modal */}
      {selectedFile && (
        <FileViewerModal
          isOpen={fileViewerOpen}
          onClose={() => {
            setFileViewerOpen(false);
            setSelectedFile(null);
          }}
          fileName={selectedFile.fileName}
          fileUrl={selectedFile.url}
          filePath={selectedFile.filePath}
          candidateId={selectedFile.candidateId}
          label={selectedFile.label}
          updatedAt={selectedFile.updatedAt}
          fileSize={selectedFile.fileSize}
        />
      )}
    </div>
  );
}

