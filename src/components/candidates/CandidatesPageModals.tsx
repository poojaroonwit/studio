"use client";

import React from 'react';
import { AddCandidateModal } from './AddCandidateModal';
import BulkUploadCVsModal from '@/components/BulkUploadCVsModal';
import CandidateImportModal from './CandidateImportModal';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { CandidateSettingsDrawer } from './CandidateSettingsDrawer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Position, RecruitmentStage } from '@/lib/types';
import type { CandidateSettings } from './CandidateSettingsDrawer';

interface CandidatesPageModalsProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  availableStages: RecruitmentStage[];
  onAddCandidateSuccess: () => Promise<void>;
  
  isBulkUploadModalOpen: boolean;
  setIsBulkUploadModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onBulkUploadSuccess: () => Promise<void>;
  
  isImportModalOpen: boolean;
  setIsImportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onImportSuccess: () => Promise<void>;
  
  isPositionDrawerOpen: boolean;
  setIsPositionDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPositionForEdit: Position | null;
  
  isSettingsDrawerOpen: boolean;
  setIsSettingsDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  candidateSettings: CandidateSettings | null;
  onSettingsChange: (settings: CandidateSettings) => Promise<void>;
  settingsLoading: boolean;
  settingsError: string | null;
  clearSettingsError: () => void;
  
  isBulkStatusModalOpen: boolean;
  setIsBulkStatusModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bulkNewStatus: string;
  setBulkNewStatus: React.Dispatch<React.SetStateAction<string>>;
  bulkTransitionNotes: string;
  setBulkTransitionNotes: React.Dispatch<React.SetStateAction<string>>;
  selectedCandidateIds: Set<string>;
  handleBulkChangeStatus: (candidateIds: string[], newStatus: string, notes?: string) => Promise<void>;
  availableStagesForBulk: RecruitmentStage[];
  
  isBulkRecruiterModalOpen: boolean;
  setIsBulkRecruiterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  bulkNewRecruiterId: string | null;
  setBulkNewRecruiterId: React.Dispatch<React.SetStateAction<string | null>>;
  handleBulkAssignRecruiter: (candidateIds: string[], recruiterId: string | null) => Promise<void>;
  availableRecruiter: Array<{ id: string; name: string }>;
}

export function CandidatesPageModals({
  isAddModalOpen,
  setIsAddModalOpen,
  availableStages,
  onAddCandidateSuccess,
  isBulkUploadModalOpen,
  setIsBulkUploadModalOpen,
  onBulkUploadSuccess,
  isImportModalOpen,
  setIsImportModalOpen,
  onImportSuccess,
  isPositionDrawerOpen,
  setIsPositionDrawerOpen,
  selectedPositionForEdit,
  isSettingsDrawerOpen,
  setIsSettingsDrawerOpen,
  candidateSettings,
  onSettingsChange,
  settingsLoading,
  settingsError,
  clearSettingsError,
  isBulkStatusModalOpen,
  setIsBulkStatusModalOpen,
  bulkNewStatus,
  setBulkNewStatus,
  bulkTransitionNotes,
  setBulkTransitionNotes,
  selectedCandidateIds,
  handleBulkChangeStatus,
  availableStagesForBulk,
  isBulkRecruiterModalOpen,
  setIsBulkRecruiterModalOpen,
  bulkNewRecruiterId,
  setBulkNewRecruiterId,
  handleBulkAssignRecruiter,
  availableRecruiter,
}: CandidatesPageModalsProps) {
  return (
    <>
      <AddCandidateModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        availableStages={availableStages}
        onAddCandidate={onAddCandidateSuccess}
      />

      <BulkUploadCVsModal
        isOpen={isBulkUploadModalOpen}
        onOpenChange={setIsBulkUploadModalOpen}
        onUploadSuccess={onBulkUploadSuccess}
      />

      <CandidateImportModal
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportSuccess={onImportSuccess}
      />

      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={setIsPositionDrawerOpen}
        positionId={selectedPositionForEdit?.id || null}
      />

      <CandidateSettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onOpenChange={setIsSettingsDrawerOpen}
        currentSettings={candidateSettings}
        onSettingsChange={onSettingsChange}
        isLoading={settingsLoading}
        error={settingsError}
        onClearError={clearSettingsError}
      />

      {/* Bulk Status Change Modal */}
      <AlertDialog open={isBulkStatusModalOpen} onOpenChange={setIsBulkStatusModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status for Selected Candidates</AlertDialogTitle>
            <AlertDialogDescription>
              Change the status for {selectedCandidateIds.size} selected candidate{selectedCandidateIds.size !== 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-status">New Status</Label>
              <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(availableStagesForBulk) ? availableStagesForBulk.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
              
              <Label htmlFor="bulk-notes">Transition Notes (Optional)</Label>
              <Textarea
                id="bulk-notes"
                placeholder="Add notes about this status change..."
                value={bulkTransitionNotes}
                onChange={(e) => setBulkTransitionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsBulkStatusModalOpen(false);
              setBulkNewStatus('');
              setBulkTransitionNotes('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (bulkNewStatus) {
                  handleBulkChangeStatus(Array.from(selectedCandidateIds), bulkNewStatus, bulkTransitionNotes);
                  setIsBulkStatusModalOpen(false);
                  setBulkNewStatus('');
                  setBulkTransitionNotes('');
                }
              }}
              disabled={!bulkNewStatus}
            >
              Change Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Recruiter Assignment Modal */}
      <AlertDialog open={isBulkRecruiterModalOpen} onOpenChange={setIsBulkRecruiterModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Recruiter to Selected Candidates</AlertDialogTitle>
            <AlertDialogDescription>
              Assign a recruiter to {selectedCandidateIds.size} selected candidate{selectedCandidateIds.size !== 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-recruiter">Recruiter</Label>
              <Select value={bulkNewRecruiterId || 'none'} onValueChange={(value) => setBulkNewRecruiterId(value === 'none' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recruiter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Recruiter</SelectItem>
                  {Array.isArray(availableRecruiter) ? availableRecruiter.map((recruiter) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsBulkRecruiterModalOpen(false);
              setBulkNewRecruiterId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                handleBulkAssignRecruiter(Array.from(selectedCandidateIds), bulkNewRecruiterId);
                setIsBulkRecruiterModalOpen(false);
                setBulkNewRecruiterId(null);
              }}
            >
              Assign Recruiter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

