import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";

// GET /api/client-admin/whatsapp/reports/dashboard
export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const [
      totalContacts,
      totalCampaigns,
      totalGroups,
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      totalQueued,
    ] = await prisma.$transaction([
      prisma.whatsappContact.count({ where: { companyId } }),
      prisma.whatsappCampaign.count({ where: { companyId } }),
      prisma.whatsappContactGroup.count({ where: { companyId } }),
      prisma.whatsappMessageLog.count({ where: { campaign: { companyId }, status: "SENT" } }),
      prisma.whatsappMessageLog.count({ where: { campaign: { companyId }, status: "DELIVERED" } }),
      prisma.whatsappMessageLog.count({ where: { campaign: { companyId }, status: "READ" } }),
      prisma.whatsappMessageLog.count({ where: { campaign: { companyId }, status: "FAILED" } }),
      prisma.whatsappMessageLog.count({ where: { campaign: { companyId }, status: "QUEUED" } }),
    ]);

    const totalMessages = totalSent + totalDelivered + totalRead + totalFailed + totalQueued;

    return res.status(200).json({
      totalContacts,
      totalCampaigns,
      totalGroups,
      messages: {
        total: totalMessages,
        sent: totalSent,
        delivered: totalDelivered,
        read: totalRead,
        failed: totalFailed,
        queued: totalQueued,
        deliveryRate: totalMessages > 0 ? (((totalDelivered + totalRead) / totalMessages) * 100).toFixed(1) : "0.0",
        readRate: totalMessages > 0 ? ((totalRead / totalMessages) * 100).toFixed(1) : "0.0",
        failRate: totalMessages > 0 ? ((totalFailed / totalMessages) * 100).toFixed(1) : "0.0",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/reports/campaigns
export async function getCampaignPerformance(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const campaigns = await prisma.whatsappCampaign.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const campaignStats = await Promise.all(
      campaigns.map(async (c) => {
        const delivered = await prisma.whatsappMessageLog.count({ where: { campaignId: c.id, status: { in: ["DELIVERED", "READ"] } } });
        const read = await prisma.whatsappMessageLog.count({ where: { campaignId: c.id, status: "READ" } });
        const failed = await prisma.whatsappMessageLog.count({ where: { campaignId: c.id, status: "FAILED" } });
        const total = c._count.logs;

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          createdAt: c.createdAt,
          totalMessages: total,
          delivered,
          read,
          failed,
          deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : "0.0",
          readRate: total > 0 ? ((read / total) * 100).toFixed(1) : "0.0",
          failRate: total > 0 ? ((failed / total) * 100).toFixed(1) : "0.0",
        };
      })
    );

    return res.status(200).json(campaignStats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/reports/trends
export async function getMessageTrends(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { period = "daily" } = req.query; // daily | weekly | monthly

  try {
    const logs = await prisma.whatsappMessageLog.findMany({
      where: { campaign: { companyId } },
      select: {
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Aggregate by period
    const buckets: Record<string, { sent: number; delivered: number; read: number; failed: number }> = {};

    logs.forEach((log) => {
      let key: string;
      const d = new Date(log.createdAt);
      if (period === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else if (period === "weekly") {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = d.toISOString().split("T")[0];
      }

      if (!buckets[key]) {
        buckets[key] = { sent: 0, delivered: 0, read: 0, failed: 0 };
      }

      if (log.status === "SENT") buckets[key].sent++;
      else if (log.status === "DELIVERED") buckets[key].delivered++;
      else if (log.status === "READ") buckets[key].read++;
      else if (log.status === "FAILED") buckets[key].failed++;
    });

    const trendData = Object.entries(buckets).map(([date, stats]) => ({
      date,
      ...stats,
      total: stats.sent + stats.delivered + stats.read + stats.failed,
    }));

    return res.status(200).json(trendData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/reports/recent-activity
export async function getRecentActivity(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const recentLogs = await prisma.whatsappMessageLog.findMany({
      where: { campaign: { companyId } },
      include: {
        contact: { select: { firstName: true, lastName: true, mobile: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.status(200).json(recentLogs);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
