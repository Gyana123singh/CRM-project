import rateLimit from "express-rate-limit";

// Rate limiting for scraping and Places lookup endpoints (max 10 requests per 15 minutes per IP)
export const searchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: "Too many search requests. Please wait 15 minutes before searching again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiter for history and saved items (max 100 requests per 15 minutes)
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests. Please throttle your usage.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
