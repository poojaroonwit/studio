"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, CheckCircle } from 'lucide-react';
import type { EvaluationQuestion } from '../types';
import { useIsMobile } from '@/hooks/use-mobile';

interface EditPersonalitySkillDrawerProps {
  editingQuestionIndex: number | null;
  question: EvaluationQuestion | null;
  isMobile: boolean;
  onClose: () => void;
  onScoreChange: (questionId: string, score: number) => void;
  onNotesChange: (questionId: string, notes: string) => void;
}

export function EditPersonalitySkillDrawer({
  editingQuestionIndex,
  question,
  isMobile,
  onClose,
  onScoreChange,
  onNotesChange,
}: EditPersonalitySkillDrawerProps) {
  if (editingQuestionIndex === null || !question) return null;

  const scoreOptions = [
    { value: 1, label: 'Unsatisfactory', color: 'bg-[#E84040]' },
    { value: 2, label: 'Improvement Need', color: 'bg-[#F4A340]' },
    { value: 3, label: 'Meet Exceptional', color: 'bg-[#F1D24A]' },
    { value: 4, label: 'Exceeds Expectational', color: 'bg-[#63E25F]' },
    { value: 5, label: 'Exceptional', color: 'bg-[#2E7D32]' },
  ];

  if (isMobile) {
    return (
      <Dialog open={editingQuestionIndex !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="fixed bottom-0 left-1/2 top-auto translate-x-[-50%] translate-y-0 w-screen max-w-none h-[90vh] p-0 overflow-hidden rounded-t-3xl rounded-b-none border-0 shadow-2xl flex flex-col"
          dialogId="edit-personality-skill-modal"
        >
          <VisuallyHidden>
            <DialogHeader>Edit Personality Skill - {question.traitName}</DialogHeader>
          </VisuallyHidden>
          <DialogHeader className="border-b flex-shrink-0 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {question.traitName}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {question.shortDescription && (
                <p className="text-sm text-muted-foreground">
                  {question.shortDescription}
                </p>
              )}
              {question.description && (
                <p className="text-base text-muted-foreground">
                  {question.description}
                </p>
              )}

              {/* Five colored rating circles - vertical layout for mobile */}
              <div className="flex flex-col gap-4">
                {scoreOptions.map((opt) => {
                  const isSelected = question.score === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onScoreChange(question.id, opt.value);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ${opt.color} ${isSelected ? 'opacity-100 scale-110' : 'opacity-50'}`}>
                        {opt.value}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-base">{opt.label}</div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Notes section */}
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-semibold">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  value={question.notes}
                  onChange={(e) => onNotesChange(question.id, e.target.value)}
                  placeholder="Add notes about this trait..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={editingQuestionIndex !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] p-0 overflow-y-auto">
        <SheetHeader className="border-b flex-shrink-0 p-6">
          <SheetTitle className="text-xl font-semibold">
            {question.traitName}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {question.shortDescription && (
              <p className="text-sm text-muted-foreground">
                {question.shortDescription}
              </p>
            )}
            {question.description && (
              <p className="text-base text-muted-foreground">
                {question.description}
              </p>
            )}

            {/* Five colored rating circles */}
            <div className="flex flex-col gap-4">
              {scoreOptions.map((opt) => {
                const isSelected = question.score === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onScoreChange(question.id, opt.value);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ${opt.color} ${isSelected ? 'opacity-100 scale-110' : 'opacity-50'}`}>
                      {opt.value}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-base">{opt.label}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notes section */}
            <div className="space-y-2">
              <label htmlFor="notes-drawer" className="text-sm font-semibold">
                Notes
              </label>
              <Textarea
                id="notes-drawer"
                value={question.notes}
                onChange={(e) => onNotesChange(question.id, e.target.value)}
                placeholder="Add notes about this trait..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

