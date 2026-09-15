import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import pino from "pino";

const logger = pino();

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err);

  // 1. Zod Validation Error Handler
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // 2. Prisma Database Constraint Handlers
  if (err.code && err.code.startsWith("P")) {
    return res.status(409).json({
      error: "Database operation conflict",
      code: err.code,
      message: err.message,
    });
  }

  // 3. Default Global Server Error
  const status = err.status || err.statusCode || 500;
  const message = err.message || "An internal server error occurred";

  res.status(status).json({
    error: message,
  });
};

export { logger };
