export type AiProvider = 'gemini' | 'openai';

export interface AiModelInfo {
  name: string;
  displayName: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

export interface AiGenerationOptions {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}
