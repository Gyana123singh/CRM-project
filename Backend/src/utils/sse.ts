import { Response } from "express";

type Client = { id: string; res: Response };

const clientsByCompany: Map<string, Map<string, Client>> = new Map();

export function addClient(companyId: string, clientId: string, res: Response) {
  if (!clientsByCompany.has(companyId)) clientsByCompany.set(companyId, new Map());
  clientsByCompany.get(companyId)!.set(clientId, { id: clientId, res });
}

export function removeClient(companyId: string, clientId: string) {
  const map = clientsByCompany.get(companyId);
  if (!map) return;
  map.delete(clientId);
  if (map.size === 0) clientsByCompany.delete(companyId);
}

export function broadcastToCompany(companyId: string, event: string, data: any) {
  const map = clientsByCompany.get(companyId);
  if (!map) return;
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  for (const client of map.values()) {
    try {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      // ignore
    }
  }
}

export function listClients() {
  const result: Record<string, number> = {};
  for (const [companyId, map] of clientsByCompany.entries()) result[companyId] = map.size;
  return result;
}
