// src/components/tasks/MyTasksPageClient.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { CandidateRowKanbanView, MultiRecruiterKanbanView } from '@/components/candidates/CandidateKanbanView';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MyTasksFilterModal } from './MyTasksFilterModal';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null } | null;
}

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'multi-recruiter'>('kanban');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch stages, recruiters, positions on mount
  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      try {
        const [stagesRes, recruitersRes, positionsRes] = await Promise.all([
          fetch('/api/settings/recruitment-stages'),
          fetch('/api/users?role=Recruiter'),
          fetch('/api/positions'),
        ]);
        const stagesData = await stagesRes.json();
        setStages(Array.isArray(stagesData) ? stagesData.map((s: any) => s.name) : []);
        const recruitersData = await recruitersRes.json();
        setRecruiters(Array.isArray(recruitersData) ? recruitersData : []);
        const positionsData = await positionsRes.json();
        setPositions(Array.isArray(positionsData.data) ? positionsData.data : []);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, []);

  // Fetch candidates when filters change
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.name) params.append('name', filters.name);
        if (filters.positionId) params.append('positionId', filters.positionId);
        if (filters.stage) params.append('status', filters.stage);
        if (filters.recruiterId) params.append('recruiterId', filters.recruiterId);
        // Optionally add fitScore filters if supported by API
        // if (filters.minFitScore) params.append('minFitScore', filters.minFitScore);
        // if (filters.maxFitScore) params.append('maxFitScore', filters.maxFitScore);
        const res = await fetch(`/api/candidates?${params.toString()}`);
        const data = await res.json();
        setCandidates(Array.isArray(data) ? data : (data.data || []));
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [filters]);

  // Filtering logic (for fitScore, if not supported by API)
  const displayedCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (filters.minFitScore !== undefined && c.fitScore < filters.minFitScore) return false;
      if (filters.maxFitScore !== undefined && c.fitScore > filters.maxFitScore) return false;
      return true;
    });
  }, [candidates, filters]);

  // Handle drag-and-drop move (for both kanban and multi-recruiter)
  const handleMoveCandidate = (candidate: any, newStage: string, newRecruiterId?: string) => {
    // Optimistically update UI
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidate.id
          ? { ...c, status: newStage, recruiterId: newRecruiterId ?? c.recruiterId }
          : c
      )
    );
    // Send update to API (optional, implement as needed)
    fetch(`/api/candidates/${candidate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStage, recruiterId: newRecruiterId ?? candidate.recruiterId }),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => setIsFilterModalOpen(true)}>Filter</Button>
          {userSession?.role === 'Admin' && (
            <Button variant="outline" onClick={() => setViewMode(viewMode === 'kanban' ? 'multi-recruiter' : 'kanban')}>
              {viewMode === 'kanban' ? 'Multi-Recruiter View' : 'Kanban View'}
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
        ) : viewMode === 'kanban' ? (
          <CandidateRowKanbanView
            candidates={displayedCandidates}
            statuses={stages}
            onMoveCandidate={handleMoveCandidate}
            onCardClick={setSelectedCandidate}
          />
        ) : (
          <MultiRecruiterKanbanView
            candidates={displayedCandidates}
            stages={stages}
            recruiters={recruiters}
            onMoveCandidate={handleMoveCandidate}
            onCardClick={setSelectedCandidate}
          />
        )}
      </div>
      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent>
          <MyTasksFilterModal
            filters={filters}
            availablePositions={positions}
            availableStages={stages}
            availableRecruiters={recruiters}
            onApply={setFilters}
            onClose={() => setIsFilterModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateDetailModal
          isOpen={!!selectedCandidate}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
          candidateSummary={selectedCandidate}
        />
      )}
    </div>
  );
}
