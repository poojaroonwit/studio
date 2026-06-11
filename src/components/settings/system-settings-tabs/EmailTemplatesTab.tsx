"use client";

import React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  DefaultEditorModeField,
  EmailTemplateEditor,
  EmailTemplateEditorToolbar,
  EmailTemplatesAccordionTitle,
  IcsDescriptionField,
  TemplateEditorHelp,
  TemplateSubjectField,
  TemplateVariablesHelp
} from './EmailTemplatesTabParts';
import type { EmailTemplatesTabProps } from './email-templates-tab-types';
import {
  DEFAULT_INTERVIEW_INVITATION_SUBJECT,
  DEFAULT_INTERVIEW_INVITATION_TEMPLATE
} from './email-templates-tab-utils';

export default function EmailTemplatesTab({
  emailTemplateInterviewInvitationSubject,
  setEmailTemplateInterviewInvitationSubject,
  emailTemplateInterviewInvitation,
  setEmailTemplateInterviewInvitation,
  emailTemplateInterviewInvitationEditorMode,
  setEmailTemplateInterviewInvitationEditorMode,
  icsDescriptionTemplate,
  setIcsDescriptionTemplate,
  emailEditorMode,
  setEmailEditorMode,
  isSaving,
  isEditorReady
}: EmailTemplatesTabProps) {
  const handleResetToDefault = () => {
    setEmailTemplateInterviewInvitation(DEFAULT_INTERVIEW_INVITATION_TEMPLATE);
    setEmailTemplateInterviewInvitationSubject(DEFAULT_INTERVIEW_INVITATION_SUBJECT);
  };

  return (
    <ScrollArea className="h-full">
      <Accordion type="multiple" defaultValue={['email-templates']} className="w-full">
        <AccordionItem value="email-templates" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <EmailTemplatesAccordionTitle />
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <div className="space-y-4">
              <TemplateSubjectField
                value={emailTemplateInterviewInvitationSubject}
                onChange={setEmailTemplateInterviewInvitationSubject}
                isSaving={isSaving}
              />
              <EmailTemplateEditorToolbar
                emailEditorMode={emailEditorMode}
                setEmailEditorMode={setEmailEditorMode}
                onResetToDefault={handleResetToDefault}
                isSaving={isSaving}
              />
              <DefaultEditorModeField
                value={emailTemplateInterviewInvitationEditorMode}
                onChange={setEmailTemplateInterviewInvitationEditorMode}
                isSaving={isSaving}
              />
              <EmailTemplateEditor
                emailEditorMode={emailEditorMode}
                value={emailTemplateInterviewInvitation}
                onChange={setEmailTemplateInterviewInvitation}
                isSaving={isSaving}
                isEditorReady={isEditorReady}
              />
              <TemplateEditorHelp emailEditorMode={emailEditorMode} />
              <IcsDescriptionField
                value={icsDescriptionTemplate}
                onChange={setIcsDescriptionTemplate}
                isSaving={isSaving}
              />
              <TemplateVariablesHelp />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollArea>
  );
}
