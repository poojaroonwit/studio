"use client";

import React from 'react';
import { Bot, Database, GitBranch, Zap } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SystemSettingsFieldRow } from './SystemSettingsFieldRow';
import type { ProcessingTabProps } from './processing-tab-types';
export { WebhookSettingsSection } from './ProcessingWebhookFields';

interface AccordionTitleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ProcessingConfigSectionProps {
  resumeProcessingMode: ProcessingTabProps['resumeProcessingMode'];
  setResumeProcessingMode: ProcessingTabProps['setResumeProcessingMode'];
  maxConcurrentProcessors: number;
  setMaxConcurrentProcessors: (value: number) => void;
  isSaving: boolean;
}

type BuiltInFlowSettingsSectionProps = Pick<
  ProcessingTabProps,
  | 'builtInProcessorNodeName'
  | 'setBuiltInProcessorNodeName'
  | 'builtInResumeExtractionPrompt'
  | 'setBuiltInResumeExtractionPrompt'
  | 'builtInApplicantMappingPrompt'
  | 'setBuiltInApplicantMappingPrompt'
  | 'builtInJobMatchingPrompt'
  | 'setBuiltInJobMatchingPrompt'
  | 'isSaving'
>;

export function ProcessingAccordionTitle({ icon, title, description }: AccordionTitleProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="text-left">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground font-normal">{description}</div>
      </div>
    </div>
  );
}

export function ProcessingConfigTitle(): React.ReactElement {
  return (
    <ProcessingAccordionTitle
      icon={<Database className="h-5 w-5 text-primary" />}
      title="Processing Configuration"
      description="Configure system performance and processing settings"
    />
  );
}

export function WebhookConfigTitle(): React.ReactElement {
  return (
    <ProcessingAccordionTitle
      icon={<Zap className="h-5 w-5 text-primary" />}
      title="PDF Processing Webhook"
      description="Configure webhook for all PDF processing including resume uploads and automated Applicant creation"
    />
  );
}

export function BuiltInFlowConfigTitle(): React.ReactElement {
  return (
    <ProcessingAccordionTitle
      icon={<GitBranch className="h-5 w-5 text-primary" />}
      title="Built-in Processing Flow"
      description="Configure the internal processing node and system prompts used by resume upload flows"
    />
  );
}

export function ProcessingConfigSection({
  resumeProcessingMode,
  setResumeProcessingMode,
  maxConcurrentProcessors,
  setMaxConcurrentProcessors,
  isSaving
}: ProcessingConfigSectionProps): React.ReactElement {
  return (
    <div className="space-y-5">
      <SystemSettingsFieldRow
        htmlFor="resume-processing-mode"
        label="Processing Engine"
        description="Choose the internal app processor or an external webhook service for resume processing."
      >
        <Select
          value={resumeProcessingMode}
          onValueChange={(value) => setResumeProcessingMode(value as ProcessingTabProps['resumeProcessingMode'])}
          disabled={isSaving}
        >
          <SelectTrigger id="resume-processing-mode">
            <SelectValue placeholder="Select processing engine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="built-in">Built-in app processor</SelectItem>
            <SelectItem value="external">External webhook processor</SelectItem>
          </SelectContent>
        </Select>
      </SystemSettingsFieldRow>

      <SystemSettingsFieldRow
        htmlFor="max-concurrent-processors"
        label="Max Concurrent Processors"
        description="Maximum number of resume processing jobs that can run at the same time."
      >
        <Input
          id="max-concurrent-processors"
          type="number"
          min={1}
          max={100}
          value={maxConcurrentProcessors}
          onChange={(event) => setMaxConcurrentProcessors(Number(event.target.value))}
          className="w-32"
          disabled={isSaving}
        />
      </SystemSettingsFieldRow>
    </div>
  );
}

export function BuiltInFlowSettingsSection({
  builtInProcessorNodeName,
  setBuiltInProcessorNodeName,
  builtInResumeExtractionPrompt,
  setBuiltInResumeExtractionPrompt,
  builtInApplicantMappingPrompt,
  setBuiltInApplicantMappingPrompt,
  builtInJobMatchingPrompt,
  setBuiltInJobMatchingPrompt,
  isSaving,
}: BuiltInFlowSettingsSectionProps): React.ReactElement {
  return (
    <div className="space-y-5">
      <SystemSettingsFieldRow
        htmlFor="built-in-processor-node"
        label="Active Node"
        description="Logical node name shown in processing logs and used to identify the built-in resume flow."
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <Input
            id="built-in-processor-node"
            value={builtInProcessorNodeName}
            onChange={(event) => setBuiltInProcessorNodeName(event.target.value)}
            placeholder="Default built-in processor"
            disabled={isSaving}
          />
        </div>
      </SystemSettingsFieldRow>

      <SystemPromptFlowRow
        id="built-in-resume-extraction-prompt"
        label="Resume Extraction Prompt"
        description="System prompt for extracting structured data from the uploaded resume file."
        value={builtInResumeExtractionPrompt}
        onChange={setBuiltInResumeExtractionPrompt}
        disabled={isSaving}
      />
      <SystemPromptFlowRow
        id="built-in-applicant-mapping-prompt"
        label="Applicant Mapping Prompt"
        description="System prompt for creating or updating applicant records from extracted resume data."
        value={builtInApplicantMappingPrompt}
        onChange={setBuiltInApplicantMappingPrompt}
        disabled={isSaving}
      />
      <SystemPromptFlowRow
        id="built-in-job-matching-prompt"
        label="Job Matching Prompt"
        description="System prompt for matching the applicant to positions and generating fit reasons."
        value={builtInJobMatchingPrompt}
        onChange={setBuiltInJobMatchingPrompt}
        disabled={isSaving}
      />
    </div>
  );
}

function SystemPromptFlowRow({
  description,
  disabled,
  id,
  label,
  onChange,
  value,
}: {
  description: string;
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <SystemSettingsFieldRow htmlFor={id} label={label} description={description}>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-28 font-mono text-sm"
      />
    </SystemSettingsFieldRow>
  );
}
