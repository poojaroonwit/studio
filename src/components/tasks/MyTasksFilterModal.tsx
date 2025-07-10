import { useState } from 'react';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface MyTasksFilterModalProps {
  filters: any;
  availablePositions: any[];
  availableStages: any[];
  availableRecruiters: any[];
  onApply: (filters: any) => void;
  onClose: () => void;
}

export function MyTasksFilterModal({ filters, availablePositions, availableStages, availableRecruiters, onApply, onClose }: MyTasksFilterModalProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onApply(localFilters);
        onClose();
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Filter Tasks</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={localFilters.name || ''}
          onChange={e => setLocalFilters({ ...localFilters, name: e.target.value })}
          placeholder="Candidate name"
        />
      </div>
      <div className="space-y-2">
        <Label>Position</Label>
        <Select
          value={localFilters.positionId || "all"}
          onValueChange={val => setLocalFilters({ ...localFilters, positionId: val === "all" ? undefined : val })}
        >
          <SelectTrigger><SelectValue placeholder="All positions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {availablePositions.map((pos: any) => (
              <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Stage</Label>
        <Select
          value={localFilters.stage || "all"}
          onValueChange={val => setLocalFilters({ ...localFilters, stage: val === "all" ? undefined : val })}
        >
          <SelectTrigger><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {availableStages.map((stage: any) => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Recruiter</Label>
        <Select
          value={localFilters.recruiterId || "all"}
          onValueChange={val => setLocalFilters({ ...localFilters, recruiterId: val === "all" ? undefined : val })}
        >
          <SelectTrigger><SelectValue placeholder="All recruiters" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {availableRecruiters.map((rec: any) => (
              <SelectItem key={rec.id} value={rec.id}>{rec.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-2">
          <Label>Min Fit Score</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={localFilters.minFitScore ?? ''}
            onChange={e => setLocalFilters({ ...localFilters, minFitScore: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="0"
          />
        </div>
        <div className="flex-1 space-y-2">
          <Label>Max Fit Score</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={localFilters.maxFitScore ?? ''}
            onChange={e => setLocalFilters({ ...localFilters, maxFitScore: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="100"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">Apply</Button>
      </DialogFooter>
    </form>
  );
} 