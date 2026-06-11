export interface ProcessingTabProps {
  maxConcurrentProcessors: number;
  setMaxConcurrentProcessors: (val: number) => void;
  resumeProcessingWebhookUrl: string;
  setResumeProcessingWebhookUrl: (val: string) => void;
  resumeProcessingWebhookToken: string;
  setResumeProcessingWebhookToken: (val: string) => void;
  resumeProcessingWebhookResponseMode: string;
  setResumeProcessingWebhookResponseMode: (val: string) => void;
  resumeProcessingWebhookTimeout: number;
  setResumeProcessingWebhookTimeout: (val: number) => void;
  showWebhookToken: boolean;
  setShowWebhookToken: (val: boolean) => void;
  isSaving: boolean;
}

export interface WebhookTestResponse {
  success?: boolean;
  responseTime?: string;
  error?: string;
}
