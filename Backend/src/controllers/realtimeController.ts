import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { addClient, removeClient, listClients } from "../utils/sse";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-this-in-production";

export function subscribe(req: Request, res: Response) {
  // Token may be passed as query param ?token=...
  const token = (req.query.token as string) || (req.headers.authorization || "").split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token for realtime subscription" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const companyId = decoded.companyId || decoded.company;
    if (!companyId) return res.status(400).json({ error: "Token missing companyId" });

    // Set SSE headers
    res.writeHead(200, {
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      "Access-Control-Allow-Origin": "*",
    });

    const clientId = `${decoded.id || "anon"}_${Date.now()}`;
    addClient(companyId, clientId, res);

    // Send initial ping
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ message: "connected" })}\n\n`);

    req.on("close", () => {
      removeClient(companyId, clientId);
    });
  } catch (err: any) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export function getStats(req: Request, res: Response) {
  return res.status(200).json({ clients: listClients() });
}
