import { getSystemSetting } from './systemSettings';
import { getApiKeys } from './aiApiKeyManager';

/**
 * Get the selected Gemini model from the highest priority API key
 * Falls back to 'gemini-pro' if no model is configured (v1 API compatible)
 */
export async function getSelectedGeminiModel(): Promise<string> {
  try {
    const apiKeys = await getApiKeys();
    const activeKeys = apiKeys.filter(key => key.isActive).sort((a, b) => a.priority - b.priority);
    
    if (activeKeys.length > 0) {
      let modelName = activeKeys[0].selectedModel || 'gemini-pro';
      // Extract model name if it includes path
      if (modelName.includes('/')) {
        modelName = modelName.split('/').pop() || 'gemini-pro';
      }
      // Fallback to gemini-pro if gemini-1.5-pro is specified (not available in v1)
      if (modelName === 'gemini-1.5-pro') {
        return 'gemini-pro';
      }
      return modelName;
    }
    
    // Fallback to system setting
    const selectedModel = await getSystemSetting('geminiModelSelection');
    // Extract model name if it includes path, and fallback to gemini-pro for v1 API
    if (selectedModel) {
      let modelName = selectedModel;
      if (modelName.includes('/')) {
        modelName = modelName.split('/').pop() || 'gemini-pro';
      }
      // Fallback to gemini-pro if gemini-1.5-pro is specified (not available in v1)
      if (modelName === 'gemini-1.5-pro') {
        return 'gemini-pro';
      }
      return modelName;
    }
    return 'gemini-pro';
  } catch (error) {
    console.error('Error getting selected Gemini model:', error);
    // Default to gemini-pro which is available in v1 API
    // gemini-1.5-pro may not be available in v1 API
    return 'gemini-pro';
  }
}

/**
 * Build the Gemini API URL with the selected model
 */
export async function buildGeminiApiUrl(): Promise<string> {
  const model = await getSelectedGeminiModel();
  return `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
}
