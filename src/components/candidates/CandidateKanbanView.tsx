// src/components/candidates/CandidateKanbanView.tsx
"use client";

import type { Candidate, CandidateStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { CandidateDetailModal } from './CandidateDetailModal';
import { Pencil, Trash2, MoveRight, Plus, Calendar, Target, User, Mail, Phone, Clock, TrendingUp } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName } from "@/lib/candidateUtils";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';



interface CandidateKanbanViewProps {
  candidates: Candidate[];
  statuses: CandidateStatus[];
  onMoveCandidate?: (candidate: Candidate, newValue: string) => void;
  onCardClick?: (candidate: Candidate) => void;
  showAddButton?: boolean;
  rowField?: string;
  columnField?: string;
  visibleFields?: string[];
  visibleRowValues?: string[];
  visibleColumnValues?: string[];
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
        name: formatCandidateName(candidate),
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
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  // Skeleton loader for columns/cards
  if (loading) {
    return (
      <div className="w-full min-h-[300px] bg-muted/30 rounded-lg p-6 flex gap-4 overflow-x-auto">
        {statuses.map((status, idx) => (
          <div key={status} className="flex-shrink-0 w-72 md:w-80 bg-card rounded-xl shadow-sm border border-border p-4 flex flex-col gap-3 animate-pulse">
            <div className="h-6 w-2/3 bg-muted rounded mb-2" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg mb-2" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[400px] bg-muted/30 rounded-lg p-4 flex gap-4 overflow-x-auto">
      {statuses.map(status => (
        <div
          key={status}
          className={cn(
            "flex-shrink-0 w-72 md:w-80 flex flex-col h-full transition-all duration-200",
            dragOverStatus === status && "ring-2 ring-primary/60 bg-primary/5"
          )}
          onDragOver={e => handleDragOver(status, e)}
          onDrop={() => handleDrop(status)}
        >
          <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
            <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <CardTitle className="text-base font-semibold text-foreground capitalize">{status}</CardTitle>
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {candidatesByStatus[status]?.length || 0}
                </Badge>
              </div>
              {showAddButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => setAddingStatus(status)}
                  title={`Add card to ${status}`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
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
                      <Card className={cn(
                        "p-4 hover:shadow-md transition-all duration-200 bg-card border border-border flex flex-col gap-3 relative",
                        draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                      )}> 
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} data-ai-hint="person avatar"/>
                            <AvatarFallback className="bg-primary/10 text-primary">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate" title={formatCandidateName(candidate)}>{formatCandidateName(candidate)}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1" title={candidate.position?.title || 'N/A'}>
                              <Target className="w-3 h-3 inline mr-1" />
                              {candidate.position?.title || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Fit Score</span>
                                <span className="font-medium text-foreground">{candidate.fitScore}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                                  style={{ width: `${candidate.fitScore}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {candidate.email && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Mail className="w-3 h-3 mr-1" />
                              {candidate.email}
                            </div>
                          )}
                          
                          {candidate.phone && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Phone className="w-3 h-3 mr-1" />
                              {candidate.phone}
                            </div>
                          )}
                          
                          {candidate.applicationDate && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              Applied: {new Date(candidate.applicationDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No candidates</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Drag candidates here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      ))}
      
      {/* Candidate Detail Modal */}
      {selectedCandidateSummary && (
        <CandidateDetailModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          candidateSummary={selectedCandidateSummary}
        />
      )}
    </div>
  );
}

// Enhanced Row-based Kanban (stages as rows, candidates as draggable cards)
export function CandidateRowKanbanView({ 
  candidates, 
  statuses, 
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status', 
  columnField = 'recruiterId', 
  visibleFields = ['name', 'email', 'status', 'fitScore'], 
  visibleRowValues = [], 
  visibleColumnValues = [] 
}: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverRowValue, setDragOverRowValue] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);

  // Group candidates by row field value
  const candidatesByRowValue = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};
    
    // Initialize all visible row values with empty arrays
    visibleRowValues.forEach(rowValue => {
      grouped[rowValue] = [];
    });
    
    // Group candidates by their row field value
    candidates.forEach(candidate => {
      const rowValue = candidate[rowField as keyof Candidate] as string;
      if (rowValue && visibleRowValues.includes(rowValue)) {
        if (!grouped[rowValue]) {
          grouped[rowValue] = [];
        }
        grouped[rowValue].push(candidate);
      }
    });
    
    return grouped;
  }, [candidates, rowField, visibleRowValues]);

  // Only show rows in visibleRowValues (if provided)
  const filteredRowValues = visibleRowValues && visibleRowValues.length > 0
    ? visibleRowValues
    : statuses; // Fallback to statuses for backward compatibility

  // Drag and drop handlers
  const handleDragStart = (candidate: Candidate) => {
    setDraggedCandidate(candidate);
  };
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverRowValue(null);
  };
  const handleDragOver = (rowValue: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRowValue(rowValue);
  };
  const handleDrop = (rowValue: string) => {
    if (draggedCandidate && draggedCandidate[rowField as keyof Candidate] !== rowValue) {
      // Create update object with the new row field value
      const updateData: any = {};
      updateData[rowField] = rowValue;
      onMoveCandidate?.(draggedCandidate, rowValue);
    }
    setDraggedCandidate(null);
    setDragOverRowValue(null);
  };

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) {
      onCardClick(candidate);
    } else {
      setSelectedCandidateSummary({
        id: candidate.id,
        name: formatCandidateName(candidate),
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

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  return (
    <>
      <div className="w-full min-h-[400px] bg-muted/30 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4">
          {filteredRowValues.map(rowValue => (
            <div
              key={rowValue}
              className={cn(
                "flex flex-row items-center gap-4 transition-all duration-200 border border-border rounded-lg p-4 bg-card shadow-sm",
                dragOverRowValue === rowValue && "ring-2 ring-primary/60 bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver(rowValue, e)}
              onDrop={() => handleDrop(rowValue)}
            >
              <div className="w-40 flex-shrink-0 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="font-semibold text-base capitalize text-foreground">{rowValue}</span>
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {candidatesByRowValue[rowValue]?.length || 0} candidates
                </Badge>
              </div>
              <div className="flex-1 flex flex-row flex-wrap gap-3 min-h-[80px]">
                {candidatesByRowValue[rowValue]?.length > 0 ? (
                  candidatesByRowValue[rowValue].map(candidate => (
                    <div
                      key={candidate.id}
                      className={cn(
                        "cursor-pointer group w-64 max-w-xs",
                        draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                      )}
                      draggable
                      onDragStart={() => handleDragStart(candidate)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(candidate)}
                    >
                      <Card className="p-4 hover:shadow-md transition-all duration-200 bg-card border border-border flex flex-col gap-3 relative">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                            <AvatarFallback className="bg-primary/10 text-primary">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate" title={formatCandidateName(candidate)}>{formatCandidateName(candidate)}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1" title={candidate.position?.title || 'N/A'}>
                              <Target className="w-3 h-3 inline mr-1" />
                              {candidate.position?.title || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Fit Score</span>
                                <span className="font-medium text-foreground">{candidate.fitScore}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                                  style={{ width: `${candidate.fitScore}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {candidate.email && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Mail className="w-3 h-3 mr-1" />
                              {candidate.email}
                            </div>
                          )}
                          
                          {candidate.phone && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Phone className="w-3 h-3 mr-1" />
                              {candidate.phone}
                            </div>
                          )}
                          
                          {candidate.applicationDate && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              Applied: {new Date(candidate.applicationDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No candidates in this {rowField}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Drag candidates here</p>
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

// Flexible Kanban View that supports both row-based and column-based layouts
export function FlexibleKanbanView({ 
  candidates, 
  statuses, 
  onMoveCandidate, 
  onCardClick, 
  rowField = 'status', 
  columnField = 'recruiterId', 
  visibleFields = ['name', 'email', 'status', 'fitScore'], 
  visibleRowValues = [], 
  visibleColumnValues = [] 
}: CandidateKanbanViewProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<Candidate | null>(null);
  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);

  // Determine layout type based on field configuration
  const isColumnBased = columnField && columnField !== 'none' && visibleColumnValues.length > 0;
  const isRowBased = rowField && rowField !== 'none' && visibleRowValues.length > 0;

  // If no specific layout is configured, default to row-based with status
  const effectiveRowField = isRowBased ? rowField : 'status';
  const effectiveColumnField = isColumnBased ? columnField : null;
  const effectiveRowValues = isRowBased ? visibleRowValues : statuses;
  const effectiveColumnValues = isColumnBased ? visibleColumnValues : [];

  console.log('FlexibleKanbanView: Layout detection:', {
    rowField,
    columnField,
    visibleRowValues,
    visibleColumnValues,
    isColumnBased,
    isRowBased,
    effectiveRowField,
    effectiveColumnField,
    effectiveRowValues,
    effectiveColumnValues
  });

  // Group candidates by row and column values
  const candidatesByPosition = useMemo(() => {
    const grouped: Record<string, Record<string, Candidate[]>> = {};
    
    // Initialize all positions with empty arrays
    effectiveRowValues.forEach(rowValue => {
      grouped[rowValue] = {};
      if (isColumnBased) {
        effectiveColumnValues.forEach(colValue => {
          grouped[rowValue][colValue] = [];
        });
      } else {
        grouped[rowValue]['default'] = [];
      }
    });
    
    // Group candidates by their position
    candidates.forEach(candidate => {
      const rowValue = candidate[effectiveRowField as keyof Candidate] as string;
      const colValue = isColumnBased ? (candidate[effectiveColumnField as keyof Candidate] as string) : 'default';
      
      if (rowValue && effectiveRowValues.includes(rowValue)) {
        if (!grouped[rowValue]) {
          grouped[rowValue] = {};
        }
        if (isColumnBased) {
          if (colValue && effectiveColumnValues.includes(colValue)) {
            if (!grouped[rowValue][colValue]) {
              grouped[rowValue][colValue] = [];
            }
            grouped[rowValue][colValue].push(candidate);
          }
        } else {
          if (!grouped[rowValue]['default']) {
            grouped[rowValue]['default'] = [];
          }
          grouped[rowValue]['default'].push(candidate);
        }
      }
    });
    
    return grouped;
  }, [candidates, effectiveRowField, effectiveColumnField, effectiveRowValues, effectiveColumnValues, isColumnBased]);

  // Drag and drop handlers
  const handleDragStart = (candidate: Candidate) => {
    setDraggedCandidate(candidate);
  };
  
  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverRow(null);
    setDragOverColumn(null);
  };
  
  const handleDragOver = (rowValue: string, colValue: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRow(rowValue);
    setDragOverColumn(colValue);
  };
  
  const handleDrop = (rowValue: string, colValue: string) => {
    if (draggedCandidate) {
      const updateData: any = {};
      updateData[effectiveRowField] = rowValue;
      if (isColumnBased) {
        updateData[effectiveColumnField!] = colValue;
      }
      onMoveCandidate?.(draggedCandidate, rowValue);
    }
    setDraggedCandidate(null);
    setDragOverRow(null);
    setDragOverColumn(null);
  };

  const handleCardClick = (candidate: Candidate) => {
    if (onCardClick) {
      onCardClick(candidate);
    } else {
      setSelectedCandidateSummary({
        id: candidate.id,
        name: formatCandidateName(candidate),
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

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  // Render column-based layout (columns = columnField values, rows = rowField values)
  if (isColumnBased) {
    return (
      <>
        <div className="w-full min-h-[400px] bg-muted/30 rounded-lg p-4 flex gap-4 overflow-x-auto">
          {effectiveColumnValues.map((colValue) => (
            <div key={colValue} className="flex-shrink-0 w-80 flex flex-col h-full">
              <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
                <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {colValue?.charAt(0)?.toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">{colValue}</CardTitle>
                      <p className="text-xs text-muted-foreground">{effectiveColumnField}</p>
                    </div>
                  </div>
                </CardHeader>
                <ScrollArea className="flex-grow max-h-[60vh]">
                  <CardContent className="p-4 space-y-4">
                    {effectiveRowValues.map((rowValue) => {
                      const cellCandidates = candidatesByPosition[rowValue]?.[colValue] || [];
                      return (
                        <div key={rowValue} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{rowValue}</span>
                            <Badge variant="secondary" className="text-xs">
                              {cellCandidates.length}
                            </Badge>
                          </div>
                          <div
                            className={cn(
                              "min-h-[80px] p-2 rounded-lg border-2 border-dashed border-muted transition-all duration-200",
                              dragOverRow === rowValue && dragOverColumn === colValue && "border-primary bg-primary/5"
                            )}
                            onDragOver={(e) => handleDragOver(rowValue, colValue, e)}
                            onDrop={() => handleDrop(rowValue, colValue)}
                          >
                            {cellCandidates.length > 0 ? (
                              <div className="space-y-2">
                                {cellCandidates.map((candidate) => (
                                  <div
                                    key={candidate.id}
                                    className={cn(
                                      "cursor-pointer group p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200",
                                      draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                                    )}
                                    draggable
                                    onDragStart={() => handleDragStart(candidate)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleCardClick(candidate)}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Avatar className="h-6 w-6 flex-shrink-0">
                                        <AvatarImage src={candidate.avatarUrl} alt={formatCandidateName(candidate)} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                          {formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate" title={formatCandidateName(candidate)}>
                                          {formatCandidateName(candidate)}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate" title={candidate.position?.title || 'N/A'}>
                                          {candidate.position?.title || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                                      <div className="mt-2 space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">Fit</span>
                                          <span className="font-medium text-foreground">{candidate.fitScore}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1">
                                          <div 
                                            className={cn("h-1 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                                            style={{ width: `${candidate.fitScore}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-16">
                                <div className="text-center">
                                  <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground">Drop here</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </ScrollArea>
              </Card>
            </div>
          ))}
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

  // Render row-based layout (rows = rowField values)
  return (
    <>
      <div className="w-full min-h-[400px] bg-muted/30 rounded-lg p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4">
          {effectiveRowValues.map(rowValue => (
            <div
              key={rowValue}
              className={cn(
                "flex flex-row items-center gap-4 transition-all duration-200 border border-border rounded-lg p-4 bg-card shadow-sm",
                dragOverRow === rowValue && "ring-2 ring-primary/60 bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver(rowValue, 'default', e)}
              onDrop={() => handleDrop(rowValue, 'default')}
            >
              <div className="w-40 flex-shrink-0 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="font-semibold text-base capitalize text-foreground">{rowValue}</span>
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {candidatesByPosition[rowValue]?.['default']?.length || 0} candidates
                </Badge>
              </div>
              <div className="flex-1 flex flex-row flex-wrap gap-3 min-h-[80px]">
                {candidatesByPosition[rowValue]?.['default']?.length > 0 ? (
                  candidatesByPosition[rowValue]['default'].map(candidate => (
                    <div
                      key={candidate.id}
                      className={cn(
                        "cursor-pointer group w-64 max-w-xs",
                        draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                      )}
                      draggable
                      onDragStart={() => handleDragStart(candidate)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCardClick(candidate)}
                    >
                      <Card className="p-4 hover:shadow-md transition-all duration-200 bg-card border border-border flex flex-col gap-3 relative">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                            <AvatarFallback className="bg-primary/10 text-primary">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate" title={formatCandidateName(candidate)}>{formatCandidateName(candidate)}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1" title={candidate.position?.title || 'N/A'}>
                              <Target className="w-3 h-3 inline mr-1" />
                              {candidate.position?.title || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Fit Score</span>
                                <span className="font-medium text-foreground">{candidate.fitScore}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={cn("h-2 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                                  style={{ width: `${candidate.fitScore}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {candidate.email && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Mail className="w-3 h-3 mr-1" />
                              {candidate.email}
                            </div>
                          )}
                          
                          {candidate.phone && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Phone className="w-3 h-3 mr-1" />
                              {candidate.phone}
                            </div>
                          )}
                          
                          {candidate.applicationDate && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              Applied: {new Date(candidate.applicationDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No candidates in this {effectiveRowField}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Drag candidates here</p>
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

  const handleCardClick = (candidate: any) => {
    if (onCardClick) {
      onCardClick(candidate);
    }
  };

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  return (
    <div className="w-full min-h-[400px] bg-muted/30 rounded-lg p-4 flex gap-4 overflow-x-auto">
      {recruiters.map((recruiter: any) => (
        <div key={recruiter.id} className="flex-shrink-0 w-80 flex flex-col h-full">
          <Card className="flex flex-col h-full shadow-sm border border-border bg-card">
            <CardHeader className="p-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={recruiter.avatarUrl} alt={recruiter.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {recruiter.name?.charAt(0)?.toUpperCase() || 'R'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">{recruiter.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Recruiter</p>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-grow max-h-[60vh]">
              <CardContent className="p-4 space-y-4">
                {stages.map((stage: any) => {
                  const stageCandidates = candidates.filter((c: any) => c.status === stage && c.recruiterId === recruiter.id);
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{stage}</span>
                        <Badge variant="secondary" className="text-xs">
                          {stageCandidates.length}
                        </Badge>
                      </div>
                      <div
                        className={cn(
                          "min-h-[80px] p-2 rounded-lg border-2 border-dashed border-muted transition-all duration-200",
                          dragOverStage === stage && dragOverRecruiter?.id === recruiter.id && "border-primary bg-primary/5"
                        )}
                        onDragOver={(e) => handleDragOver(stage, recruiter, e)}
                        onDrop={() => handleDrop(stage, recruiter)}
                      >
                        {stageCandidates.length > 0 ? (
                          <div className="space-y-2">
                            {stageCandidates.map((candidate: any) => (
                              <div
                                key={candidate.id}
                                className={cn(
                                  "cursor-pointer group p-3 bg-card border border-border rounded-lg hover:shadow-sm transition-all duration-200",
                                  draggedCandidate?.id === candidate.id && "opacity-60 scale-95"
                                )}
                                draggable
                                onDragStart={() => handleDragStart(candidate)}
                                onDragEnd={handleDragEnd}
                                onClick={() => handleCardClick(candidate)}
                              >
                                <div className="flex items-start gap-2">
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={candidate.avatarUrl} alt={formatCandidateName(candidate)} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate" title={formatCandidateName(candidate)}>
                                      {formatCandidateName(candidate)}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate" title={candidate.position?.title || 'N/A'}>
                                      {candidate.position?.title || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                {candidate.fitScore !== undefined && candidate.fitScore !== null && (
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Fit</span>
                                      <span className="font-medium text-foreground">{candidate.fitScore}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1">
                                      <div 
                                        className={cn("h-1 rounded-full transition-all duration-300", getScoreBgColor(candidate.fitScore))}
                                        style={{ width: `${candidate.fitScore}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-16">
                            <div className="text-center">
                              <Plus className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Drop here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      ))}
    </div>
  );
}
