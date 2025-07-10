import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const candidateFields = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'positionId', label: 'Position' },
  { key: 'fitScore', label: 'Fit Score' },
  { key: 'recruiterId', label: 'Recruiter' },
  { key: 'applicationDate', label: 'Application Date' },
];

const boardViews = [
  { key: 'kanban', label: 'Kanban' },
  { key: 'list', label: 'List' },
  { key: 'file', label: 'File Popup' },
];

interface CustomizeBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomizeBoardModal({ open, onOpenChange }: CustomizeBoardModalProps) {
  const [rowField, setRowField] = useState('status');
  const [columnField, setColumnField] = useState('recruiterId');
  const [visibleFields, setVisibleFields] = useState<string[]>(['name', 'email', 'status', 'fitScore']);
  const [viewType, setViewType] = useState('kanban');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Load preferences on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/settings/user-preferences')
      .then(res => res.json())
      .then(prefs => {
        // Find and set preferences for board config (using attributeKey convention)
        const rowPref = prefs.find((p: any) => p.attributeKey === 'mytasks_rowField');
        const colPref = prefs.find((p: any) => p.attributeKey === 'mytasks_columnField');
        const fieldsPref = prefs.find((p: any) => p.attributeKey === 'mytasks_visibleFields');
        const viewPref = prefs.find((p: any) => p.attributeKey === 'mytasks_viewType');
        if (rowPref) setRowField(rowPref.customNote || 'status');
        if (colPref) setColumnField(colPref.customNote || 'recruiterId');
        if (fieldsPref) {
          try {
            setVisibleFields(JSON.parse(fieldsPref.customNote) || ['name', 'email', 'status', 'fitScore']);
          } catch {
            setVisibleFields(['name', 'email', 'status', 'fitScore']);
          }
        }
        if (viewPref) setViewType(viewPref.customNote || 'kanban');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleFieldToggle = (key: string) => {
    setVisibleFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const prefs = [
        { modelType: 'Candidate', attributeKey: 'mytasks_rowField', uiPreference: 'Standard', customNote: rowField },
        { modelType: 'Candidate', attributeKey: 'mytasks_columnField', uiPreference: 'Standard', customNote: columnField },
        { modelType: 'Candidate', attributeKey: 'mytasks_visibleFields', uiPreference: 'Standard', customNote: JSON.stringify(visibleFields) },
        { modelType: 'Candidate', attributeKey: 'mytasks_viewType', uiPreference: 'Standard', customNote: viewType },
      ];
      const res = await fetch('/api/settings/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      toast.success('Board preferences saved!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSave();
          }}
        >
          <DialogHeader>
            <DialogTitle>Customize Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Row Field</Label>
              <Select value={rowField} onValueChange={setRowField}>
                <SelectTrigger><SelectValue placeholder="Select row field" /></SelectTrigger>
                <SelectContent>
                  {candidateFields.map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Column Field</Label>
              <Select value={columnField} onValueChange={setColumnField}>
                <SelectTrigger><SelectValue placeholder="Select column field" /></SelectTrigger>
                <SelectContent>
                  {candidateFields.map(f => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fields to Show</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {candidateFields.map(f => (
                  <label key={f.key} className="flex items-center gap-2">
                    <Checkbox checked={visibleFields.includes(f.key)} onCheckedChange={() => handleFieldToggle(f.key)} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Board View</Label>
              <div className="flex gap-4 mt-2">
                {boardViews.map(v => (
                  <label key={v.key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="boardView"
                      value={v.key}
                      checked={viewType === v.key}
                      onChange={() => setViewType(v.key)}
                    />
                    {v.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 