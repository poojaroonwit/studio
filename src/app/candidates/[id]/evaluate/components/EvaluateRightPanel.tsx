"use client";

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EvaluationQuestion } from '../types';

interface EvaluateRightPanelProps {
    mode: 'question' | 'comments';
    currentQuestion: EvaluationQuestion | null;
    comments: string;
    onScoreChange: (questionId: string, score: number) => void;
    onCommentsChange: (comments: string) => void;
}

export function EvaluateRightPanel({
    mode,
    currentQuestion: _currentQuestion,
    comments,
    onScoreChange: _onScoreChange,
    onCommentsChange,
}: EvaluateRightPanelProps) {
    if (mode !== 'comments') {
        return null;
    }

    return (
        <aside className="hidden md:block col-span-3 border-l pl-6 h-[calc(100vh-16rem)]">
            <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-1">Comments</h3>
                        <p className="text-sm text-muted-foreground">
                            Add your overall feedback for this candidate.
                        </p>
                    </div>
                    <Textarea
                        value={comments}
                        onChange={(e) => onCommentsChange(e.target.value)}
                        placeholder="Enter your comments..."
                        className="min-h-[300px] text-base resize-none focus-visible:ring-0"
                    />
                </div>
            </ScrollArea>
        </aside>
    );
}
