import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";

// GET /api/client-admin/whatsapp/settings
export async function getSettings(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const account = await prisma.whatsAppAccount.findUnique({
      where: { companyId },
    });

    return res.status(200).json({
      connected: account?.status === "connected",
      account: account || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/settings/connect
export async function connectAccount(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { phone, name, provider, apiKey, accessToken } = req.body;
  if (!phone || !name) {
    return res.status(400).json({ error: "Phone and Name are required" });
  }

  try {
    const existing = await prisma.whatsAppAccount.findUnique({
      where: { companyId },
    });

    if (existing) {
      const updated = await prisma.whatsAppAccount.update({
        where: { companyId },
        data: {
          phone,
          name,
          provider: provider || "Cloud API",
          apiKey: apiKey || existing.apiKey,
          accessToken: accessToken || existing.accessToken,
          status: "connected",
        },
      });
      return res.status(200).json(updated);
    }

    const account = await prisma.whatsAppAccount.create({
      data: {
        companyId,
        phone,
        name,
        provider: provider || "Cloud API",
        apiKey,
        accessToken,
        status: "connected",
      },
    });

    return res.status(201).json(account);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/settings/disconnect
export async function disconnectAccount(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const existing = await prisma.whatsAppAccount.findUnique({
      where: { companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: "No WhatsApp account found" });
    }

    const updated = await prisma.whatsAppAccount.update({
      where: { companyId },
      data: { status: "disconnected" },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/api-keys
export async function getApiKey(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const account = await prisma.whatsAppAccount.findUnique({
      where: { companyId },
      select: { apiKey: true, accessToken: true },
    });

    return res.status(200).json({
      apiKey: account?.apiKey ? `${account.apiKey.substring(0, 8)}...` : null,
      hasAccessToken: !!account?.accessToken,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/api-keys/regenerate
export async function regenerateApiKey(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const newKey = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 18)}`;

    const updated = await prisma.whatsAppAccount.update({
      where: { companyId },
      data: { apiKey: newKey },
    });

    return res.status(200).json({ apiKey: newKey });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/billing
export async function getBillingInfo(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true, credits: true },
    });

    const totalCampaigns = await prisma.whatsappCampaign.count({ where: { companyId } });
    const totalContacts = await prisma.whatsappContact.count({ where: { companyId } });
    const totalMessagesSent = await prisma.whatsappMessageLog.count({
      where: { campaign: { companyId }, status: { in: ["SENT", "DELIVERED", "READ"] } },
    });

    const currentPlan = company?.plan || "Starter Plan";

    let limits = { messages: 10000, campaigns: 50, contacts: 5000 }; // Default: Growth limits
    if (currentPlan.toLowerCase().includes("starter")) {
      limits = { messages: 1000, campaigns: 10, contacts: 500 };
    } else if (currentPlan.toLowerCase().includes("premium")) {
      limits = { messages: 100000, campaigns: 500, contacts: 50000 };
    }

    return res.status(200).json({
      plan: currentPlan,
      credits: company?.credits || 0,
      usage: {
        messagesUsed: totalMessagesSent,
        messagesLimit: limits.messages,
        messagesRemaining: Math.max(0, limits.messages - totalMessagesSent),
        campaignCount: totalCampaigns,
        campaignLimit: limits.campaigns,
        contactCount: totalContacts,
        contactLimit: limits.contacts,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
