// src/components/tasks/MyTasksPageClient.tsx
"use client";

import useSWR from 'swr';
import { useState } from 'react';
import { CandidateKanbanView } from '@/components/candidates/CandidateKanbanView';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { CandidateTable } from '@/components/candidates/CandidateTable';
import { LayoutGrid, List } from 'lucide-react';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null } | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const limit = 100; // Show more for Kanban
  const recruiterId = userSession?.role === 'Admin' ? undefined : userSession?.id;
  const query = new URLSearchParams({
    ...(recruiterId ? { assignedRecruiterId: recruiterId } : {}),
    ...(filter ? { name: filter } : {}),
    page: String(page),
    limit: String(limit),
  }).toString();
  const { data: candidateData, error: candidateError, isLoading: candidateLoading, mutate } = useSWR(`/api/candidates?${query}`, fetcher);
  const { data: stagesData, error: stagesError, isLoading: stagesLoading } = useSWR('/api/settings/recruitment-stages', fetcher);
  const { data: positionsData } = useSWR('/api/positions', fetcher);
  const { data: recruitersData } = useSWR('/api/users?role=Recruiter', fetcher);

  // Move candidate to new status (stage)
  const handleMoveCandidate = async (candidate: any, newStatus: string) => {
    await fetch(`/api/candidates/${candidate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    mutate(); // Refresh candidates
  };

  // Open modal with candidate details
  const handleCardClick = (candidate: any) => {
    setSelectedCandidate(candidate);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)]">
      {/* Sidebar for filters */}
      <aside className="w-full md:w-64 bg-white border-r p-4 flex-shrink-0">
        <h2 className="font-bold text-lg mb-4">Filters</h2>
        <input
          className="border rounded px-2 py-1 w-full mb-2"
          placeholder="Search candidates by name..."
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1); }}
        />
        {/* Add more filters here if needed */}
      </aside>
      {/* Main Content */}
      <main className="flex-1 overflow-x-auto p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Tasks Board</h1>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded border flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-primary text-white' : 'bg-white'}`}
              onClick={() => setViewMode('kanban')}
              aria-label="Kanban View"
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </button>
            <button
              className={`px-3 py-1 rounded border flex items-center gap-1 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white'}`}
              onClick={() => setViewMode('list')}
              aria-label="List View"
            >
              <List className="h-4 w-4" /> List
            </button>
          </div>
        </div>
        {(candidateLoading || stagesLoading) && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        )}
        {(candidateError || stagesError) && (
          <div className="text-red-600">Failed to load data.</div>
        )}
        {viewMode === 'kanban' && candidateData && stagesData && Array.isArray(stagesData) && stagesData.length > 0 && (
          <CandidateKanbanView
            candidates={candidateData.data || []}
            statuses={stagesData.map((s: any) => s.name)}
            onMoveCandidate={handleMoveCandidate}
            onCardClick={handleCardClick}
          />
        )}
        {viewMode === 'list' && candidateData && stagesData && positionsData && recruitersData && (
          <CandidateTable
            candidates={candidateData.data || []}
            availablePositions={positionsData.data || []}
            availableStages={stagesData || []}
            availableRecruiters={recruitersData.map((r: any) => ({ id: r.id, name: r.name }))}
            onAssignRecruiter={() => {}}
            onUpdateCandidate={async () => {}}
            onDeleteCandidate={async () => {}}
            onOpenUploadModal={() => {}}
            onEditPosition={() => {}}
            isLoading={candidateLoading}
            onRefreshCandidateData={async () => {}}
            selectedCandidateIds={new Set()}
            onToggleSelectCandidate={() => {}}
            onToggleSelectAllCandidates={() => {}}
            isAllCandidatesSelected={false}
          />
        )}
        {candidateData && stagesData && Array.isArray(candidateData.data) && candidateData.data.length === 0 && (
          <div className="text-gray-500">No candidates found.</div>
        )}
        <CandidateDetailModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          candidateSummary={selectedCandidate || { id: '', name: '' }}
        />
      </main>
    </div>
  );
}
