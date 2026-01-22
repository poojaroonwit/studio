"use client";

import React from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';

interface MatchCriteriaTabProps {
    defaultMatchCriteria: string;
    setDefaultMatchCriteria: (val: string) => void;
    isSaving: boolean;
    isEditorReady: boolean;
}

export default function MatchCriteriaTab({
    defaultMatchCriteria,
    setDefaultMatchCriteria,
    isSaving,
    isEditorReady,
}: MatchCriteriaTabProps) {
    return (
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={['match-criteria']} className="w-full">
                <AccordionItem value="match-criteria" className="border-b">
                    <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Match Criteria</div>
                                <div className="text-xs text-muted-foreground font-normal">Configure the default match criteria template for new positions. This will be used when creating new positions if no specific criteria are provided.</div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="default-match-criteria">Default Match Criteria Template</Label>
                                <div className="min-h-[200px] border rounded-md">
                                    {!isEditorReady ? (
                                        <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                            Loading editor...
                                        </div>
                                    ) : (
                                        <div className={`relative ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <TiptapEditor
                                                key={`default-match-criteria-editor-${isEditorReady}`}
                                                value={defaultMatchCriteria}
                                                onChange={setDefaultMatchCriteria}
                                                placeholder="Enter default match criteria template for new positions..."
                                                className="min-h-[200px]"
                                                isOpen={isEditorReady}
                                            />
                                            {isSaving && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This template will be used as the default match criteria when creating new positions. You can include requirements, skills, experience levels, and other criteria.
                                </p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </ScrollArea>
    );
}
