"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ApplicantAvatar } from '@/components/ui/applicant-avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Loader2,
  Check
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { Headcount, HeadcountType, HeadcountStatus, Applicant } from '@/lib/types';
import { HeadcountCustomFields } from './HeadcountCustomFields';

interface HeadcountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headcount?: Headcount | null;
  Applicants: Applicant[];
  positionId: string;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

const HEADCOUNT_STATUS_OPTIONS: { value: HeadcountStatus; label: string }[] = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'filled', label: 'Filled' },
];

export function HeadcountModal({
  open,
  onOpenChange,
  headcount,
  Applicants,
  positionId,
  onSave,
  onClose
}: HeadcountModalProps) {
  // Headcount type options will be fetched from API
  const [headcountTypeOptions, setHeadcountTypeOptions] = useState<{ value: HeadcountType; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'new' as HeadcountType,
    status: 'vacant' as HeadcountStatus,
    candidateId: null as string | null,
    onboardingDate: '',
    requestDate: '',
    notes: '',
    memoId: '',
    employeeId: '',
    customFields: {} as Record<string, any>,
  });


  const isEdit = Boolean(headcount);

  useEffect(() => {
    fetchHeadcountTypeOptions();
  }, []);

  const fetchHeadcountTypeOptions = async () => {
    try {
      const response = await fetch('/api/settings/headcount-types');
      if (response.ok) {
        const options = await response.json();
        setHeadcountTypeOptions(options);
      }
    } catch (error) {
      console.error('Error fetching headcount type options:', error);
      // Set default options if API fails
      setHeadcountTypeOptions([
        { value: 'promote', label: 'Promote' },
        { value: 'new', label: 'New' },
        { value: 'replace', label: 'Replace' },
      ]);
    }
  };

  useEffect(() => {
    if (headcount) {
      setFormData({
        type: headcount.type,
        status: headcount.status,
        candidateId: headcount.candidateId || null,
        onboardingDate: headcount.onboardingDate ? new Date(headcount.onboardingDate).toISOString().split('T')[0] : '',
        requestDate: headcount.requestDate ? new Date(headcount.requestDate).toISOString().split('T')[0] : '',
        notes: headcount.notes || '',
        memoId: headcount.memoId || '',
        employeeId: headcount.employeeId || '',
        customFields: headcount.customFields || {},
      });
    } else {
      // For new headcount, set defaults
      setFormData({
        type: 'new',
        status: 'vacant', // Default to vacant
        candidateId: null, // No Applicant assignment for new headcount
        onboardingDate: '',
        requestDate: new Date().toISOString().split('T')[0], // Default to today
        notes: '',
        memoId: '',
        employeeId: '',
        customFields: {},
      });
    }
  }, [headcount, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type) {
      toast.error('Please select a headcount type');
      return;
    }

    // Validate that if status is 'filled', a candidateId must be provided
    if (formData.status === 'filled' && !formData.candidateId) {
      toast.error('A Applicant must be assigned when status is "filled". Please assign the Applicant through the Applicant details page first.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...formData,
      });
    } catch (error) {
      console.error('Error saving headcount:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(prev => ({
      ...prev,
      type: 'new',
      status: 'vacant',
      candidateId: null,
      onboardingDate: prev.onboardingDate ?? '',
      requestDate: prev.requestDate ?? '',
      notes: '',
      memoId: '',
      employeeId: '',
      customFields: {},
    }));
    onClose();
  };

  const selectedApplicant = formData.candidateId ? Applicants.find(c => c.id === formData.candidateId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dialogId="headcount-modal">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Headcount' : 'Create New Headcount'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update headcount information and assignments' : 'Add a new headcount position'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: HeadcountType) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent selectId="headcount-type-select">
                  {headcountTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: HeadcountStatus) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent selectId="headcount-status-select">
                  {HEADCOUNT_STATUS_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.value === 'filled' && !formData.candidateId}
                    >
                      {option.label}
                      {option.value === 'filled' && !formData.candidateId && ' (requires Applicant assignment)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.status === 'filled' && !formData.candidateId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Note: Status "filled" requires a Applicant assignment. Assign the Applicant through the Applicant details page first.
                </p>
              )}
            </div>
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestDate">Request Date</Label>
              <Input
                id="requestDate"
                type="date"
                value={formData.requestDate}
                onChange={(e) => setFormData(prev => ({ ...prev, requestDate: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboardingDate">Onboarding Date</Label>
              <Input
                id="onboardingDate"
                type="date"
                value={formData.onboardingDate}
                onChange={(e) => setFormData(prev => ({ ...prev, onboardingDate: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>

          {/* Applicant Assignment - Only show in edit mode and display current assignment */}
          {isEdit && (
            <div className="space-y-2">
              <Label>Applicant Assignment</Label>
              <div className="p-3 border rounded-lg bg-muted/50">
                {selectedApplicant ? (
                  <div className="flex items-center gap-3">
                    <ApplicantAvatar
                      user={selectedapplicant}
                      size="md"
                      className="h-8 w-8"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{selectedapplicant.name}</div>
                      <div className="text-sm text-muted-foreground">{selectedapplicant.email}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      (Assignment managed via Applicant details)
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <div className="text-sm">No Applicant assigned</div>
                    <div className="text-xs mt-1">Assign Applicants through Applicant details page</div>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Memo ID and Employee ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="memoId">Memo ID</Label>
              <Input
                id="memoId"
                placeholder="Enter memo ID..."
                value={formData.memoId}
                onChange={(e) => setFormData(prev => ({ ...prev, memoId: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                placeholder="Enter employee ID..."
                value={(formData as any).employeeId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                disabled={loading}
              />
            </div>
          </div>

          {/* Custom Fields */}
          <HeadcountCustomFields
            customFields={formData.customFields}
            onCustomFieldsChange={(customFields: Record<string, any>) => setFormData(prev => ({ ...prev, customFields }))}
            positionId={positionId}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Headcount' : 'Create Headcount'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
