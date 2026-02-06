import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BriefcaseIcon as Briefcase, DocumentDuplicateIcon as Copy, CheckIcon as Check, InformationCircleIcon as Info, UserIcon as User, UsersIcon as Users, BuildingOffice2Icon as Building2, PencilSquareIcon as Edit2, BanknotesIcon as Banknote } from '@heroicons/react/24/outline';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import type { Applicant, Position } from '@/lib/types';
import { CustomFieldDisplay } from '../CustomFieldDisplay';
import { CustomFieldEdit } from '../CustomFieldEdit';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';

import { FileText, Paperclip, X } from 'lucide-react';

interface JobAppliedTabProps {
  applicant: Applicant;
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
  hideApplicantDetails?: boolean;
  resumes?: any[];
}

export const JobAppliedTab: React.FC<JobAppliedTabProps> = ({
  applicant,
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
  hideApplicantDetails = false,
  resumes = []
}) => {
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditRecruiterOpen, setIsEditRecruiterOpen] = useState(false);
  const [isEditSourceOpen, setIsEditSourceOpen] = useState(false);
  const [isEditSalaryOpen, setIsEditSalaryOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(applicant.statusId || '');
  const [selectedRecruiterId, setSelectedRecruiterId] = useState(applicant.recruiterId || '');
  const [selectedSourceId, setSelectedSourceId] = useState(applicant.sourceId || '');
  const [selectedSalary, setSelectedSalary] = useState(applicant.expectedSalary?.toString() || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const { settings: globalSettings } = useGlobalSettings();
  const orgLogoUrl = globalSettings.organizationLogoDataUrl;

  // Attachment preview state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);

  const getAttachmentName = (att: any) =>
    att?.filename || att?.fileName || att?.name || att?.originalName || 'Attachment';

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/applicants/${applicant.id}`, {
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
      const res = await fetch(`/api/applicants/${applicant.id}/assign-recruiter`, {
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
      const res = await fetch(`/api/applicants/${applicant.id}`, {
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



  const handleUpdateSalary = async () => {
    setIsUpdating(true);
    try {
      const salaryValue = selectedSalary ? parseFloat(selectedSalary) : null;
      const res = await fetch(`/api/applicants/${applicant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ expectedSalary: salaryValue }),
      });
      if (!res.ok) throw new Error('Failed to update salary');
      toast.success('Salary updated successfully');
      setIsEditSalaryOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update salary');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentStage = availableStages.find(s => s.id === applicant.statusId);
  const currentRecruiter = availableRecruiters.find(r => r.id === applicant.recruiterId);
  const currentSource = availableSources.find(s => s.id === applicant.sourceId);

  return (
    <div className="space-y-4">
      {/* Attachments Card */}
      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
             Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {resumes.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 bg-background border border-border/50 rounded-xl p-3 pr-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedAttachment(att);
                  setIsPreviewModalOpen(true);
                }}
              >
                <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{att.fileName || 'Attachment'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground w-fit mt-1">{att.label || 'PDF'}</span>
                </div>
              </div>
            ))}
            {resumes.length === 0 && (
              <div className="text-sm text-muted-foreground italic">No attachments</div>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <h4 className="font-semibold text-foreground text-lg flex items-center gap-2">
                    {orgLogoUrl && (
                      <img
                        src={orgLogoUrl}
                        alt="Logo"
                        className="h-6 w-6 object-contain flex-shrink-0 rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span>{Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId)?.title || 'Unknown Position' : 'Unknown Position'}</span>
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

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Banknote className="h-3.5 w-3.5" />
                <span>Expected: {applicant.expectedSalary ? `฿${applicant.expectedSalary.toLocaleString()}` : 'N/A'}</span>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted rounded-full ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSalary(applicant.expectedSalary?.toString() || '');
                      setIsEditSalaryOpen(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
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
              <p className="text-sm">Click "Edit" to select the position this Applicant applied for.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applicant Details Card */}
      {!hideApplicantDetails && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Applicant Details
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
                    setSelectedStatus(applicant.statusId || '');
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
                    setSelectedSourceId(applicant.sourceId || '');
                    setIsEditSourceOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Recruiter */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
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
                    setSelectedRecruiterId(applicant.recruiterId || '');
                    setIsEditRecruiterOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Expected Salary */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expected Salary</span>
              </div>
              <div className="flex items-center gap-2">
                {applicant.expectedSalary ? (
                  <span className="text-sm font-medium">
                    ฿{applicant.expectedSalary.toLocaleString()}
                    <span className="text-xs text-muted-foreground font-normal ml-1">/month</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not set</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSalary(applicant.expectedSalary?.toString() || '');
                    setIsEditSalaryOpen(true);
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
      {
        isEditing ? (
          <CustomFieldEdit
            modelName="Applicant"
            section="jobs"
            entityId={applicant.id}
            customFields={applicant.customFields || {}}
            onFieldChange={onCustomFieldChange || (() => { })}
            title="Additional Job Information"
          />
        ) : (
          <CustomFieldDisplay
            modelName="Applicant"
            section="jobs"
            entityId={applicant.id}
            customFields={applicant.customFields || {}}
            title="Additional Job Information"
          />
        )
      }

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

      {/* Edit Salary Dialog */}
      <Dialog open={isEditSalaryOpen} onOpenChange={setIsEditSalaryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Expected Salary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Expected Salary (THB/month)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">฿</span>
                <input
                  id="salary"
                  type="number"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. 50000"
                  value={selectedSalary}
                  onChange={(e) => setSelectedSalary(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSalaryOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSalary} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0" dialogId="file-preview-modal">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-500" />
                <DialogTitle>{selectedAttachment ? getAttachmentName(selectedAttachment) : 'File Preview'}</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPreviewModalOpen(false)}
                className="h-8 w-8 border-none shadow-none hover:bg-transparent focus:ring-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-[600px]">
            {selectedAttachment && (
              <iframe
                src={selectedAttachment.url}
                className="w-full h-[600px]"
                title="File Preview"
                style={{ border: 'none' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
