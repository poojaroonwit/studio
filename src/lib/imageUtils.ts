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
 * Adds a cache-busting parameter to image URLs to prevent browser caching issues.
 *
 * Important behaviour:
 * - For normal usage (forceRefresh = false) we add a **stable** cache-buster so the
 *   final image URL stays the same across renders. This prevents avatars from
 *   constantly "refreshing" or flickering when components re-render.
 * - For explicit refreshes (forceRefresh = true) we generate a unique value so
 *   browsers are forced to fetch the latest image (e.g. right after upload).
 *
 * @param url - The image URL to add cache busting to
 * @param forceRefresh - If true, forces a new timestamp even if URL already has cache buster
 * @returns The URL with cache-busting parameter
 */
export const addCacheBuster = (url: string, forceRefresh: boolean = false): string => {
  if (!url) return url;

  try {
    const urlObj = new URL(url);

    const hasCb = urlObj.searchParams.has('cb');

    if (forceRefresh) {
      // Strong, one-off cache bust for explicit refreshes (e.g. after avatar upload)
      const timestamp = Date.now();
      // Use crypto for secure random generation when available
      let random: string;
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        random = crypto.randomUUID().replace(/-/g, '').substring(0, 13);
      } else {
        random = Math.random().toString(36).substring(2, 15);
      }
      urlObj.searchParams.set('cb', `${timestamp}-${random}`);
    } else if (!hasCb) {
      // Stable cache buster so the URL remains constant between renders
      // This avoids triggering image reloads unless the underlying URL changes.
      urlObj.searchParams.set('cb', '1');
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
 * Converts a MinIO direct URL to a secure file endpoint URL
 * @param url - The MinIO URL to convert
 * @param isPublic - If true, uses public endpoint (for login page, no auth required)
 * @returns The secure file endpoint URL or the original URL if conversion fails
 */

export interface SecureUrlOptions {
  isPublic?: boolean;
  thumbnail?: boolean;
  width?: number;
  height?: number;
}

/**
 * Converts a MinIO direct URL to a secure file endpoint URL
 * @param url - The MinIO URL to convert
 * @param options - Options or boolean (isPublic) for backward compatibility
 * @returns The secure file endpoint URL or the original URL if conversion fails
 */
export const convertMinIOUrlToSecureUrl = (url: string | null, options: boolean | SecureUrlOptions = false): string | null => {
  if (!url) return null;

  // Normalized options
  const isPublic = typeof options === 'boolean' ? options : options.isPublic || false;
  const thumbnail = typeof options === 'object' ? options.thumbnail : false;
  const width = typeof options === 'object' ? options.width : undefined;
  const height = typeof options === 'object' ? options.height : undefined;

  // If it's a data URL, return as-is (no conversion needed)
  if (url.startsWith('data:')) {
    return url;
  }

  try {
    // If it's already a public endpoint, return as-is
    if (url.includes('/api/public/')) {
      return url;
    }

    // Appender helper for query params
    const appendParams = (baseUrl: string) => {
      let finalUrl = baseUrl;
      if (thumbnail && !finalUrl.includes('thumbnail=')) finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'thumbnail=true';
      if (width && !finalUrl.includes('width=')) finalUrl += (finalUrl.includes('?') ? '&' : '?') + `width=${width}`;
      if (height && !finalUrl.includes('height=')) finalUrl += (finalUrl.includes('?') ? '&' : '?') + `height=${height}`;
      return finalUrl;
    };

    // If it's already a secure endpoint URL, ensure it's relative or matches current origin
    // This fixes issues where DB has 'http://localhost:8021/api/...' but user is on 'https://uat...'
    if (url.includes('/api/secure-file/')) {
      try {
        if (url.startsWith('http')) {
          const urlObj = new URL(url);
          // Only keep the pathname and search params to force relative URL
          return appendParams(urlObj.pathname + urlObj.search);
        }
      } catch (e) {
        // Fallback to original if parsing fails
      }
      return appendParams(url);
    }

    // If it's a secure endpoint URL and we need public, convert it
    if (isPublic && url.includes('/api/secure-file/')) {
      try {
        // Handle both absolute and relative URLs
        let urlObj: URL;
        if (url.startsWith('http')) {
          urlObj = new URL(url);
        } else if (url.startsWith('/')) {
          // Relative URL starting with /
          urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : (process.env.NEXTAUTH_URL || 'http://localhost:8021'));
        } else {
          // Relative URL without /
          urlObj = new URL(`/${url}`, typeof window !== 'undefined' ? window.location.origin : (process.env.NEXTAUTH_URL || 'http://localhost:8021'));
        }

        const filePath = urlObj.searchParams.get('filePath');
        // Allow all settings images (logos, backgrounds, etc.) for public access
        if (filePath && (filePath.startsWith('settings/') || filePath.startsWith('candidate-source-logo/'))) {
          const baseUrl = typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXTAUTH_URL || 'http://localhost:8021';
          
          let publicUrl = `${baseUrl}/api/public/logo?filePath=${encodeURIComponent(filePath)}`;
          
          if (thumbnail || urlObj.searchParams.get('thumbnail') === 'true') publicUrl += '&thumbnail=true';
          if (width || urlObj.searchParams.get('width')) publicUrl += `&width=${width || urlObj.searchParams.get('width')}`;
          if (height || urlObj.searchParams.get('height')) publicUrl += `&height=${height || urlObj.searchParams.get('height')}`;
          
          return publicUrl;
        }
      } catch (urlError) {
        console.warn('[IMAGE-UTILS] Failed to parse secure endpoint URL:', url, urlError);
      }
    }

    // Check if it's a MinIO URL (contains the bucket path)
    // Handle both absolute and relative URLs
    let urlObj: URL;
    try {
      urlObj = url.startsWith('http') ? new URL(url) : new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8021');
    } catch (urlError) {
      console.warn('[IMAGE-UTILS] Failed to parse URL:', url, urlError);
      return url;
    }
    const pathname = urlObj.pathname;

    // Extract file path from MinIO URL
    // Pattern: /studio-production/profile-images/... or /studio-production/settings/...
    const bucketMatch = pathname.match(/\/studio-production\/(.+)$/);
    if (bucketMatch) {
      const filePath = bucketMatch[1];
      // Remove any existing query parameters (like cache busters)
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXTAUTH_URL || 'http://localhost:8021';

      // For public endpoints (login page), use public logo endpoint for all settings images
      // For authenticated endpoints, use secure-file preview
      if (isPublic && (filePath.startsWith('settings/') || filePath.startsWith('candidate-source-logo/'))) {
        let publicUrl = `${baseUrl}/api/public/logo?filePath=${encodeURIComponent(filePath)}`;
        return appendParams(publicUrl);
      }

      // Use relative URL for secure endpoints to ensure cookie compatibility
      let secureUrl = `/api/secure-file/preview?filePath=${encodeURIComponent(filePath)}`;
      return appendParams(secureUrl);
    }

    // Final safety check: ensure the URL is sanitized before returning
    // Check for dangerous protocols that could execute code
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:text/html'];
    const lowerUrl = url ? url.trim().toLowerCase() : '';
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return null;
    }

    // If it's not a MinIO URL, return as-is
    return url;
  } catch (error) {
    // If URL parsing fails, return original URL after a basic safety check
    const dangerousProtocols = ['javascript:', 'vbscript:', 'data:text/html'];
    const lowerUrl = url ? url.trim().toLowerCase() : '';
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return null;
    }
    console.warn('Failed to convert MinIO URL to secure URL:', url, error);
    return url;
  }
};

/**
 * Gets the best available image URL from user data and converts MinIO URLs to secure endpoints
 * @param user - User object with potential image URLs
 * @param options - Options for URL conversion (thumbnail, size etc)
 * @returns The best available image URL (converted to secure endpoint if needed) or null
 */
export const getBestImageUrl = (user: {
  avatarUrl?: string | null;
  image?: string | null;
}, options?: SecureUrlOptions): string | null => {
  // avatarUrl takes precedence over image
  const url = user.avatarUrl || user.image || null;
  if (!url) return null;

  // Convert MinIO URLs to secure endpoints
  return convertMinIOUrlToSecureUrl(url, options);
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
 * Checks if a URL is external (not from our domain)
 * @param url - The URL to check
 * @returns True if the URL is external
 */
const isExternalUrl = (url: string): boolean => {
  if (!url || typeof window === 'undefined') return false;

  try {
    const urlObj = new URL(url, window.location.origin);
    const currentOrigin = window.location.origin;
    return urlObj.origin !== currentOrigin;
  } catch {
    return false;
  }
};

/**
 * Preloads an image to ensure it's cached by the browser
 * @param url - The image URL to preload
 * @param timeout - Timeout in milliseconds (default: 15000ms)
 * @returns Promise that resolves when the image is loaded
 */
export const preloadImage = (url: string, timeout: number = 15000): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }

    const img = new Image();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(url);
    };

    img.onerror = () => {
      cleanup();
      // For external URLs, fail silently to avoid console noise
      // The image will still be attempted to load in the actual img tag
      reject(new Error(`Failed to preload image: ${url}`));
    };

    // Set timeout to prevent hanging
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Image preload timeout: ${url}`));
    }, timeout);

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
  forceRefresh: boolean = false,
  options?: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; thumbnail?: boolean }
): Promise<string | null> => {
  // Determine if we should use thumbnail
  const useThumbnail = options?.thumbnail ?? (options?.size === 'xs' || options?.size === 'sm' || options?.size === 'md');
  const sizeLevel = options?.size;

  const imageUrl = getBestImageUrl(user, { thumbnail: useThumbnail });
  if (!imageUrl) return null;

  const cacheKey = `${user.id}-${imageUrl}-${useThumbnail ? 'thumb' : 'full'}-${sizeLevel || 'auto'}`;
  const now = Date.now();

  // Clean up expired cache entries periodically
  if (now % 5000 === 0) { // Every 5 seconds
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
    // Only log warnings for internal URLs, external URLs (like Unsplash) may fail due to CORS
    // and that's expected - the image will still load in the actual img tag
    if (!isExternalUrl(imageUrl)) {
      console.warn('Failed to preload avatar:', error);
    }
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


