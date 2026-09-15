import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-this-in-production";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "super-admin" | "client-admin" | "team";
    companyId?: string;
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  console.log(`[Auth Middleware] Path: ${req.path}, Authorization Header:`, authHeader);
  if (!authHeader) {
    return res.status(410).json({ error: "Missing authorization token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Unauthorized or expired token" });
  }
}

export function authorizeRoles(roles: Array<"super-admin" | "client-admin" | "team">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: insufficient permission level" });
    }
    next();
  };
}
