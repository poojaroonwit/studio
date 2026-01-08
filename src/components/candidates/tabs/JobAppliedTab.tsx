import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Copy, Check, Info, User, Users, Building2, Edit2 } from 'lucide-react';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import type { Candidate, Position } from '@/lib/types';
import { CustomFieldDisplay } from '../CustomFieldDisplay';
import { CustomFieldEdit } from '../CustomFieldEdit';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';

interface JobAppliedTabProps {
  candidate: Candidate;
  allDbPositions: Position[];
  isEditing: boolean;
  onCopyJobApplied: () => void;
  copiedJobApplied: boolean;
  appliedJobId: string | null;
  appliedFitScore: number | null;
  appliedJustification: string[];
  appliedJobBadge: React.ReactNode;
  onOpenPositionDrawer: (positionId: string) => void;
  onCustomFieldChange?: (fieldCode: string, value: any) => void;
  availableStages?: any[];
  availableRecruiters?: Array<{ id: string; name: string }>;
  availableSources?: Array<{ id: string; name: string }>;
  onRefresh?: () => void;
  hideCandidateDetails?: boolean;
}

export const JobAppliedTab: React.FC<JobAppliedTabProps> = ({
  candidate,
  allDbPositions,
  isEditing,
  onCopyJobApplied,
  copiedJobApplied,
  appliedJobId,
  appliedFitScore,
  appliedJustification,
  appliedJobBadge,
  onOpenPositionDrawer,
  onCustomFieldChange,
  availableStages = [],
  availableRecruiters = [],
  availableSources = [],
  onRefresh,
  hideCandidateDetails = false
}) => {
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditRecruiterOpen, setIsEditRecruiterOpen] = useState(false);
  const [isEditSourceOpen, setIsEditSourceOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(candidate.statusId || '');
  const [selectedRecruiterId, setSelectedRecruiterId] = useState(candidate.recruiterId || '');
  const [selectedSourceId, setSelectedSourceId] = useState(candidate.sourceId || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ statusId: selectedStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Status updated successfully');
      setIsEditStatusOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRecruiter = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/assign-recruiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recruiterId: selectedRecruiterId || null }),
      });
      if (!res.ok) throw new Error('Failed to update recruiter');
      toast.success('Recruiter updated successfully');
      setIsEditRecruiterOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update recruiter');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSource = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sourceId: selectedSourceId || null }),
      });
      if (!res.ok) throw new Error('Failed to update source');
      toast.success('Source updated successfully');
      setIsEditSourceOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update source');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStage = availableStages.find(s => s.id === candidate.statusId);
  const currentRecruiter = availableRecruiters.find(r => r.id === candidate.recruiterId);
  const currentSource = availableSources.find(s => s.id === candidate.sourceId);

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Job Applied
            </CardTitle>
            {appliedJobId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopyJobApplied}
                className="h-8 w-8 p-0"
                title="Copy job applied information"
              >
                {copiedJobApplied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {appliedJobId ? (
            <div
              className="relative rounded-lg cursor-pointer hover:shadow-xl transition-all duration-200 text-foreground"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                padding: '2px',
                boxShadow: '0 4px 12px -2px hsla(var(--primary), 0.4), 0 2px 4px -1px hsla(var(--primary), 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenPositionDrawer(appliedJobId);
              }}
            >
              <div className="mb-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground text-lg">
                    {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId)?.title || 'Unknown Position' : 'Unknown Position'}
                  </h4>
                  {appliedFitScore !== null && appliedFitScore !== undefined && (
                    <ScoreBadge score={appliedFitScore} className="text-sm">
                      {formatScoreWithGrade(appliedFitScore)}
                    </ScoreBadge>
                  )}
                </div>
              </div>
              {(() => {
                const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId) : null;
                return position?.positionLevel ? (
                  <div className="text-sm text-muted-foreground mb-2">
                    {position.positionLevel}
                  </div>
                ) : null;
              })()}
              {appliedJobBadge && (
                <div className="mb-2">
                  {appliedJobBadge}
                </div>
              )}
              {appliedJustification.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Justification:
                  </h5>
                  <div className="space-y-2">
                    {appliedJustification.map((sentence: string, index: number) => {
                      const trimmedSentence = sentence.trim();
                      if (!trimmedSentence) return null;
                      return (
                        <div
                          key={index}
                          className="text-sm text-foreground px-3 py-2 rounded shadow-sm bg-muted"
                        >
                          {trimmedSentence}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No position applied for.</p>
              <p className="text-sm">Click "Edit" to select the position this candidate applied for.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Details Card */}
      {!hideCandidateDetails && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Candidate Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="flex items-center gap-2">
                {currentStage ? (
                  <Badge variant="secondary" className="text-xs">
                    {currentStage.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStatus(candidate.statusId || '');
                    setIsEditStatusOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Source */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Source</span>
              </div>
              <div className="flex items-center gap-2">
                {currentSource ? (
                  <Badge variant="outline" className="text-xs">
                    {currentSource.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSourceId(candidate.sourceId || '');
                    setIsEditSourceOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Recruiter */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recruiter</span>
              </div>
              <div className="flex items-center gap-2">
                {currentRecruiter ? (
                  <Badge variant="outline" className="text-xs">
                    {currentRecruiter.name}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Not assigned</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRecruiterId(candidate.recruiterId || '');
                    setIsEditRecruiterOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Fields for Jobs Section */}
      {isEditing ? (
        <CustomFieldEdit
          modelName="Candidate"
          section="jobs"
          entityId={candidate.id}
          customFields={candidate.customFields || {}}
          onFieldChange={onCustomFieldChange || (() => { })}
          title="Additional Job Information"
        />
      ) : (
        <CustomFieldDisplay
          modelName="Candidate"
          section="jobs"
          entityId={candidate.id}
          customFields={candidate.customFields || {}}
          title="Additional Job Information"
        />
      )}

      {/* Edit Status Dialog */}
      <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStatusOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating || !selectedStatus}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Source Dialog */}
      <Dialog open={isEditSourceOpen} onOpenChange={setIsEditSourceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSourceOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSource} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Recruiter Dialog */}
      <Dialog open={isEditRecruiterOpen} onOpenChange={setIsEditRecruiterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Recruiter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recruiter">Recruiter</Label>
              <Select value={selectedRecruiterId} onValueChange={setSelectedRecruiterId}>
                <SelectTrigger id="recruiter">
                  <SelectValue placeholder="Select recruiter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableRecruiters.map((recruiter) => (
                    <SelectItem key={recruiter.id} value={recruiter.id}>
                      {recruiter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRecruiterOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRecruiter} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
