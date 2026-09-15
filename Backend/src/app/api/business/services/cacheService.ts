import { BusinessRepository } from "../repositories/businessRepository";

export class CacheService {
  constructor(private businessRepo: BusinessRepository) {}

  /**
   * Generate a unique search cache key based on query filters
   */
  generateKey(niche: string, region: string, platform: string): string {
    const cleanNiche = niche.trim().toLowerCase().replace(/\s+/g, "_");
    const cleanRegion = region.trim().toLowerCase().replace(/\s+/g, "_");
    const cleanPlatform = platform.trim().toLowerCase().replace(/\s+/g, "_");
    return `search:${cleanNiche}:${cleanRegion}:${cleanPlatform}`;
  }

  /**
   * Get cached search results
   */
  async get(key: string): Promise<any[] | null> {
    try {
      return await this.businessRepo.findCachedSearch(key);
    } catch (err) {
      console.error(`Failed to retrieve cache for key ${key}:`, err);
      return null;
    }
  }

  /**
   * Save search results to cache
   */
  async set(key: string, data: any[], ttlHours: number = 24): Promise<void> {
    try {
      await this.businessRepo.saveSearchCache(key, data, ttlHours);
    } catch (err) {
      console.error(`Failed to set cache for key ${key}:`, err);
    }
  }

  /**
   * Purge all search caches
   */
  async purge(): Promise<void> {
    try {
      await this.businessRepo.clearAllCache();
    } catch (err) {
      console.error("Failed to purge search cache:", err);
    }
  }
}
