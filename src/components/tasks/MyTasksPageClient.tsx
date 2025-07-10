// src/components/tasks/MyTasksPageClient.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { CandidateRowKanbanView, MultiRecruiterKanbanView } from '@/components/candidates/CandidateKanbanView';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MyTasksFilterModal } from './MyTasksFilterModal';
import { CustomizeBoardModal } from './CustomizeBoardModal';

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
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [boardPrefs, setBoardPrefs] = useState({
    rowField: 'status',
    columnField: 'recruiterId',
    visibleFields: ['name', 'email', 'status', 'fitScore'],
    viewType: 'kanban',
  });

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

  // Load board preferences on mount and when customize modal closes
  useEffect(() => {
    fetch('/api/settings/user-preferences')
      .then(res => res.json())
      .then(prefs => {
        const rowPref = prefs.find((p: any) => p.attributeKey === 'mytasks_rowField');
        const colPref = prefs.find((p: any) => p.attributeKey === 'mytasks_columnField');
        const fieldsPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleFields');
        const viewPref = prefs.find((p: any) => p.attributeKey === 'mytasks_viewType');
        setBoardPrefs({
          rowField: rowPref?.customNote || 'status',
          columnField: colPref?.customNote || 'recruiterId',
          visibleFields: fieldsPref ? JSON.parse(fieldsPref.customNote) : ['name', 'email', 'status', 'fitScore'],
          viewType: viewPref?.customNote || 'kanban',
        });
      })
      .catch(() => {});
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
          <Button variant="outline" onClick={() => setIsCustomizeModalOpen(true)}>Customize Board</Button>
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
        ) : boardPrefs.viewType === 'kanban' ? (
          <CandidateRowKanbanView
            candidates={displayedCandidates}
            statuses={stages}
            onMoveCandidate={handleMoveCandidate}
            onCardClick={setSelectedCandidate}
            rowField={boardPrefs.rowField}
            columnField={boardPrefs.columnField}
            visibleFields={boardPrefs.visibleFields}
          />
        ) : boardPrefs.viewType === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  {boardPrefs.visibleFields.map(field => (
                    <th key={field} className="px-3 py-2 border-b bg-muted text-left font-semibold">{field.charAt(0).toUpperCase() + field.slice(1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedCandidates.map(candidate => (
                  <tr key={candidate.id} className="hover:bg-accent cursor-pointer" onClick={() => setSelectedCandidate(candidate)}>
                    {boardPrefs.visibleFields.map(field => {
                      if (field === 'name') return <td key={field} className="px-3 py-2 border-b">{candidate.name}</td>;
                      if (field === 'email') return <td key={field} className="px-3 py-2 border-b">{candidate.email}</td>;
                      if (field === 'phone') return <td key={field} className="px-3 py-2 border-b">{candidate.phone}</td>;
                      if (field === 'status') return <td key={field} className="px-3 py-2 border-b">{candidate.status}</td>;
                      if (field === 'positionId') return <td key={field} className="px-3 py-2 border-b">{candidate.position?.title || candidate.positionId}</td>;
                      if (field === 'fitScore') return <td key={field} className="px-3 py-2 border-b">{candidate.fitScore}</td>;
                      if (field === 'recruiterId') return <td key={field} className="px-3 py-2 border-b">{candidate.recruiter?.name || candidate.recruiterId}</td>;
                      if (field === 'applicationDate') return <td key={field} className="px-3 py-2 border-b">{candidate.applicationDate}</td>;
                      return <td key={field} className="px-3 py-2 border-b" />;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedCandidates.map(candidate => (
              <div
                key={candidate.id}
                className="bg-card border rounded-lg shadow hover:shadow-lg cursor-pointer p-4 flex flex-col gap-2 items-center"
                onClick={() => setSelectedCandidate(candidate)}
              >
                <div className="w-16 h-16 mb-2">
                  <img
                    src={candidate.avatarUrl || `https://placehold.co/64x64.png?text=${candidate.name?.charAt(0) || 'C'}`}
                    alt={candidate.name}
                    className="rounded-full w-full h-full object-cover"
                  />
                </div>
                <div className="font-semibold text-base text-center truncate w-full">{candidate.name}</div>
                {boardPrefs.visibleFields.map(field => {
                  if (field === 'name') return null;
                  if (field === 'email') return <div key={field} className="text-xs text-muted-foreground truncate w-full text-center">{candidate.email}</div>;
                  if (field === 'phone') return <div key={field} className="text-xs text-muted-foreground truncate w-full text-center">{candidate.phone}</div>;
                  if (field === 'status') return <div key={field} className="text-xs text-muted-foreground w-full text-center">Status: {candidate.status}</div>;
                  if (field === 'positionId') return <div key={field} className="text-xs text-muted-foreground w-full text-center">Position: {candidate.position?.title || candidate.positionId}</div>;
                  if (field === 'fitScore') return <div key={field} className="text-xs text-muted-foreground w-full text-center">Fit Score: {candidate.fitScore}</div>;
                  if (field === 'recruiterId') return <div key={field} className="text-xs text-muted-foreground w-full text-center">Recruiter: {candidate.recruiter?.name || candidate.recruiterId}</div>;
                  if (field === 'applicationDate') return <div key={field} className="text-xs text-muted-foreground w-full text-center">Applied: {candidate.applicationDate}</div>;
                  return null;
                })}
              </div>
            ))}
          </div>
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
      {/* Customize Board Modal */}
      <CustomizeBoardModal
        open={isCustomizeModalOpen}
        onOpenChange={open => {
          setIsCustomizeModalOpen(open);
          if (!open) {
            // Reload preferences after closing modal
            fetch('/api/settings/user-preferences')
              .then(res => res.json())
              .then(prefs => {
                const rowPref = prefs.find((p: any) => p.attributeKey === 'mytasks_rowField');
                const colPref = prefs.find((p: any) => p.attributeKey === 'mytasks_columnField');
                const fieldsPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleFields');
                const viewPref = prefs.find((p: any) => p.attributeKey === 'mytasks_viewType');
                setBoardPrefs({
                  rowField: rowPref?.customNote || 'status',
                  columnField: colPref?.customNote || 'recruiterId',
                  visibleFields: fieldsPref ? JSON.parse(fieldsPref.customNote) : ['name', 'email', 'status', 'fitScore'],
                  viewType: viewPref?.customNote || 'kanban',
                });
              })
              .catch(() => {});
          }
        }}
      />
    </div>
  );
}
