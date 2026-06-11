"use client";

import { toast } from 'react-hot-toast';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  ProcessingConfigSection,
  ProcessingConfigTitle,
  WebhookConfigTitle,
  WebhookSettingsSection
} from './ProcessingTabParts';
import type { ProcessingTabProps } from './processing-tab-types';
import { getWebhookTestToastMessage, testProcessingWebhook } from './processing-tab-utils';

export default function ProcessingTab({
  maxConcurrentProcessors,
  setMaxConcurrentProcessors,
  resumeProcessingWebhookUrl,
  setResumeProcessingWebhookUrl,
  resumeProcessingWebhookToken,
  setResumeProcessingWebhookToken,
  resumeProcessingWebhookResponseMode,
  setResumeProcessingWebhookResponseMode,
  resumeProcessingWebhookTimeout,
  setResumeProcessingWebhookTimeout,
  showWebhookToken,
  setShowWebhookToken,
  isSaving
}: ProcessingTabProps) {
  const handleTestWebhook = async () => {
    if (!resumeProcessingWebhookUrl) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    try {
      const result = await testProcessingWebhook(resumeProcessingWebhookUrl, resumeProcessingWebhookToken);
      const toastMessage = getWebhookTestToastMessage(result);

      if (toastMessage.type === 'success') {
        toast.success(toastMessage.message);
      } else {
        toast.error(toastMessage.message);
      }
    } catch {
      toast.error('Failed to test webhook');
    }
  };

  return (
    <ScrollArea className="h-full">
      <Accordion type="multiple" defaultValue={['processing-config', 'webhook']} className="w-full">
        <AccordionItem value="processing-config" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <ProcessingConfigTitle />
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <ProcessingConfigSection
              maxConcurrentProcessors={maxConcurrentProcessors}
              setMaxConcurrentProcessors={setMaxConcurrentProcessors}
              isSaving={isSaving}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="webhook" className="border-b">
          <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
            <WebhookConfigTitle />
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4 pt-2">
            <WebhookSettingsSection
              resumeProcessingWebhookUrl={resumeProcessingWebhookUrl}
              setResumeProcessingWebhookUrl={setResumeProcessingWebhookUrl}
              resumeProcessingWebhookToken={resumeProcessingWebhookToken}
              setResumeProcessingWebhookToken={setResumeProcessingWebhookToken}
              resumeProcessingWebhookResponseMode={resumeProcessingWebhookResponseMode}
              setResumeProcessingWebhookResponseMode={setResumeProcessingWebhookResponseMode}
              resumeProcessingWebhookTimeout={resumeProcessingWebhookTimeout}
              setResumeProcessingWebhookTimeout={setResumeProcessingWebhookTimeout}
              showWebhookToken={showWebhookToken}
              setShowWebhookToken={setShowWebhookToken}
              isSaving={isSaving}
              onTestWebhook={handleTestWebhook}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </ScrollArea>
  );
}
