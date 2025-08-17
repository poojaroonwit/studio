"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  User, 
  Loader2,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import type { Headcount, HeadcountType, HeadcountStatus, Candidate } from '@/lib/types';
import { HeadcountCustomFields } from './HeadcountCustomFields';

interface HeadcountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headcount?: Headcount | null;
  candidates: Candidate[];
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
  candidates, 
  onSave, 
  onClose 
}: HeadcountModalProps) {
  // Headcount type options will be fetched from API
  const [headcountTypeOptions, setHeadcountTypeOptions] = useState<{ value: HeadcountType; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'new' as HeadcountType,
    status: 'vacant' as HeadcountStatus,
    candidateId: '',
    onboardingDate: null as Date | null,
    notes: '',
    memoId: '',
    customFields: {} as Record<string, any>,
  });
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [showCandidateDropdown, setShowCandidateDropdown] = useState(false);

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
        candidateId: headcount.candidateId || '',
        onboardingDate: headcount.onboardingDate ? new Date(headcount.onboardingDate) : null,
        notes: headcount.notes || '',
        memoId: headcount.memoId || '',
        customFields: headcount.customFields || {},
      });
    } else {
      setFormData({
        type: 'new',
        status: 'vacant',
        candidateId: '',
        onboardingDate: null,
        notes: '',
        memoId: '',
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

    setLoading(true);
    try {
      await onSave({
        ...formData,
        onboardingDate: formData.onboardingDate ? formData.onboardingDate.toISOString() : null,
      });
    } catch (error) {
      console.error('Error saving headcount:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'new',
      status: 'vacant',
      candidateId: '',
      onboardingDate: null,
      notes: '',
      memoId: '',
      customFields: {},
    });
    setCandidateSearchTerm('');
    setShowCandidateDropdown(false);
    onClose();
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
    candidate.email.toLowerCase().includes(candidateSearchTerm.toLowerCase())
  );

  const selectedCandidate = candidates.find(c => c.id === formData.candidateId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <SelectContent>
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
                <SelectContent>
                  {HEADCOUNT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Candidate Assignment */}
          <div className="space-y-2">
            <Label>Candidate Assignment</Label>
            <div className="relative">
              <Input
                placeholder="Search for a candidate..."
                value={candidateSearchTerm}
                onChange={(e) => {
                  setCandidateSearchTerm(e.target.value);
                  setShowCandidateDropdown(true);
                }}
                onFocus={() => setShowCandidateDropdown(true)}
              />
              
              {selectedCandidate && (
                <div className="mt-2 p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedCandidate.avatarUrl || undefined} />
                      <AvatarFallback>
                        {selectedCandidate.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{selectedCandidate.name}</div>
                      <div className="text-sm text-muted-foreground">{selectedCandidate.email}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, candidateId: '' }));
                        setCandidateSearchTerm('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {showCandidateDropdown && !selectedCandidate && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, candidateId: candidate.id }));
                          setCandidateSearchTerm(candidate.name);
                          setShowCandidateDropdown(false);
                        }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={candidate.avatarUrl || undefined} />
                          <AvatarFallback>
                            {candidate.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{candidate.name}</div>
                          <div className="text-sm text-muted-foreground">{candidate.email}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-muted-foreground text-center">
                      No candidates found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Onboarding Date */}
          <div className="space-y-2">
            <Label>Onboarding Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.onboardingDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.onboardingDate ? (
                    format(formData.onboardingDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.onboardingDate || undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, onboardingDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this headcount..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Memo ID */}
          <div className="space-y-2">
            <Label htmlFor="memoId">Memo ID</Label>
            <Input
              id="memoId"
              placeholder="Enter memo ID (optional)"
              value={formData.memoId}
              onChange={(e) => setFormData(prev => ({ ...prev, memoId: e.target.value }))}
            />
          </div>

          {/* Custom Fields */}
          <HeadcountCustomFields
            customFields={formData.customFields}
            onCustomFieldsChange={(customFields) => setFormData(prev => ({ ...prev, customFields }))}
            positionId={headcount?.positionId || ''}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
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
