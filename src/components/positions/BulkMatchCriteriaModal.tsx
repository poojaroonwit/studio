"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface BulkMatchCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (matchCriteria: string) => Promise<void>;
  selectedCount: number;
}

export function BulkMatchCriteriaModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: BulkMatchCriteriaModalProps) {
  const [matchCriteria, setMatchCriteria] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matchCriteria.trim()) {
      toast.error('Match criteria cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(matchCriteria);
      setMatchCriteria('');
      onClose();
    } catch (error) {
      console.error('Failed to update match criteria:', error);
      toast.error('Failed to update match criteria');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setMatchCriteria('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Update Match Criteria</DialogTitle>
          <DialogDescription>
            Update the match criteria for {selectedCount} selected position{selectedCount !== 1 ? 's' : ''}.
            This will replace the existing match criteria for all selected positions.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="matchCriteria">Match Criteria</Label>
            <Textarea
              id="matchCriteria"
              placeholder="Enter the match criteria content (HTML format supported)..."
              value={matchCriteria}
              onChange={(e) => setMatchCriteria(e.target.value)}
              rows={8}
              className="resize-none"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              You can use HTML formatting for rich text content.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !matchCriteria.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update {selectedCount} Position{selectedCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
