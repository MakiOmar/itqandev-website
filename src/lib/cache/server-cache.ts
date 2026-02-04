/**
 * Simple in-memory cache for server-side routeLoader$ functions
 * Since dashboards aren't for search engines, we can cache aggressively
 * 
 * This cache is per-process and will be cleared on server restart.
 * For production, consider using Redis or a shared cache.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  /**
   * Set a value in cache with TTL (time to live) in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (useful for debugging)
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const serverCache = new ServerCache();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    serverCache.cleanup();
  }, 5 * 60 * 1000);
}
