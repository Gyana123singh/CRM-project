import { Response } from "express";
import { AuthenticatedRequest } from "../../../../middleware/auth"; // import type or existing auth request type
import { BusinessRepository } from "../repositories/businessRepository";
import { GooglePlacesService } from "../services/googlePlacesService";
import { WebsiteScraperService } from "../services/websiteScraperService";
import { CmsDetectionService } from "../services/cmsDetectionService";
import { CacheService } from "../services/cacheService";
import { SearchHistoryService } from "../services/searchHistoryService";
import { BusinessSearchService } from "../services/businessSearchService";
import { searchSchema, saveLeadSchema } from "../validators/searchValidator";
import { logger } from "../middlewares/errorHandler";

export class BusinessController {
  constructor(
    private searchService: BusinessSearchService,
    private businessRepo: BusinessRepository,
    private cacheService: CacheService,
    private historyService: SearchHistoryService
  ) {}

  /**
   * POST /api/business/search
   * Crawl and find leads based on niche, region, platform limit
   */
  search = async (req: AuthenticatedRequest, res: Response, next: any) => {
    const startTime = Date.now();
    try {
      const validated = searchSchema.parse(req.body);
      const userId = req.user?.id || null;

      logger.info(
        `Starting business search: Niche="${validated.niche}", Region="${validated.region}", Platform="${validated.platformFilter}", Limit=${validated.count}`
      );

      const results = await this.searchService.search(
        validated.niche,
        validated.region,
        validated.platformFilter,
        validated.count,
        userId
      );

      // Log performance duration to apiLog
      await this.businessRepo.logApi({
        endpoint: "/api/business/search",
        method: "POST",
        requestBody: JSON.stringify(req.body),
        statusCode: 200,
        duration: Date.now() - startTime,
        ip: req.ip || "127.0.0.1",
        userId: userId || undefined,
      });

      return res.status(200).json(results);
    } catch (err: any) {
      // Log API error details to DB
      await this.businessRepo.logApi({
        endpoint: "/api/business/search",
        method: "POST",
        requestBody: JSON.stringify(req.body),
        responseBody: err.message || JSON.stringify(err),
        statusCode: err.status || 500,
        duration: Date.now() - startTime,
        ip: req.ip || "127.0.0.1",
        userId: req.user?.id || undefined,
      });
      next(err);
    }
  };

  /**
   * GET /api/business/:id
   * Get business profile by ID
   */
  getById = async (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      const { id } = req.params;
      const business = await this.businessRepo.getBusinessById(id);

      if (!business) {
        return res.status(404).json({ error: "Business lead not found" });
      }

      return res.status(200).json(business);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/business/history
   * Get search history
   */
  getHistory = async (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const history = await this.historyService.getHistory(userId);
      return res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/business/saved
   * List saved leads
   */
  getSaved = async (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const savedLeads = await this.businessRepo.getSavedLeads(userId);
      return res.status(200).json(savedLeads);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/business/save
   * Save a business lead
   */
  saveLead = async (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validated = saveLeadSchema.parse(req.body);
      const saved = await this.businessRepo.saveLead(
        userId,
        validated.businessId,
        validated.notes,
        validated.leadListId
      );

      return res.status(201).json({
        message: "Business lead saved successfully",
        savedLead: saved,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/business/save/:id (or POST save with delete flag, but we support DELETE route mapping)
   * Unsave a business lead
   */
  unsaveLead = async (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params; // business ID
      await this.businessRepo.unsaveLead(userId, id);

      return res.status(200).json({
        message: "Business lead unsaved successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/business/cache
   * Flush cached results
   */
  clearCache = async (req: AuthenticatedRequest, res: Response, next: any) => {
    try {
      // Clear cache database tables
      await this.cacheService.purge();
      return res.status(200).json({ message: "Search cache cleared successfully" });
    } catch (err) {
      next(err);
    }
  };
}

// Instantiate Dependency Injection Container Singletons
const businessRepo = new BusinessRepository();
const placesService = new GooglePlacesService();
const scraperService = new WebsiteScraperService();
const cmsService = new CmsDetectionService();
const cacheService = new CacheService(businessRepo);
const historyService = new SearchHistoryService(businessRepo);

export const businessSearchService = new BusinessSearchService(
  businessRepo,
  placesService,
  scraperService,
  cmsService,
  cacheService,
  historyService
);

export const businessController = new BusinessController(
  businessSearchService,
  businessRepo,
  cacheService,
  historyService
);
