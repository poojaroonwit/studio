/**
 * Gemini Model Management
 * Handles fetching and caching available Gemini models from the API
 */

let cachedModels: Array<{ name: string; displayName: string }> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Extract model identifier from full model name
 * Examples:
 * - "models/gemini-1.0-pro" -> "gemini-1.0-pro"
 * - "gemini-1.0-pro" -> "gemini-1.0-pro"
 */
export function extractModelName(fullModelName: string): string {
  if (!fullModelName) return '';
  
  // Remove "models/" prefix if present
  if (fullModelName.startsWith('models/')) {
    return fullModelName.replace('models/', '');
  }
  
  return fullModelName;
}

/**
 * Get available models from the API
 * Uses caching to avoid excessive API calls
 */
export async function getAvailableModels(apiKey: string): Promise<Array<{ name: string; displayName: string }>> {
  const now = Date.now();
  
  // Return cached models if still valid
  if (cachedModels && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedModels;
  }
  
  try {
    const url = "https://generativelanguage.googleapis.com/v1/models";
    
    const fetchRes = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
    });

    if (!fetchRes.ok) {
      console.warn('Failed to fetch available models, using fallback');
      return getFallbackModels();
    }

    const data = await fetchRes.json();
    
    if (data.error) {
      console.warn('Error fetching models:', data.error);
      return getFallbackModels();
    }

    const models = data.models || [];
    
    // Filter and format models
    const availableModels = models
      .filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        model.name?.includes('gemini')
      )
      .map((model: any) => ({
        name: extractModelName(model.name),
        displayName: model.displayName || extractModelName(model.name),
        fullName: model.name
      }))
      .sort((a: any, b: any) => {
        // Prioritize newer models
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Prioritize gemini-2.0, then gemini-1.5, then gemini-1.0
        if (aName.includes('gemini-2.0')) return -1;
        if (bName.includes('gemini-2.0')) return 1;
        if (aName.includes('gemini-1.5')) return -1;
        if (bName.includes('gemini-1.5')) return 1;
        if (aName.includes('gemini-1.0')) return -1;
        if (bName.includes('gemini-1.0')) return 1;
        
        return aName.localeCompare(bName);
      });
    
    if (availableModels.length > 0) {
      cachedModels = availableModels;
      cacheTimestamp = now;
      return availableModels;
    }
    
    return getFallbackModels();
  } catch (error) {
    console.error('Error fetching available models:', error);
    return getFallbackModels();
  }
}

/**
 * Get fallback models when API fetch fails
 * These are common model names that might work
 */
function getFallbackModels(): Array<{ name: string; displayName: string }> {
  return [
    { name: 'gemini-1.0-pro', displayName: 'Gemini 1.0 Pro' },
    { name: 'gemini-1.0-pro-latest', displayName: 'Gemini 1.0 Pro Latest' },
    { name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
    { name: 'gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash Latest' },
    { name: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash Experimental' }
  ];
}

/**
 * Get the first available model name
 * Used as default fallback when no model is specified
 */
export async function getDefaultModelName(apiKey: string): Promise<string> {
  try {
    const models = await getAvailableModels(apiKey);
    if (models.length > 0) {
      return models[0].name;
    }
  } catch (error) {
    console.error('Error getting default model:', error);
  }
  
  // Ultimate fallback
  return 'gemini-1.0-pro';
}

/**
 * Validate and normalize model name
 * Extracts model identifier and validates it's a known model
 */
export function normalizeModelName(modelName: string | undefined | null, availableModels?: Array<{ name: string }>): string {
  if (!modelName) {
    return 'gemini-1.0-pro'; // Default fallback
  }
  
  // Extract model name
  let normalized = extractModelName(modelName);
  
  // If we have available models, check if this one exists
  if (availableModels && availableModels.length > 0) {
    const modelExists = availableModels.some(m => 
      extractModelName(m.name) === normalized || m.name === normalized
    );
    
    if (modelExists) {
      return normalized;
    }
    
    // If model doesn't exist, use first available
    console.warn(`Model ${normalized} not found in available models, using ${availableModels[0].name}`);
    return extractModelName(availableModels[0].name);
  }
  
  return normalized;
}

