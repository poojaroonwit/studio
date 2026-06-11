import { getSystemSetting } from '@/lib/systemSettings';

export interface ResumeProcessingWebhookSettings {
  url: string;
  token: string;
  responseMode: string;
}

export async function getResumeProcessingWebhookSettings(): Promise<ResumeProcessingWebhookSettings> {
  const [
    configuredUrl,
    configuredToken,
    configuredResponseMode,
  ] = await Promise.all([
    getSystemSetting('resumeProcessingWebhookUrl'),
    getSystemSetting('resumeProcessingWebhookToken'),
    getSystemSetting('resumeProcessingWebhookResponseMode'),
  ]);

  return {
    url: configuredUrl || process.env.RESUME_PROCESSING_WEBHOOK_URL || '',
    token: configuredToken || process.env.RESUME_PROCESSING_WEBHOOK_TOKEN || '',
    responseMode: configuredResponseMode || 'blocking',
  };
}

