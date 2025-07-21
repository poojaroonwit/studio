"use client";

import * as React from "react";
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileEdit, Trash2, Eye, Users, UploadCloud, Briefcase } from 'lucide-react';
import { formatScoreWithGrade, getScoreColor, getScoreBgColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import type { Candidate, CandidateStatus, Position, RecruitmentStage } from '@/lib/types';
import { ManageTransitionsModal } from './ManageTransitionsModal';
import { format } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';



interface CandidateTableProps {
  candidates: Candidate[];
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiters: { id: string; name: string }[];
  onAssignRecruiter: (candidateId: string, recruiterId: string | null) => void;
  onUpdateCandidate: (candidateId: string, status: CandidateStatus, notes?: string, suppressToast?: boolean) => Promise<void>;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  onOpenUploadModal: (candidate: Candidate) => void;
  onEditPosition: (position: Position) => void;
  isLoading?: boolean;
  onRefreshCandidateData: (candidateId: string) => Promise<void>;
  // For bulk actions
  selectedCandidateIds: Set<string>;
  onToggleSelectCandidate: (candidateId: string) => void;
  onToggleSelectAllCandidates: () => void;
  isAllCandidatesSelected: boolean;
}

const getStatusBadgeVariant = (status: CandidateStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Hired':
    case 'Offer Accepted':
      return 'default';
    case 'Interview Scheduled':
    case 'Interviewing':
    case 'Offer Extended':
      return 'secondary';
    case 'Rejected':
      return 'destructive';
    case 'Applied':
    case 'Screening':
    case 'Shortlisted':
    case 'On Hold':
      return 'outline';
    default:
      return 'outline';
  }
};

export function CandidateTable({
  candidates,
  availablePositions,
  availableStages,
  availableRecruiters,
  onAssignRecruiter,
  onUpdateCandidate,
  onDeleteCandidate,
  onOpenUploadModal,
  onEditPosition,
  isLoading,
  onRefreshCandidateData,
  selectedCandidateIds,
  onToggleSelectCandidate,
  onToggleSelectAllCandidates,
  isAllCandidatesSelected,
}: CandidateTableProps) {
  const [selectedCandidateForModal, setSelectedCandidateForModal] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  // Add state for comments and logs
  const [modalComments, setModalComments] = useState<any[]>([]);
  const [modalLogs, setModalLogs] = useState<any[]>([]);
  const [selectedCandidateSummary, setSelectedCandidateSummary] = useState<Partial<Candidate> & { id: string; name: string } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isManageTransitionsModalOpen, setIsManageTransitionsModalOpen] = useState(false);

  // Helper to combine and sort activities
  const getCombinedActivities = () => {
    const comments = modalComments.map(comment => ({
      ...comment,
      type: 'comment',
      date: comment.createdAt,
    }));
    const logs = modalLogs.map(log => ({
      ...log,
      type: 'activity',
      date: log.time || log.createdAt,
    }));
    return [...comments, ...logs].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  };

  // Update handleManageTransitionsClick to fetch comments and logs
  const handleManageTransitionsClick = async (candidate: Candidate) => {
    setSelectedCandidateForModal(candidate);
    // Fetch comments
    const commentsRes = await fetch(`/api/candidates/${candidate.id}/comments`);
    const commentsData = await commentsRes.json();
    setModalComments(Array.isArray(commentsData) ? commentsData : (commentsData.data || []));
    // Fetch logs/activity
    const logsRes = await fetch(`/api/candidates/${candidate.id}/logs`);
    const logsData = await logsRes.json();
    setModalLogs(Array.isArray(logsData) ? logsData : (logsData.data || []));
    // Open the modal
    setIsManageTransitionsModalOpen(true);
  };

  const handleEditPositionClick = (positionId: string | null | undefined) => {
    if (!positionId) return;
    const positionToEdit = availablePositions.find(p => p.id === positionId);
    if (positionToEdit) {
      onEditPosition(positionToEdit);
    }
  };

  const confirmDelete = (candidate: Candidate) => {
    setCandidateToDelete(candidate);
  };

  const executeDelete = () => {
    if (candidateToDelete) {
      onDeleteCandidate(candidateToDelete.id);
      setCandidateToDelete(null);
    }
  };

  // Add a handler for row click
  const handleRowClick = (candidate: Candidate, e: React.MouseEvent) => {
    // Prevent opening modal if clicking on a button, link, or checkbox
    if ((e.target as HTMLElement).closest('button, a, input, [role="checkbox"]')) return;
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
    setIsDetailModalOpen(true);
  };


  if (isLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-card shadow">
        <Users className="w-16 h-16 text-muted-foreground animate-pulse mb-4" />
        <h3 className="text-xl font-semibold text-foreground">Loading Candidates...</h3>
        <p className="text-muted-foreground">Please wait while we fetch the data.</p>
        <p className="text-sm text-muted-foreground mt-2">
          If this takes too long, the server may be starting up. Please wait a moment and refresh.
        </p>
      </div>
    );
  }


  if (!Array.isArray(candidates) || candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-card shadow">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No Candidates Found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or add new candidates.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow key="header-row">
              <TableHead key="select-all" className="w-12"><Checkbox
                checked={isAllCandidatesSelected}
                onCheckedChange={onToggleSelectAllCandidates}
                aria-label="Select all candidates"
              /></TableHead>
              {/* Removed Pipeline column header */}
              <TableHead key="candidate" className="w-[250px]">Candidate</TableHead>
              <TableHead key="applied-job">Applied Job</TableHead>
              <TableHead key="recruiter">Recruiter</TableHead>
              <TableHead key="fit-score" className="w-[100px] hidden sm:table-cell">Fit Score</TableHead>
              <TableHead key="status">Status</TableHead>
              <TableHead key="last-update" className="hidden md:table-cell">Last Update</TableHead>
              <TableHead key="actions" className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.filter(candidate => candidate && candidate.id && candidate.name).map((candidate) => {
              // Debug logging for fit score and application date
              console.log(`Candidate ${candidate.name}: fitScore=${candidate.fitScore}, applicationDate=${candidate.applicationDate}`);
              console.log(`Candidate ${candidate.name}: fitScore type=${typeof candidate.fitScore}, value=${candidate.fitScore}`);
              
              const dateValue = candidate.updatedAt || candidate.createdAt;
              let displayDate = 'N/A';
              if (dateValue && typeof dateValue === 'string') {
                try {
                  displayDate = format(parseISO(dateValue), "MMM d, yyyy");
                } catch (e) {
                  console.error("Failed to parse date for candidate " + candidate.id + ": " + dateValue, e);
                  displayDate = 'Invalid Date';
                }
              } else if (dateValue) {
                try {
                  displayDate = format(new Date(dateValue as any), "MMM d, yyyy");
                } catch (e) {
                   console.error("Failed to format non-string date for candidate " + candidate.id + ": " + dateValue, e);
                   displayDate = 'Invalid Date';
                }
              }

              // Find the index of the candidate's current stage
              const currentStageIndex = availableStages.findIndex(s => s.name === candidate.status);

              return (
                <TableRow key={candidate.id} onClick={(e) => handleRowClick(candidate, e)} className="cursor-pointer hover:bg-muted/40" data-state={selectedCandidateIds.has(candidate.id) ? 'selected' : ''}>
                  <TableCell key={`${candidate.id}-select`}><Checkbox
                      checked={selectedCandidateIds.has(candidate.id)}
                      onCheckedChange={() => onToggleSelectCandidate(candidate.id)}
                      aria-label={`Select candidate ${candidate.name}`}
                    /></TableCell>
                  {/* Removed Pipeline cell */}
                  <TableCell key={`${candidate.id}-candidate-info`}>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const nameInfo = formatCandidateNameWithLang(candidate);
                        return (
                          <>
                            <Avatar size="lg" className="border-2 border-border">
                              <AvatarImage
                                src={candidate.avatarUrl ? candidate.avatarUrl : `https://placehold.co/48x48.png?text=${nameInfo.name?.charAt(0) || 'C'}`}
                                alt={nameInfo.name}
                                data-ai-hint="person avatar"
                                onError={(e) => { e.currentTarget.src = `https://placehold.co/48x48.png?text=${nameInfo.name?.charAt(0) || 'C'}`; }}
                              />
                              <AvatarFallback className="text-sm font-medium">{nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <Link href={`/candidates/${candidate.id}`} passHref>
                                <span 
                                  className={`font-medium text-foreground hover:underline cursor-pointer ${nameInfo.fontClass}`}
                                  lang={nameInfo.lang}
                                >
                                  {nameInfo.name}
                                </span>
                              </Link>
                              <div className="text-xs text-muted-foreground">{candidate.email}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell key={`${candidate.id}-position`}>
                    {candidate.position?.title ? (
                      <div className="space-y-1">
                        <span
                          className="font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => handleEditPositionClick(candidate.positionId)}
                          title={`Edit ${candidate.position.title}`}
                        >
                          {candidate.position.title}
                        </span>
                        {candidate.applicationDate && (
                          <div className="text-xs text-muted-foreground">
                            Applied: {new Date(candidate.applicationDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell key={`${candidate.id}-recruiter`}>
                    <Select value={candidate.recruiter?.id || ''} onValueChange={value => onAssignRecruiter(candidate.id, value === '___UNASSIGN___' ? null : value)}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Unassigned">
                          {candidate.recruiter?.name || 'Unassigned'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="___UNASSIGN___">Unassigned</SelectItem>
                        {availableRecruiters.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell key={`${candidate.id}-fit-score`} className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      {/* Fit Score as Badge */}
                      {(() => {
                        // Extract fit score from job_applied if available, otherwise use candidate.fitScore
                        const jobApplied = (candidate?.parsedData && 'job_applied' in candidate.parsedData)
                          ? (candidate.parsedData as any).job_applied
                          : undefined;
                        const displayFitScore = jobApplied?.fitScore ?? candidate.fitScore;
                        
                        return (
                          <Badge
                            variant={getScoreColor(displayFitScore) === 'text-green-600' ? 'success' : getScoreColor(displayFitScore) === 'text-yellow-600' ? 'secondary' : getScoreColor(displayFitScore) === 'text-red-600' ? 'destructive' : 'outline'}
                            className="min-w-[48px] justify-center"
                          >
                            {formatScoreWithGrade(displayFitScore)}
                          </Badge>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell key={`${candidate.id}-status`}>
                    {(() => {
                      const stage = availableStages.find(s => s.name === candidate.status);
                      const badgeColor = stage?.color_badge;
                      return (
                        <Badge
                          variant={getStatusBadgeVariant(candidate.status)}
                          className="capitalize"
                          style={badgeColor ? { backgroundColor: badgeColor, color: '#fff', borderColor: badgeColor } : undefined}
                        >
                          {candidate.status}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell key={`${candidate.id}-last-update`} className="text-sm text-muted-foreground hidden md:table-cell">
                    {displayDate}
                  </TableCell>
                  <TableCell key={`${candidate.id}-actions`} className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem key="view-details" asChild>
                          <Link href={`/candidates/${candidate.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem key="manage-transitions" onSelect={() => handleManageTransitionsClick(candidate)}>
                          <FileEdit className="mr-2 h-4 w-4" /> Manage Transitions
                        </DropdownMenuItem>
                         <DropdownMenuItem key="upload-resume" onSelect={() => onOpenUploadModal(candidate)}>
                          <UploadCloud className="mr-2 h-4 w-4" /> Upload Resume
                        </DropdownMenuItem>
                        {candidate.positionId && (
                          <DropdownMenuItem key="edit-position" onSelect={() => handleEditPositionClick(candidate.positionId)}>
                            <Briefcase className="mr-2 h-4 w-4" /> Edit Applied Job
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator key="separator" />
                        <DropdownMenuItem key="delete" onSelect={() => confirmDelete(candidate)} className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:!text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {/* Remove CandidateDetailModal from the list page */}
      {/*
      <CandidateDetailModal
        candidateId={selectedCandidateSummary.id}
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
      */}
      <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => { if(!open) setCandidateToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the candidate <strong>{candidateToDelete?.name}</strong> and all associated records (resume history, transition history).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCandidateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Delete Candidate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ManageTransitionsModal
        candidate={selectedCandidateForModal}
        isOpen={isManageTransitionsModalOpen}
        onOpenChange={setIsManageTransitionsModalOpen}
        onUpdateCandidate={onUpdateCandidate}
        onRefreshCandidateData={onRefreshCandidateData}
        availableStages={availableStages}
        comments={modalComments}
        onCommentsChange={() => {
          // Refresh comments when needed
          if (selectedCandidateForModal) {
            fetch(`/api/candidates/${selectedCandidateForModal.id}/comments`)
              .then(res => res.json())
              .then(data => setModalComments(Array.isArray(data) ? data : (data.data || [])));
          }
        }}
      />
    </>
  );
}

