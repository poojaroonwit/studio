import type { AiGenerationOptions, AiProvider } from './aiProvider-types';
import { generateGeminiText } from './aiProvider-gemini';
import { generateOpenAiText } from './aiProvider-openai';

export async function generateTextWithProvider(
  provider: AiProvider,
  apiKey: string,
  model: string,
  prompt: string,
  options?: AiGenerationOptions
): Promise<string> {
  return provider === 'openai'
    ? generateOpenAiText(apiKey, model, prompt, options)
    : generateGeminiText(apiKey, model, prompt, options);
}
