/**
 * Image utility functions for handling profile images and cache busting
 */

// Avatar cache for storing preloaded images
const avatarCache = new Map<string, {
  url: string;
  timestamp: number;
  promise: Promise<string>;
}>();

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached avatars

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
      // Use a more aggressive cache buster with timestamp and random value
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      urlObj.searchParams.set('cb', `${timestamp}-${random}`);
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
export const preloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }

    const img = new Image();
    img.onload = () => resolve(url);
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
    
    // Create a new cache-busted URL
    const cacheBustedUrl = addCacheBuster(url, true);
    
    // Preload the new version
    await preloadImage(cacheBustedUrl);
    
    // Also try to clear from browser cache if possible
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            await cache.delete(url);
            await cache.delete(cacheBustedUrl);
          })
        );
      } catch (cacheError) {
        console.warn('Failed to clear browser cache:', cacheError);
      }
    }
  } catch (error) {
    console.warn('Failed to refresh image:', error);
  }
};

/**
 * Cleans up expired cache entries
 */
const cleanupCache = (): void => {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, entry] of avatarCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach(key => avatarCache.delete(key));

  // If cache is still too large, remove oldest entries
  if (avatarCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(avatarCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, avatarCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => avatarCache.delete(key));
  }
};

/**
 * Gets a cached avatar URL or preloads it if not cached
 * @param user - User object with potential image URLs
 * @param forceRefresh - If true, forces a new cache entry
 * @returns Promise that resolves to the cached/preloaded image URL
 */
export const getCachedAvatarUrl = async (
  user: {
    id: string;
    avatarUrl?: string | null;
    image?: string | null;
  },
  forceRefresh: boolean = false
): Promise<string | null> => {
  const imageUrl = getBestImageUrl(user);
  if (!imageUrl) return null;

  const cacheKey = `${user.id}-${imageUrl}`;
  const now = Date.now();

  // Clean up expired cache entries periodically
  if (now % 30000 === 0) { // Every 30 seconds
    cleanupCache();
  }

  // Check if we have a valid cached entry
  const cached = avatarCache.get(cacheKey);
  if (cached && !forceRefresh && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.url;
  }

  // Create cache-busted URL
  const cacheBustedUrl = addCacheBuster(imageUrl, forceRefresh);

  // Preload the image
  const preloadPromise = preloadImage(cacheBustedUrl).catch(error => {
    console.warn('Failed to preload avatar:', error);
    return imageUrl; // Fallback to original URL
  });

  // Store in cache
  avatarCache.set(cacheKey, {
    url: cacheBustedUrl,
    timestamp: now,
    promise: preloadPromise
  });

  return preloadPromise;
};

/**
 * Preloads multiple avatars for faster loading
 * @param users - Array of user objects
 * @returns Promise that resolves when all avatars are preloaded
 */
export const preloadAvatars = async (users: Array<{
  id: string;
  avatarUrl?: string | null;
  image?: string | null;
}>): Promise<void> => {
  const preloadPromises = users
    .filter(user => getBestImageUrl(user))
    .map(user => getCachedAvatarUrl(user).catch(() => null));

  await Promise.allSettled(preloadPromises);
};

/**
 * Clears all avatar cache
 */
export const clearAvatarCache = (): void => {
  avatarCache.clear();
};

/**
 * Gets cache statistics
 */
export const getAvatarCacheStats = (): {
  size: number;
  maxSize: number;
  duration: number;
} => {
  return {
    size: avatarCache.size,
    maxSize: MAX_CACHE_SIZE,
    duration: CACHE_DURATION
  };
};
