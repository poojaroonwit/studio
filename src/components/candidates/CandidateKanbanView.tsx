// src/components/candidates/CandidateKanbanView.tsx
"use client";

import type { Candidate, CandidateStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { CandidateDetailModal } from './CandidateDetailModal';
import { Pencil, Trash2, MoveRight, Plus, Calendar, Target, User } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CandidateKanbanViewProps {
  candidates: Candidate[];
  statuses: CandidateStatus[];
  onMoveCandidate?: (candidate: Candidate, newStatus: CandidateStatus) => void;
  onCardClick?: (candidate: Candidate) => void;
  showAddButton?: boolean;
  rowField?: string;
  columnField?: string;
  visibleFields?: string[];
}

export function CandidateKanbanView({ candidates, statuses, onMoveCandidate, onCardClick, showAddButton = true }: CandidateKanbanViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<CandidateStatus | null>(null);
  const [loading, setLoading] = useState(false); // For skeleton loader
  const [addingStatus, setAddingStatus] = useState<CandidateStatus | null>(null);

  const candidatesByStatus = statuses.reduce((acc, status) => {
    acc[status] = candidates.filter(c => c.status === status);
    return acc;
  }, {} as Record<CandidateStatus, Candidate[]>);

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) {
      onCardClick(candidate);
    } else {
      setSelectedCandidateSummary({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        status: candidate.status,
        position: candidate.position,
        fitScore: candidate.fitScore,
        parsedData: candidate.parsedData 
      });
      setIsModalOpen(true);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (candidate: Candidate) => {
    setDraggedCandidate(candidate);
  };
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverStatus(null);
  };
  const handleDragOver = (status: CandidateStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStatus(status);
  };
  const handleDrop = (status: CandidateStatus) => {
    if (draggedCandidate && draggedCandidate.status !== status) {
      onMoveCandidate?.(draggedCandidate, status);
    }
    setDraggedCandidate(null);
    setDragOverStatus(null);
  };

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Skeleton loader for columns/cards
  if (loading) {
    return (
      <div className="w-full min-h-[300px] bg-gray-50 rounded-lg p-6 flex gap-4 overflow-x-auto">
        {statuses.map((status, idx) => (
          <div key={status} className="flex-shrink-0 w-72 md:w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3 animate-pulse">
            <div className="h-6 w-2/3 bg-gray-200 rounded mb-2" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg mb-2" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px] bg-gray-50 rounded-lg p-4 flex gap-4 overflow-x-auto">
      {statuses.map(status => (
        <div
          key={status}
          className={`flex-shrink-0 w-72 md:w-80 flex flex-col h-full transition-all ${dragOverStatus === status ? 'ring-2 ring-blue-500/60 bg-blue-50/60' : ''}`}
          onDragOver={e => handleDragOver(status, e)}
          onDrop={() => handleDrop(status)}
        >
          <Card className="flex flex-col h-full shadow-sm border border-gray-200 bg-white">
            <CardHeader className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <CardTitle className="text-base font-semibold text-gray-900 capitalize">{status}</CardTitle>
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {candidatesByStatus[status]?.length || 0}
                </Badge>
              </div>
              {showAddButton && (
                <button
                  className="ml-auto flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  onClick={() => setAddingStatus(status)}
                  title={`Add card to ${status}`}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </CardHeader>
            <ScrollArea className="flex-grow max-h-[60vh]">
              <CardContent className="p-4 space-y-3 min-h-[150px]">
                {candidatesByStatus[status]?.length > 0 ? (
                  candidatesByStatus[status].map(candidate => (
                    <div
                      key={candidate.id}
                      onClick={() => handleCardClick(candidate)}
                      className="cursor-pointer group"
                      draggable
                      onDragStart={() => handleDragStart(candidate)}
                      onDragEnd={handleDragEnd}
                    >
                      <Card className={`p-4 hover:shadow-md transition-all duration-200 bg-white border border-gray-200 flex flex-col gap-3 relative ${draggedCandidate?.id === candidate.id ? 'opacity-60 scale-95' : ''}`}> 
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${candidate.name?.charAt(0) || 'C'}`} alt={candidate.name} data-ai-hint="person avatar"/>
                            <AvatarFallback className="bg-blue-100 text-blue-600">{candidate.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate" title={candidate.name}>{candidate.name}</p>
                            <p className="text-xs text-gray-500 truncate mt-1" title={candidate.position?.title || 'N/A'}>
                              <Target className="w-3 h-3 inline mr-1" />
                              {candidate.position?.title || 'N/A'}
                            </p>
                          </div>
                          {/* Quick actions (edit/move/delete) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 z-10">
                            <button className="p-1 rounded hover:bg-gray-100 transition-colors" title="Edit">
                              <Pencil className="w-4 h-4 text-blue-500" />
                            </button>
                            <button className="p-1 rounded hover:bg-gray-100 transition-colors" title="Move">
                              <MoveRight className="w-4 h-4 text-gray-500" />
                            </button>
                            <button className="p-1 rounded hover:bg-gray-100 transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Fit Score</span>
                                <span className="font-medium text-gray-900">{candidate.fitScore}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${getScoreBgColor(candidate.fitScore)}`}
                                  style={{ width: `${candidate.fitScore}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {candidate.email && (
                            <div className="flex items-center text-xs text-gray-500">
                              <User className="w-3 h-3 mr-1" />
                              {candidate.email}
                            </div>
                          )}
                          
                          {candidate.applicationDate && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              Applied: {candidate.applicationDate}
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">No candidates here</p>
                      <p className="text-xs text-gray-400 mt-1">Drag candidates to this column</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
            {/* Add Card Modal/Placeholder */}
            {addingStatus === status && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-2 items-center">
                  <Input placeholder="Candidate name..." className="flex-1 text-sm" />
                  <Button size="sm" variant="default" onClick={() => setAddingStatus(null)} className="text-xs">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingStatus(null)} className="text-xs">Cancel</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}

// New: Row-based Kanban (stages as rows, candidates as draggable cards)
export function CandidateRowKanbanView({ candidates, statuses, onMoveCandidate, onCardClick, rowField, columnField, visibleFields }: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<CandidateStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);

  const candidatesByStatus = statuses.reduce((acc, status) => {
    acc[status] = candidates.filter(c => c.status === status);
    return acc;
  }, {} as Record<CandidateStatus, Candidate[]>);

  // Drag and drop handlers
  const handleDragStart = (candidate: Candidate) => {
    setDraggedCandidate(candidate);
  };
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverStatus(null);
  };
  const handleDragOver = (status: CandidateStatus, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStatus(status);
  };
  const handleDrop = (status: CandidateStatus) => {
    if (draggedCandidate && draggedCandidate.status !== status) {
      onMoveCandidate?.(draggedCandidate, status);
    }
    setDraggedCandidate(null);
    setDragOverStatus(null);
  };

  const handleCardClick = (candidate: Candidate) => {
    setSelectedCandidateSummary({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      status: candidate.status,
      position: candidate.position,
      fitScore: candidate.fitScore,
      parsedData: candidate.parsedData
    });
    setIsModalOpen(true);
  };

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <>
      <div className="w-full min-h-[400px] bg-gray-50 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4">
          {statuses.map(status => (
            <div
              key={status}
              className={`flex flex-row items-center gap-4 transition-all border border-gray-200 rounded-lg p-4 bg-white shadow-sm ${dragOverStatus === status ? 'ring-2 ring-blue-500/60 bg-blue-50/60' : ''}`}
              onDragOver={e => handleDragOver(status, e)}
              onDrop={() => handleDrop(status)}
            >
              <div className="w-40 flex-shrink-0 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-semibold text-base capitalize text-gray-900">{status}</span>
                </div>
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {candidatesByStatus[status]?.length || 0} candidates
                </Badge>
              </div>
              <div className="flex-1 flex flex-row flex-wrap gap-3 min-h-[80px]">
                {candidatesByStatus[status]?.length > 0 ? (
                  candidatesByStatus[status].map(candidate => (
                    <div
                      key={candidate.id}
                      className={`cursor-pointer group w-64 max-w-xs ${draggedCandidate?.id === candidate.id ? 'opacity-60 scale-95' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(candidate)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(candidate)}
                    >
                      <Card className="p-4 hover:shadow-md transition-all duration-200 bg-white border border-gray-200 flex flex-col gap-3 relative">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${candidate.name?.charAt(0) || 'C'}`} alt={candidate.name} />
                            <AvatarFallback className="bg-blue-100 text-blue-600">{candidate.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate" title={candidate.name}>{candidate.name}</p>
                            <p className="text-xs text-gray-500 truncate mt-1" title={candidate.position?.title || 'N/A'}>
                              <Target className="w-3 h-3 inline mr-1" />
                              {candidate.position?.title || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Fit Score</span>
                                <span className="font-medium text-gray-900">{candidate.fitScore}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${getScoreBgColor(candidate.fitScore)}`}
                                  style={{ width: `${candidate.fitScore}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {candidate.email && (
                            <div className="flex items-center text-xs text-gray-500">
                              <User className="w-3 h-3 mr-1" />
                              {candidate.email}
                            </div>
                          )}
                          
                          {candidate.applicationDate && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Calendar className="w-3 h-3 mr-1" />
                              Applied: {candidate.applicationDate}
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">No candidates in this stage</p>
                      <p className="text-xs text-gray-400 mt-1">Drag candidates here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Candidate Detail Modal */}
      {selectedCandidateSummary && (
        <CandidateDetailModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          candidateSummary={selectedCandidateSummary}
        />
      )}
    </>
  );
}

export function MultiRecruiterKanbanView({ candidates, stages, recruiters, onMoveCandidate, onCardClick }: any) {
  const [draggedCandidate, setDraggedCandidate] = useState<any>(null);
  const [dragOverStage, setDragOverStage] = useState<any>(null);
  const [dragOverRecruiter, setDragOverRecruiter] = useState<any>(null);

  const handleDragStart = (candidate: any) => setDraggedCandidate(candidate);
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverStage(null);
    setDragOverRecruiter(null);
  };
  const handleDragOver = (stage: any, recruiter: any, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStage(stage);
    setDragOverRecruiter(recruiter);
  };
  const handleDrop = (stage: any, recruiter: any) => {
    if (draggedCandidate) {
      onMoveCandidate?.(draggedCandidate, stage, recruiter.id);
    }
    setDraggedCandidate(null);
    setDragOverStage(null);
    setDragOverRecruiter(null);
  };

  return (
    <div className="w-full min-h-[400px] bg-gray-50 rounded-lg p-4 overflow-auto">
      <div className="grid grid-cols-1 gap-4">
        {stages.map((stage: any) => (
          <div key={stage} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{stage}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recruiters.map((recruiter: any) => {
                const recruiterCandidates = candidates.filter((c: any) => 
                  c.status === stage && c.recruiterId === recruiter.id
                );
                
                return (
                  <div
                    key={recruiter.id}
                    className={`p-4 border border-gray-200 rounded-lg transition-all ${
                      dragOverStage === stage && dragOverRecruiter === recruiter 
                        ? 'ring-2 ring-blue-500/60 bg-blue-50/60' 
                        : 'bg-gray-50'
                    }`}
                    onDragOver={(e) => handleDragOver(stage, recruiter, e)}
                    onDrop={() => handleDrop(stage, recruiter)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{recruiter.name}</h4>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                        {recruiterCandidates.length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {recruiterCandidates.map((candidate: any) => (
                        <div
                          key={candidate.id}
                          className={`p-3 bg-white rounded border border-gray-200 cursor-pointer hover:shadow-sm transition-all ${
                            draggedCandidate?.id === candidate.id ? 'opacity-60 scale-95' : ''
                          }`}
                          draggable
                          onDragStart={() => handleDragStart(candidate)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onCardClick?.(candidate)}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={candidate.avatarUrl} alt={candidate.name} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {candidate.name?.charAt(0)?.toUpperCase() || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
                              <p className="text-xs text-gray-500 truncate">{candidate.position?.title}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
