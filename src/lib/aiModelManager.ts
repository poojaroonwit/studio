import { getSystemSetting } from './systemSettings';
import { getApiKeys } from './aiApiKeyManager';

/**
 * Get the selected Gemini model from the highest priority API key
 * Falls back to 'gemini-1.5-pro' if no model is configured
 */
export async function getSelectedGeminiModel(): Promise<string> {
  try {
    const apiKeys = await getApiKeys();
    const activeKeys = apiKeys.filter(key => key.isActive).sort((a, b) => a.priority - b.priority);
    
    if (activeKeys.length > 0) {
      return activeKeys[0].selectedModel || 'gemini-1.5-pro';
    }
    
    // Fallback to system setting
    const selectedModel = await getSystemSetting('geminiModelSelection');
    return selectedModel || 'gemini-1.5-pro';
  } catch (error) {
    console.error('Error getting selected Gemini model:', error);
    return 'gemini-1.5-pro';
  }
}

/**
 * Build the Gemini API URL with the selected model
 */
export async function buildGeminiApiUrl(): Promise<string> {
  const model = await getSelectedGeminiModel();
  return `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
}
