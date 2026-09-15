import { BusinessRepository } from "../repositories/businessRepository";
import { GooglePlacesService } from "./googlePlacesService";
import { WebsiteScraperService } from "./websiteScraperService";
import { CmsDetectionService } from "./cmsDetectionService";
import { CacheService } from "./cacheService";
import { SearchHistoryService } from "./searchHistoryService";
import { EnrichedBusiness } from "../types";

export class BusinessSearchService {
  constructor(
    private businessRepo: BusinessRepository,
    private placesService: GooglePlacesService,
    private scraperService: WebsiteScraperService,
    private cmsService: CmsDetectionService,
    private cacheService: CacheService,
    private historyService: SearchHistoryService
  ) {}

  /**
   * Search, scrape, detect technology, cache, and save business leads
   */
  async search(
    niche: string,
    region: string,
    platformFilter: string = "Any Platform",
    count: number = 10,
    userId: string | null = null,
    onProgress?: (progress: number, message: string) => void
  ): Promise<any[]> {
    console.log(`[LeadFinder] Search query received: niche="${niche}", region="${region}", platformFilter="${platformFilter}", count=${count}`);
    
    // 1. Check Cache
    const cacheKey = this.cacheService.generateKey(niche, region, platformFilter);
    onProgress?.(10, "Checking local database cache...");
    
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData && cachedData.length > 0) {
      console.log(`[LeadFinder] Cache hit: found ${cachedData.length} cached leads`);
      onProgress?.(100, "Cache hit! Retrieved businesses from database.");
      // Log history even on cache hit
      await this.historyService.log(userId, niche, region, platformFilter, count, cachedData.length);
      return cachedData;
    }

    // 2. Discover businesses using Google Places / OSM / DDG
    onProgress?.(30, `Querying external mapping networks for ${niche} in ${region}...`);
    // Search for twice the limit to ensure we have enough sites to hit the count after filtering
    const searchLimit = platformFilter !== "Any Platform" && platformFilter !== "Custom CMS" ? count * 3 : count;
    console.log(`[LeadFinder] Discovering businesses using placesService (limit=${searchLimit})...`);
    
    let discovered: any[] = [];
    try {
      discovered = await this.placesService.search(niche, region, searchLimit);
      console.log(`[LeadFinder] placesService.search returned ${discovered.length} businesses`);
    } catch (err: any) {
      console.error(`[LeadFinder] placesService.search threw an error:`, err.message || err);
    }

    if (discovered.length === 0) {
      console.log(`[LeadFinder] 0 businesses discovered by placesService, exiting search`);
      onProgress?.(100, "No businesses found for your search criteria.");
      await this.historyService.log(userId, niche, region, platformFilter, count, 0);
      return [];
    }

    onProgress?.(50, `Found ${discovered.length} businesses. Initializing technology crawl...`);
    const results: any[] = [];
    let processedCount = 0;

    // 3. Process and scrape each business
    for (const biz of discovered) {
      processedCount++;
      const currentProgress = 50 + Math.floor((processedCount / discovered.length) * 40); // scales 50% -> 90%
      
      onProgress?.(
        currentProgress,
        `Crawl progress (${processedCount}/${discovered.length}): Scanning ${biz.name}...`
      );

      if (biz.website) {
        try {
          console.log(`[LeadFinder] Crawling and detecting technology for website: ${biz.website}`);
          // Crawl and parse HTML
          const scraped = await this.scraperService.scrape(biz.website);
          
          // Detect CMS and core stack
          const techResult = this.cmsService.detect(scraped.html, scraped.headers);
          
          biz.cms = techResult.cms;
          biz.detectedTechnologies = techResult.technologies;
          biz.socialLinks = scraped.socialLinks;
          
          console.log(`[LeadFinder] Detected CMS: ${biz.cms}, Techs count: ${biz.detectedTechnologies.length}`);

          // Merge contacts extracted
          if (scraped.contacts && scraped.contacts.length > 0) {
            biz.contacts = scraped.contacts;
          }

          // If place has phone, merge it
          if (biz.phone && !biz.contacts.some((c: any) => c.type === "phone")) {
            biz.contacts.push({ type: "phone", value: biz.phone, source: "places" });
          }
        } catch (crawlErr: any) {
          console.error(`[LeadFinder] Failed crawling ${biz.website}:`, crawlErr.message || crawlErr);
        }
      }

      // Filter by platform CMS if specified
      const isPlatformMatch =
        platformFilter === "Any Platform" ||
        (biz.cms && biz.cms.toLowerCase() === platformFilter.toLowerCase());

      // Save to database (persists lead detail anyway, but we filter what we return)
      try {
        console.log(`[LeadFinder] Saving business lead to database: ${biz.name}`);
        const savedBusiness = await this.businessRepo.saveEnrichedBusiness(biz);
        if (isPlatformMatch && results.length < count) {
          results.push(savedBusiness);
        }
      } catch (dbErr) {
        console.error(`[LeadFinder] Failed saving business ${biz.name} to DB:`, dbErr);
      }
    }

    onProgress?.(95, "Caching crawled results and finishing up...");
    
    // 4. Save to Cache
    if (results.length > 0) {
      console.log(`[LeadFinder] Saving search results (count=${results.length}) to cache`);
      await this.cacheService.set(cacheKey, results, 24); // 24-hour TTL
    }

    // 5. Log Search History
    await this.historyService.log(userId, niche, region, platformFilter, count, results.length);

    console.log(`[LeadFinder] Search completed. Returning ${results.length} leads.`);
    onProgress?.(100, `Completed! Discovered ${results.length} matching leads.`);
    return results;
  }
}
