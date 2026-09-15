import { Router } from "express";
import { authenticateJWT } from "../../../../middleware/auth";
import { businessController } from "../controllers/businessController";
import { searchRateLimiter, generalRateLimiter } from "../middlewares/rateLimiter";
import { errorHandler } from "../middlewares/errorHandler";

const router = Router();

// ==========================================
// BUSINESS LEAD FINDER ROUTE REGISTRY
// ==========================================

// Search businesses (throttled)
router.post(
  "/search",
  generalRateLimiter, // general rate limiter for standard checks, search rate limiter handles crawling load
  authenticateJWT,
  businessController.search
);

// Get search history log
router.get(
  "/history",
  generalRateLimiter,
  authenticateJWT,
  businessController.getHistory
);

// Get saved leads list
router.get(
  "/saved",
  generalRateLimiter,
  authenticateJWT,
  businessController.getSaved
);

// Save a business lead
router.post(
  "/save",
  generalRateLimiter,
  authenticateJWT,
  businessController.saveLead
);

// Unsave a business lead
router.delete(
  "/save/:id",
  generalRateLimiter,
  authenticateJWT,
  businessController.unsaveLead
);

// Clear query cache
router.delete(
  "/cache",
  generalRateLimiter,
  authenticateJWT,
  businessController.clearCache
);

// Fetch a single business details by ID
router.get(
  "/:id",
  generalRateLimiter,
  authenticateJWT,
  businessController.getById
);

// Register Module Error Boundary Handler
router.use(errorHandler);

export default router;
