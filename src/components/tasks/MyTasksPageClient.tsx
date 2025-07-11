// src/components/tasks/MyTasksPageClient.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { CandidateRowKanbanView, MultiRecruiterKanbanView } from '@/components/candidates/CandidateKanbanView';
import { FullCandidateDetailModal } from '@/components/candidates/FullCandidateDetailModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MyTasksFilterModal } from './MyTasksFilterModal';
import { CustomizeBoardModal } from './CustomizeBoardModal';
import { Filter, Settings, Grid3X3, List, Kanban, Users, Calendar, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex flex-col h-full bg-gray-50">
      {/* YouTrack-style Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">My Tasks</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {displayedCandidates.length} candidates assigned to you
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-6">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Target className="w-3 h-3 mr-1" />
                  Active
                </Badge>
                <Badge variant="outline" className="text-gray-600">
                  {stages.length} stages
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={boardPrefs.viewType === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBoardPrefs(prev => ({ ...prev, viewType: 'kanban' }))}
                  className="h-8 px-3"
                >
                  <Kanban className="w-4 h-4 mr-1" />
                  Kanban
                </Button>
                <Button
                  variant={boardPrefs.viewType === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBoardPrefs(prev => ({ ...prev, viewType: 'list' }))}
                  className="h-8 px-3"
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </Button>
                <Button
                  variant={boardPrefs.viewType === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setBoardPrefs(prev => ({ ...prev, viewType: 'grid' }))}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Grid
                </Button>
              </div>

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterModalOpen(true)}
                className="h-9 px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomizeModalOpen(true)}
                className="h-9 px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Customize
              </Button>
              {userSession?.role === 'Admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'kanban' ? 'multi-recruiter' : 'kanban')}
                  className="h-9 px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {viewMode === 'kanban' ? 'Multi-Recruiter' : 'Kanban'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 text-sm">Loading your tasks...</p>
            </div>
          </div>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {boardPrefs.visibleFields.map(field => (
                      <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedCandidates.map(candidate => (
                    <tr 
                      key={candidate.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      {boardPrefs.visibleFields.map(field => {
                        if (field === 'name') return (
                          <td key={field} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={candidate.avatarUrl || `https://placehold.co/40x40.png?text=${candidate.name?.charAt(0) || 'C'}`}
                                  alt=""
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                <div className="text-sm text-gray-500">{candidate.email}</div>
                              </div>
                            </div>
                          </td>
                        );
                        if (field === 'email') return <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.email}</td>;
                        if (field === 'phone') return <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.phone}</td>;
                        if (field === 'status') return (
                          <td key={field} className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getStatusColor(candidate.status)} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                              {candidate.status}
                            </Badge>
                          </td>
                        );
                        if (field === 'positionId') return <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.position?.title || candidate.positionId}</td>;
                        if (field === 'fitScore') return (
                          <td key={field} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">{candidate.fitScore}</div>
                              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${candidate.fitScore}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        );
                        if (field === 'recruiterId') return <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.recruiter?.name || candidate.recruiterId}</td>;
                        if (field === 'applicationDate') return <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.applicationDate}</td>;
                        return <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" />;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedCandidates.map(candidate => (
              <div
                key={candidate.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden"
                onClick={() => setSelectedCandidate(candidate)}
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-shrink-0">
                      <img
                        className="h-12 w-12 rounded-full"
                        src={candidate.avatarUrl || `https://placehold.co/48x48.png?text=${candidate.name?.charAt(0) || 'C'}`}
                        alt=""
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
                      <p className="text-sm text-gray-500 truncate">{candidate.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {boardPrefs.visibleFields.map(field => {
                      if (field === 'name' || field === 'email') return null;
                      if (field === 'phone') return (
                        <div key={field} className="flex items-center text-sm">
                          <span className="text-gray-500 w-16">Phone:</span>
                          <span className="text-gray-900">{candidate.phone}</span>
                        </div>
                      );
                      if (field === 'status') return (
                        <div key={field} className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Status:</span>
                          <Badge className={`${getStatusColor(candidate.status)} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                            {candidate.status}
                          </Badge>
                        </div>
                      );
                      if (field === 'positionId') return (
                        <div key={field} className="flex items-center text-sm">
                          <span className="text-gray-500 w-16">Position:</span>
                          <span className="text-gray-900 truncate">{candidate.position?.title || candidate.positionId}</span>
                        </div>
                      );
                      if (field === 'fitScore') return (
                        <div key={field} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Fit Score:</span>
                            <span className="font-medium text-gray-900">{candidate.fitScore}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${candidate.fitScore}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                      if (field === 'recruiterId') return (
                        <div key={field} className="flex items-center text-sm">
                          <span className="text-gray-500 w-16">Recruiter:</span>
                          <span className="text-gray-900">{candidate.recruiter?.name || candidate.recruiterId}</span>
                        </div>
                      );
                      if (field === 'applicationDate') return (
                        <div key={field} className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-gray-900">{candidate.applicationDate}</span>
                        </div>
                      );
                      return null;
                    })}
                  </div>
                </div>
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

      {/* Full Candidate Detail Modal */}
      {selectedCandidate && (
        <FullCandidateDetailModal
          isOpen={!!selectedCandidate}
          onOpenChange={(open) => !open && setSelectedCandidate(null)}
          candidateId={selectedCandidate.id}
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
