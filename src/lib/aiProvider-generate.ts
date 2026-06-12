import type { AiGenerationOptions, AiProvider } from './aiProvider-types';
import { generateDeepSeekText } from './aiProvider-deepseek';
import { generateGeminiText } from './aiProvider-gemini';
import { generateOpenAiText } from './aiProvider-openai';

export async function generateTextWithProvider(
  provider: AiProvider,
  apiKey: string,
  model: string,
  prompt: string,
  options?: AiGenerationOptions
): Promise<string> {
  if (provider === 'openai') {
    return generateOpenAiText(apiKey, model, prompt, options);
  }

  if (provider === 'deepseek') {
    return generateDeepSeekText(apiKey, model, prompt, options);
  }

  return generateGeminiText(apiKey, model, prompt, options);
}
