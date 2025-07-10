// src/components/candidates/CandidateKanbanView.tsx
"use client";

import type { Candidate, CandidateStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from 'react';
import { CandidateDetailModal } from './CandidateDetailModal';
import { Pencil, Trash2, MoveRight, Plus } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CandidateKanbanViewProps {
  candidates: Candidate[];
  statuses: CandidateStatus[];
  onMoveCandidate?: (candidate: Candidate, newStatus: CandidateStatus) => void;
  onCardClick?: (candidate: Candidate) => void;
  showAddButton?: boolean;
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

  // Skeleton loader for columns/cards
  if (loading) {
    return (
      <div className="w-full min-h-[300px] bg-background rounded-lg p-6 flex gap-4 overflow-x-auto">
        {statuses.map((status, idx) => (
          <div key={status} className="flex-shrink-0 w-72 md:w-80 bg-muted rounded-xl shadow p-4 flex flex-col gap-3 animate-pulse">
            <div className="h-6 w-2/3 bg-muted rounded mb-2" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg mb-2" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px] bg-background rounded-lg p-4 flex gap-4 overflow-x-auto">
      {statuses.map(status => (
        <div
          key={status}
          className={`flex-shrink-0 w-72 md:w-80 flex flex-col h-full transition-all ${dragOverStatus === status ? 'ring-2 ring-primary/60 bg-accent/60' : ''}`}
          onDragOver={e => handleDragOver(status, e)}
          onDrop={() => handleDrop(status)}
        >
          <Card className="flex flex-col h-full shadow-md border border-border bg-card">
            <CardHeader className="p-3 sm:p-4 border-b sticky top-0 bg-card z-10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg capitalize">{status}</CardTitle>
                <span className="text-xs font-semibold text-muted-foreground bg-muted rounded px-2 py-0.5">{candidatesByStatus[status]?.length || 0}</span>
              </div>
              {showAddButton && (
                <button
                  className="ml-auto flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium px-2 py-1 rounded hover:bg-accent transition"
                  onClick={() => setAddingStatus(status)}
                  title={`Add card to ${status}`}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </CardHeader>
            <ScrollArea className="flex-grow max-h-[60vh]">
              <CardContent className="p-3 sm:p-4 space-y-3 min-h-[150px]">
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
                      <Card className={`p-3 hover:shadow-lg transition-shadow bg-card flex flex-col gap-2 relative ${draggedCandidate?.id === candidate.id ? 'opacity-60' : ''}`}> 
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${candidate.name?.charAt(0) || 'C'}`} alt={candidate.name} data-ai-hint="person avatar"/>
                            <AvatarFallback>{candidate.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate" title={candidate.name}>{candidate.name}</p>
                            <p className="text-xs text-muted-foreground truncate" title={candidate.position?.title || 'N/A'}>{candidate.position?.title || 'N/A'}</p>
                          </div>
                          {/* Quick actions (edit/move/delete) */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition absolute right-2 top-2 z-10">
                            <button className="p-1 rounded hover:bg-accent" title="Edit"><Pencil className="w-4 h-4 text-blue-500" /></button>
                            <button className="p-1 rounded hover:bg-accent" title="Move"><MoveRight className="w-4 h-4 text-gray-500" /></button>
                            <button className="p-1 rounded hover:bg-accent" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                          </div>
                        </div>
                        {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                          <p className="text-xs text-muted-foreground mt-1.5">Fit Score: <span className={`font-semibold ${getScoreColor(candidate.fitScore)}`}>{formatScoreWithGrade(candidate.fitScore)}</span></p>
                        )}
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground text-center py-4">No candidates here.</p>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
            {/* Add Card Modal/Placeholder */}
            {addingStatus === status && (
              <div className="p-3 border-t bg-muted">
                <div className="flex gap-2 items-center">
                  <Input placeholder="Candidate name..." className="flex-1" />
                  <Button size="sm" variant="default" onClick={() => setAddingStatus(null)}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingStatus(null)}>Cancel</Button>
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
export function CandidateRowKanbanView({ candidates, statuses, onMoveCandidate }: CandidateKanbanViewProps) {
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

  return (
    <>
      <div className="w-full min-h-[400px] bg-background rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4">
          {statuses.map(status => (
            <div
              key={status}
              className={`flex flex-row items-center gap-4 transition-all border rounded-lg p-3 bg-card ${dragOverStatus === status ? 'ring-2 ring-primary/60 bg-accent/60' : ''}`}
              onDragOver={e => handleDragOver(status, e)}
              onDrop={() => handleDrop(status)}
            >
              <div className="w-40 flex-shrink-0 flex flex-col items-center">
                <span className="font-semibold text-base capitalize">{status}</span>
                <span className="text-xs font-semibold text-muted-foreground bg-muted rounded px-2 py-0.5 mt-1">{candidatesByStatus[status]?.length || 0}</span>
              </div>
              <div className="flex-1 flex flex-row flex-wrap gap-3 min-h-[60px]">
                {candidatesByStatus[status]?.length > 0 ? (
                  candidatesByStatus[status].map(candidate => (
                    <div
                      key={candidate.id}
                      className={`cursor-pointer group w-64 max-w-xs ${draggedCandidate?.id === candidate.id ? 'opacity-60' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(candidate)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(candidate)}
                    >
                      <Card className="p-3 hover:shadow-lg transition-shadow bg-card flex flex-col gap-2 relative">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${candidate.name?.charAt(0) || 'C'}`} alt={candidate.name} data-ai-hint="person avatar"/>
                            <AvatarFallback>{candidate.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate" title={candidate.name}>{candidate.name}</p>
                            <p className="text-xs text-muted-foreground truncate" title={candidate.position?.title || 'N/A'}>{candidate.position?.title || 'N/A'}</p>
                          </div>
                        </div>
                        {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                          <p className="text-xs text-muted-foreground mt-1.5">Fit Score: <span className={`font-semibold ${getScoreColor(candidate.fitScore)}`}>{formatScoreWithGrade(candidate.fitScore)}</span></p>
                        )}
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[60px]">
                    <p className="text-sm text-muted-foreground text-center py-4">No candidates here.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
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

// Multi-recruiter Kanban implementation
export function MultiRecruiterKanbanView({ candidates, stages, recruiters, onMoveCandidate, onCardClick }: any) {
  // State for drag-and-drop
  const [draggedCandidate, setDraggedCandidate] = useState<any | null>(null);
  const [dragOver, setDragOver] = useState<{ stage: any; recruiter: any } | null>(null);

  // Group candidates by stage and recruiter
  const candidatesByStageAndRecruiter = stages.reduce((acc: any, stage: any) => {
    acc[stage] = recruiters.reduce((recAcc: any, recruiter: any) => {
      recAcc[recruiter.id] = candidates.filter(
        (c: any) => c.status === stage && c.recruiterId === recruiter.id
      );
      return recAcc;
    }, {});
    return acc;
  }, {});

  // Drag handlers
  const handleDragStart = (candidate: any) => setDraggedCandidate(candidate);
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOver(null);
  };
  const handleDragOver = (stage: any, recruiter: any, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver({ stage, recruiter });
  };
  const handleDrop = (stage: any, recruiter: any) => {
    if (
      draggedCandidate &&
      (draggedCandidate.status !== stage || draggedCandidate.recruiterId !== recruiter.id)
    ) {
      onMoveCandidate?.(draggedCandidate, stage, recruiter.id);
    }
    setDraggedCandidate(null);
    setDragOver(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-background z-10 border p-2 text-left">Stage \ Recruiter</th>
            {recruiters.map((recruiter: any) => (
              <th key={recruiter.id} className="border p-2 text-center">{recruiter.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stages.map((stage: any) => (
            <tr key={stage}>
              <td className="sticky left-0 bg-background z-10 border p-2 font-semibold">{stage}</td>
              {recruiters.map((recruiter: any) => (
                <td
                  key={recruiter.id}
                  className={`align-top border min-w-[220px] h-[120px] ${
                    dragOver && dragOver.stage === stage && dragOver.recruiter.id === recruiter.id
                      ? 'ring-2 ring-primary/60 bg-accent/60' : ''
                  }`}
                  onDragOver={e => handleDragOver(stage, recruiter, e)}
                  onDrop={() => handleDrop(stage, recruiter)}
                >
                  <div className="flex flex-col gap-2 min-h-[80px]">
                    {(candidatesByStageAndRecruiter[stage][recruiter.id] || []).map((candidate: any) => (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={() => handleDragStart(candidate)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onCardClick?.(candidate)}
                        className={`cursor-pointer group ${draggedCandidate?.id === candidate.id ? 'opacity-60' : ''}`}
                      >
                        <Card className="p-2 hover:shadow-lg transition-shadow bg-card flex flex-col gap-1 relative">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${candidate.name?.charAt(0) || 'C'}`} alt={candidate.name} />
                              <AvatarFallback>{candidate.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate" title={candidate.name}>{candidate.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate" title={candidate.position?.title || 'N/A'}>{candidate.position?.title || 'N/A'}</p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
