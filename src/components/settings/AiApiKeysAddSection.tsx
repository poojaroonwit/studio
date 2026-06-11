"use client";

import { Plus } from "lucide-react";

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AiProvider } from "./ai-api-keys-utils";
import type { AiApiKeysAccordionProps } from "./AiApiKeysTabTypes";

export function AiApiKeysAddSection({
  isSaving,
  newApiKey,
  newPriority,
  providerLabel,
  selectedProvider,
  actions,
}: AiApiKeysAccordionProps) {
  return (
    <AccordionItem value="add" className="border-b">
      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <div className="text-left">
            <div className="font-semibold">Add New API Key</div>
            <div className="text-xs text-muted-foreground font-normal">
              {`Add a new ${providerLabel} API key with priority. Lower priority numbers are used first.`}
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4 pt-2">
        <div className="mb-4 grid gap-2 max-w-xs">
          <Label htmlFor="ai-provider">AI Provider</Label>
          <Select value={selectedProvider} onValueChange={(value) => actions.updateProviderSelection(value as AiProvider)}>
            <SelectTrigger id="ai-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="new-api-key">API Key</Label>
            <Input
              id="new-api-key"
              type="password"
              placeholder={`Enter your ${providerLabel} API Key`}
              value={newApiKey}
              onChange={(event) => actions.setNewApiKey(event.target.value)}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="new-priority">Priority</Label>
            <Input
              id="new-priority"
              type="number"
              min="1"
              value={newPriority}
              onChange={(event) => actions.setNewPriority(parseInt(event.target.value) || 1)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={actions.addApiKey} disabled={!newApiKey.trim() || isSaving}>
              <Plus className="h-4 w-4 mr-2" />
              {isSaving ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
