import { logger } from './logger.js';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalMemory: number;
}

class AdvancedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 10000;
  private metrics: CacheMetrics = { hits: 0, misses: 0, evictions: 0, totalMemory: 0 };
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 300000);
  }

  set<T>(key: string, value: T, ttl: number = 3600000): void { // Default 1 hour TTL
    try {
      const now = Date.now();
      
      // Evict if at capacity
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      const entry: CacheEntry<T> = {
        value,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now
      };

      this.cache.set(key, entry);
      this.updateMemoryMetrics();
    } catch (error) {
      logger.error('Cache set operation failed', { key, error });
    }
  }

  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key) as CacheEntry<T> | undefined;
      
      if (!entry) {
        this.metrics.misses++;
        return null;
      }

      const now = Date.now();
      
      // Check if expired
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.metrics.misses++;
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = now;
      this.metrics.hits++;

      return entry.value;
    } catch (error) {
      logger.error('Cache get operation failed', { key, error });
      this.metrics.misses++;
      return null;
    }
  }

  // High-performance batch operations
  mget<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }

  // Invalidate cache patterns
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deletedCount = 0;
    
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      deletedCount++;
    });
    
    this.updateMemoryMetrics();
    return deletedCount;
  }

  // Cache warming for critical data
  async warm<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await fetchFn();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('Cache warming failed', { key, error });
      throw error;
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      cleanedCount++;
    });

    if (cleanedCount > 0) {
      logger.info('Cache cleanup completed', { 
        cleanedEntries: cleanedCount,
        remainingEntries: this.cache.size 
      });
      this.updateMemoryMetrics();
    }
  }

  private updateMemoryMetrics(): void {
    // Rough memory estimation
    this.metrics.totalMemory = this.cache.size * 1024; // Estimate 1KB per entry
  }

  getMetrics(): CacheMetrics & { hitRate: number; size: number } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    
    return {
      ...this.metrics,
      hitRate,
      size: this.cache.size
    };
  }

  clear(): void {
    this.cache.clear();
    this.metrics = { hits: 0, misses: 0, evictions: 0, totalMemory: 0 };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

export const cacheManager = new AdvancedCacheManager();