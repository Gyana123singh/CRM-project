import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";
import { queueCampaign } from "../services/whatsappQueueService";

// GET /api/client-admin/whatsapp/campaigns
export async function getCampaigns(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const campaigns = await prisma.whatsappCampaign.findMany({
      where: { companyId },
      include: {
        template: { select: { id: true, name: true, category: true } },
        audiences: { select: { id: true, name: true, isDynamic: true } },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(campaigns);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/campaigns/:id
export async function getCampaignDetails(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const campaign = await prisma.whatsappCampaign.findFirst({
      where: { id, companyId },
      include: {
        template: true,
        audiences: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 100, // retrieve first 100 logs
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, mobile: true, countryCode: true } },
          },
        },
        schedules: {
          orderBy: { scheduledTime: "asc" },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Count log statuses for summary dashboard
    const sentCount = await prisma.whatsappMessageLog.count({ where: { campaignId: id, status: "SENT" } });
    const deliveredCount = await prisma.whatsappMessageLog.count({ where: { campaignId: id, status: "DELIVERED" } });
    const readCount = await prisma.whatsappMessageLog.count({ where: { campaignId: id, status: "READ" } });
    const failedCount = await prisma.whatsappMessageLog.count({ where: { campaignId: id, status: "FAILED" } });
    const queuedCount = await prisma.whatsappMessageLog.count({ where: { campaignId: id, status: "QUEUED" } });

    const totalCount = sentCount + deliveredCount + readCount + failedCount + queuedCount;

    return res.status(200).json({
      campaign,
      metrics: {
        total: totalCount,
        queued: queuedCount,
        sent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        failed: failedCount,
        deliveryRate: totalCount > 0 ? ((deliveredCount + readCount) / totalCount) * 100 : 0,
        readRate: totalCount > 0 ? (readCount / totalCount) * 100 : 0,
        failRate: totalCount > 0 ? (failedCount / totalCount) * 100 : 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/campaigns
export async function createCampaign(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, templateId, audienceGroupIds, scheduledTime } = req.body;
  if (!name || !templateId || !audienceGroupIds || !Array.isArray(audienceGroupIds) || audienceGroupIds.length === 0) {
    return res.status(400).json({ error: "Name, templateId, and at least one audience group are required" });
  }

  try {
    const isScheduled = !!scheduledTime;
    const initialStatus = isScheduled ? "SCHEDULED" : "DRAFT";

    const campaign = await prisma.whatsappCampaign.create({
      data: {
        companyId,
        name,
        templateId,
        status: initialStatus,
        scheduledTime: isScheduled ? new Date(scheduledTime) : null,
        audiences: {
          connect: audienceGroupIds.map((gid: string) => ({ id: gid })),
        },
      },
    });

    if (isScheduled) {
      await prisma.whatsappCampaignSchedule.create({
        data: {
          campaignId: campaign.id,
          scheduledTime: new Date(scheduledTime),
          status: "pending",
        },
      });
      console.log(`[WhatsApp Campaigns] Scheduled Campaign ${campaign.id} for ${scheduledTime}`);
    }

    return res.status(201).json(campaign);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/client-admin/whatsapp/campaigns/:id
export async function updateCampaign(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, templateId, audienceGroupIds, scheduledTime } = req.body;

  try {
    const existing = await prisma.whatsappCampaign.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (existing.status !== "DRAFT" && existing.status !== "SCHEDULED") {
      return res.status(400).json({ error: "Can only modify campaigns in Draft or Scheduled status" });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (templateId !== undefined) data.templateId = templateId;
    if (scheduledTime !== undefined) {
      data.scheduledTime = scheduledTime ? new Date(scheduledTime) : null;
      data.status = scheduledTime ? "SCHEDULED" : "DRAFT";
    }

    if (audienceGroupIds && Array.isArray(audienceGroupIds)) {
      data.audiences = {
        set: audienceGroupIds.map((gid: string) => ({ id: gid })),
      };
    }

    const updated = await prisma.whatsappCampaign.update({
      where: { id },
      data,
    });

    // Handle updates to schedules
    if (scheduledTime !== undefined) {
      // Clear existing pending schedules
      await prisma.whatsappCampaignSchedule.deleteMany({
        where: { campaignId: id, status: "pending" },
      });

      if (scheduledTime) {
        await prisma.whatsappCampaignSchedule.create({
          data: {
            campaignId: id,
            scheduledTime: new Date(scheduledTime),
            status: "pending",
          },
        });
      }
    }

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /api/client-admin/whatsapp/campaigns/:id
export async function deleteCampaign(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const existing = await prisma.whatsappCampaign.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await prisma.whatsappCampaign.delete({
      where: { id },
    });

    return res.status(200).json({ success: true, message: "Campaign deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/campaigns/:id/duplicate
export async function duplicateCampaign(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const original = await prisma.whatsappCampaign.findFirst({
      where: { id, companyId },
      include: {
        audiences: { select: { id: true } },
      },
    });

    if (!original) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const copy = await prisma.whatsappCampaign.create({
      data: {
        companyId,
        name: `Copy of ${original.name}`,
        templateId: original.templateId,
        status: "DRAFT",
        scheduledTime: null,
        audiences: {
          connect: original.audiences.map((a) => ({ id: a.id })),
        },
      },
    });

    return res.status(201).json(copy);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/campaigns/:id/send
export async function launchCampaignImmediately(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const campaign = await prisma.whatsappCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status === "RUNNING" || campaign.status === "COMPLETED") {
      return res.status(400).json({ error: "Campaign has already started or completed" });
    }

    // Launch campaign sending via Queue Service
    // Don't await the job run itself, return instantly
    queueCampaign(id, companyId).catch((err) => {
      console.error(`[WhatsApp Campaigns Controller] Failed to run campaign queue:`, err);
    });

    return res.status(200).json({ success: true, status: "RUNNING", message: "Campaign sending initiated" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/campaigns/:id/cancel
export async function cancelCampaign(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const campaign = await prisma.whatsappCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status !== "SCHEDULED") {
      return res.status(400).json({ error: "Only scheduled campaigns can be cancelled" });
    }

    await prisma.$transaction([
      prisma.whatsappCampaign.update({
        where: { id },
        data: { status: "DRAFT", scheduledTime: null },
      }),
      prisma.whatsappCampaignSchedule.updateMany({
        where: { campaignId: id, status: "pending" },
        data: { status: "cancelled" },
      }),
    ]);

    return res.status(200).json({ success: true, status: "DRAFT", message: "Campaign schedule cancelled" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/campaigns/:id/pause
export async function pauseCampaign(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const campaign = await prisma.whatsappCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status !== "RUNNING") {
      return res.status(400).json({ error: "Only actively running campaigns can be paused" });
    }

    const updated = await prisma.whatsappCampaign.update({
      where: { id },
      data: { status: "DRAFT" }, // pausing resets it to draft/paused state
    });

    return res.status(200).json({ success: true, status: "DRAFT", message: "Campaign paused successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/scheduled
export async function getScheduledCampaigns(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const schedules = await prisma.whatsappCampaignSchedule.findMany({
      where: {
        campaign: { companyId },
        status: "pending",
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            template: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledTime: "asc" },
    });

    return res.status(200).json(schedules);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
