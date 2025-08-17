/**
 * Image utility functions for handling profile images and cache busting
 */

/**
 * Adds a cache-busting parameter to image URLs to prevent browser caching issues
 * @param url - The image URL to add cache busting to
 * @param forceRefresh - If true, forces a new timestamp even if URL already has cache buster
 * @returns The URL with cache-busting parameter
 */
export const addCacheBuster = (url: string, forceRefresh: boolean = false): string => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    
    // If forceRefresh is true or no cache buster exists, add/update it
    if (forceRefresh || !urlObj.searchParams.has('cb')) {
      urlObj.searchParams.set('cb', Date.now().toString());
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn('Failed to parse image URL for cache busting:', url, error);
    return url;
  }
};

/**
 * Removes cache-busting parameters from image URLs
 * @param url - The image URL to clean
 * @returns The URL without cache-busting parameters
 */
export const removeCacheBuster = (url: string): string => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete('cb');
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.warn('Failed to parse image URL for cache buster removal:', url, error);
    return url;
  }
};

/**
 * Validates if a URL is a valid image URL
 * @param url - The URL to validate
 * @returns True if the URL is a valid image URL
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    
    return validExtensions.some(ext => pathname.endsWith(ext));
  } catch (error) {
    return false;
  }
};

/**
 * Gets the best available image URL from user data
 * @param user - User object with potential image URLs
 * @returns The best available image URL or null
 */
export const getBestImageUrl = (user: {
  avatarUrl?: string | null;
  image?: string | null;
}): string | null => {
  // avatarUrl takes precedence over image
  return user.avatarUrl || user.image || null;
};

/**
 * Creates a cache-busted image URL for a user
 * @param user - User object with potential image URLs
 * @param forceRefresh - If true, forces a new timestamp
 * @returns The cache-busted image URL or null
 */
export const getCacheBustedImageUrl = (
  user: {
    avatarUrl?: string | null;
    image?: string | null;
  },
  forceRefresh: boolean = false
): string | null => {
  const imageUrl = getBestImageUrl(user);
  return imageUrl ? addCacheBuster(imageUrl, forceRefresh) : null;
};

/**
 * Preloads an image to ensure it's cached by the browser
 * @param url - The image URL to preload
 * @returns Promise that resolves when the image is loaded
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
};

/**
 * Clears browser cache for a specific image URL
 * @param url - The image URL to clear cache for
 */
export const clearImageCache = (url: string): void => {
  if (!url || typeof window === 'undefined') return;

  try {
    // Create a new image element to force browser to reload
    const img = new Image();
    img.src = addCacheBuster(url, true);
    
    // Also try to clear from browser cache if possible
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.open(cacheName).then(cache => {
            cache.delete(url);
          });
        });
      });
    }
  } catch (error) {
    console.warn('Failed to clear image cache:', error);
  }
};

/**
 * Refreshes an image by clearing cache and preloading the new version
 * @param url - The image URL to refresh
 * @returns Promise that resolves when the image is refreshed
 */
export const refreshImage = async (url: string): Promise<void> => {
  if (!url) return;

  try {
    // Clear existing cache
    clearImageCache(url);
    
    // Preload the new version
    await preloadImage(addCacheBuster(url, true));
  } catch (error) {
    console.warn('Failed to refresh image:', error);
  }
};
