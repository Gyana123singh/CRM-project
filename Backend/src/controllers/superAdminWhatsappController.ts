import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";
import { getQueueStatus } from "../services/whatsappQueueService";

// GET /api/super-admin/whatsapp/stats
export async function getGlobalStats(req: AuthenticatedRequest, res: Response) {
  try {
    const totalTenants = await prisma.company.count();
    const tenantsWithWhatsApp = await prisma.whatsAppAccount.count({ where: { status: "connected" } });
    const totalCampaigns = await prisma.whatsappCampaign.count();
    const runningCampaigns = await prisma.whatsappCampaign.count({ where: { status: "RUNNING" } });
    const totalMessages = await prisma.whatsappMessageLog.count();
    const totalContacts = await prisma.whatsappContact.count();

    const delivered = await prisma.whatsappMessageLog.count({ where: { status: { in: ["DELIVERED", "READ"] } } });
    const failed = await prisma.whatsappMessageLog.count({ where: { status: "FAILED" } });

    return res.status(200).json({
      totalTenants,
      tenantsWithWhatsApp,
      totalCampaigns,
      runningCampaigns,
      totalMessages,
      totalContacts,
      deliveryRate: totalMessages > 0 ? ((delivered / totalMessages) * 100).toFixed(1) : "0.0",
      failRate: totalMessages > 0 ? ((failed / totalMessages) * 100).toFixed(1) : "0.0",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/super-admin/whatsapp/tenants
export async function getTenantUsage(req: AuthenticatedRequest, res: Response) {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        companyName: true,
        plan: true,
        status: true,
        credits: true,
        _count: {
          select: {
            whatsappContacts: true,
            whatsappCampaigns: true,
          },
        },
      },
      orderBy: { companyName: "asc" },
    });

    const tenantData = await Promise.all(
      companies.map(async (c) => {
        const msgCount = await prisma.whatsappMessageLog.count({
          where: { campaign: { companyId: c.id } },
        });
        const waAccount = await prisma.whatsAppAccount.findUnique({
          where: { companyId: c.id },
          select: { status: true, phone: true },
        });

        return {
          id: c.id,
          companyName: c.companyName,
          plan: c.plan,
          status: c.status,
          credits: c.credits,
          contacts: c._count.whatsappContacts,
          campaigns: c._count.whatsappCampaigns,
          messagesSent: msgCount,
          whatsappConnected: waAccount?.status === "connected",
          whatsappPhone: waAccount?.phone || null,
        };
      })
    );

    return res.status(200).json(tenantData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/super-admin/whatsapp/queue
export async function getQueueHealth(req: AuthenticatedRequest, res: Response) {
  try {
    const queueStats = await getQueueStatus();
    return res.status(200).json(queueStats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/super-admin/whatsapp/campaigns/:id/suspend
export async function suspendCampaign(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const campaign = await prisma.whatsappCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await prisma.whatsappCampaign.update({
      where: { id },
      data: { status: "FAILED" },
    });

    return res.status(200).json({ success: true, message: "Campaign suspended by Super Admin" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/super-admin/whatsapp/tenants/:id/restrict
export async function restrictTenant(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { credits } = req.body;

  try {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { credits: credits !== undefined ? credits : 0 },
    });

    return res.status(200).json({ success: true, companyName: updated.companyName, credits: updated.credits });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/super-admin/whatsapp/campaigns
export async function getAllCampaigns(req: AuthenticatedRequest, res: Response) {
  try {
    const campaigns = await prisma.whatsappCampaign.findMany({
      include: {
        company: { select: { companyName: true } },
        template: { select: { name: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.status(200).json(campaigns);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
