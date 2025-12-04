"use client";

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description?: string;
  templateSkills?: any[];
  templatePersonalityTraits?: any[];
}

interface MobileTemplateSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
  isLoading?: boolean;
}

export function MobileTemplateSelector({
  isOpen,
  onOpenChange,
  templates,
  selectedTemplateId,
  onSelect,
  isLoading = false
}: MobileTemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    onOpenChange(false);
  };

  const handleClearSelection = () => {
    onSelect('');
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] p-0 rounded-t-3xl"
        sheetId="mobile-template-selector"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
            <SheetTitle>Select Evaluation Template</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Choose a template to guide your evaluation criteria
            </p>
          </SheetHeader>

          {/* Search */}
          <div className="px-4 py-3 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Template List */}
          <ScrollArea className="flex-1 px-4">
            <div className="py-3 space-y-3">
              {/* None Option */}
              <Card
                onClick={handleClearSelection}
                className={cn(
                  "p-4 cursor-pointer transition-all border-2",
                  selectedTemplateId === ''
                    ? "bg-primary/10 border-primary"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <X className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No Template</p>
                      <p className="text-xs text-muted-foreground">
                        Add criteria manually
                      </p>
                    </div>
                  </div>
                  {selectedTemplateId === '' && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </Card>

              {/* Templates */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No templates found</p>
                </div>
              ) : (
                filteredTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const skillCount = template.templateSkills?.length || 0;
                  const traitCount = template.templatePersonalityTraits?.length || 0;

                  return (
                    <Card
                      key={template.id}
                      onClick={() => handleSelect(template.id)}
                      className={cn(
                        "p-4 cursor-pointer transition-all border-2",
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{template.name}</p>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          
                          {template.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {template.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {skillCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {skillCount} skill{skillCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {traitCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {traitCount} trait{traitCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="px-4 py-3 border-t flex-shrink-0 bg-background">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
              disabled={isLoading}
            >
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
