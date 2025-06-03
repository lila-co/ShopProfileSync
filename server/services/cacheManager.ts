
export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private maxCacheSize = 10000;
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Auto-cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: any, ttlMinutes: number = 30): void {
    // Maintain cache size
    if (this.memoryCache.size >= this.maxCacheSize) {
      this.evictOldestEntries(Math.floor(this.maxCacheSize * 0.8));
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get(key: string): any | null {
    const cached = this.memoryCache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
  }

  // Clear cache entries by pattern
  clearByPattern(pattern: string): void {
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, value] of this.memoryCache) {
      if (now - value.timestamp > value.ttl) {
        this.memoryCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }

  private evictOldestEntries(targetSize: number): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, entries.length - targetSize);
    toRemove.forEach(([key]) => this.memoryCache.delete(key));
  }

  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.memoryCache.size,
      maxSize: this.maxCacheSize
    };
  }
}

export const cacheManager = CacheManager.getInstance();
