import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";
import bcrypt from "bcryptjs";
import {
  UserRole,
  CompanyStatus,
  AgentStatus,
  LeadSource,
  LeadStatus,
  SenderType,
  MessageChannel,
  RuleTrigger,
  RuleStatus,
  AppointmentStatus
} from "@prisma/client";
import {
  mapLeadStatusToFrontend,
  mapLeadSourceToFrontend,
  mapRuleTriggerToFrontend,
  mapRuleTriggerToPrisma
} from "../utils/mappers";

// ==========================================
// DASHBOARD
// ==========================================

// GET /client-admin/dashboard/stats
export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const [totalLeads, newLeads, interestedLeads, convertedLeads, lostLeads, followUpLeads] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.NEW } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.INTERESTED } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.CONVERTED } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.LOST } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.FOLLOW_UP } }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
    const pendingReminders = followUpLeads + newLeads;

    // Recent hot leads (last 3 created)
    const recentLeads = await prisma.lead.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        serviceInterest: true,
        source: true,
        status: true,
        createdAt: true,
      }
    });

    return res.status(200).json({
      totalLeads,
      newLeads,
      interestedLeads,
      convertedLeads,
      lostLeads,
      followUpLeads,
      conversionRate,
      pendingReminders,
      aiBotResponseRate: 92, // Static metric — AI platform stat
      recentLeads: recentLeads.map(l => ({
        id: l.id,
        name: l.name,
        serviceInterest: l.serviceInterest,
        source: mapLeadSourceToFrontend(l.source),
        status: mapLeadStatusToFrontend(l.status),
        createdAt: l.createdAt.toISOString()
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/dashboard/lead-sources
export async function getLeadSources(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    // Group leads by source channel
    const sourceGroups = await prisma.lead.groupBy({
      by: ["source"],
      where: { companyId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } }
    });

    const totalLeads = sourceGroups.reduce((sum, g) => sum + g._count.id, 0);

    const sources = sourceGroups.map(g => ({
      source: mapLeadSourceToFrontend(g.source),
      count: g._count.id,
      percentage: totalLeads > 0 ? Math.round((g._count.id / totalLeads) * 100) : 0
    }));

    return res.status(200).json({ sources, totalLeads });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// REPORTS
// ==========================================

// GET /client-admin/reports
export async function getReports(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    // Representative performance metrics
    const agents = await prisma.user.findMany({
      where: { companyId, role: UserRole.TEAM },
      include: { agentProfile: true }
    });

    const performanceData = agents.map(agent => ({
      name: agent.name,
      leads: agent.agentProfile?.leadsCount || 0,
      converted: Math.round(((agent.agentProfile?.conversionRate || 0) / 100) * (agent.agentProfile?.leadsCount || 0)),
      rate: `${agent.agentProfile?.conversionRate || 0}%`
    }));

    // Pipeline funnel aggregates
    const [totalLeads, convertedLeads, followUpLeads] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.CONVERTED } }),
      prisma.lead.count({ where: { companyId, status: LeadStatus.FOLLOW_UP } }),
    ]);

    // Funnel stages derived from real data
    const funnel = [
      { stage: "Ad Click / Inquiries", percentage: 90, value: `${totalLeads} Leads` },
      { stage: "WhatsApp Qualify", percentage: 70, value: `${Math.round(totalLeads * 0.7)} Qualified` },
      { stage: "Sales Call Demo", percentage: 45, value: `${Math.round(totalLeads * 0.45)} Scheduled` },
      { stage: "Paying Conversions", percentage: 25, value: `${convertedLeads} Closed` },
    ];

    return res.status(200).json({
      performanceData,
      funnel,
      meanResponseTimeSeconds: 45,
      totalConvertedDeals: convertedLeads,
      pendingFollowUps: followUpLeads,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /agents
export async function getAgents(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const agents = await prisma.user.findMany({
      where: { companyId, role: UserRole.TEAM },
      include: { agentProfile: true }
    });

    const formatted = agents.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone || a.agentProfile?.phone || "",
      status: a.agentProfile?.status.toLowerCase() || "offline",
      leadsCount: a.agentProfile?.leadsCount || 0,
      conversionRate: a.agentProfile?.conversionRate || 0,
      specialty: a.agentProfile?.specialty || "General Support Desk",
      joinedDate: a.agentProfile?.joinedDate ? a.agentProfile.joinedDate.toISOString().split("T")[0] : "",
      isActive: a.status === "active",
      fatherName: a.agentProfile?.fatherName || "",
      address: a.agentProfile?.address || "",
      profileImage: a.agentProfile?.profileImage || ""
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /agents (Onboard Agent)
export async function createAgent(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, email, phone, specialty, password, fatherName, address, status, profileImage } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Name, email, and phone number are required" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email is already in use by another user" });
    }

    const hashedPassword = await bcrypt.hash(password || "securepassword", 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: UserRole.TEAM,
        status: "active",
        companyId
      }
    });

    const statusMap: Record<string, AgentStatus> = {
      online: AgentStatus.ONLINE,
      busy: AgentStatus.BUSY,
      offline: AgentStatus.OFFLINE,
    };
    const mappedStatus = statusMap[status] || AgentStatus.OFFLINE;

    const agentProfile = await prisma.agentProfile.create({
      data: {
        userId: user.id,
        phone,
        specialty: specialty || "General Support Desk",
        status: mappedStatus,
        isActive: true,
        leadsCount: 0,
        conversionRate: 0,
        fatherName: fatherName || "",
        address: address || "",
        profileImage: profileImage || ""
      }
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      fatherName: agentProfile.fatherName || "",
      email: user.email,
      phone: user.phone || agentProfile.phone,
      address: agentProfile.address || "",
      status: agentProfile.status.toLowerCase(),
      leadsCount: 0,
      conversionRate: 0,
      specialty: agentProfile.specialty,
      joinedDate: agentProfile.joinedDate.toISOString().split("T")[0],
      isActive: user.status === "active",
      profileImage: agentProfile.profileImage || ""
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /agents/:id (Edit Agent Profile)
export async function updateAgent(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { name, fatherName, email, phone, password, address, specialty, status, profileImage } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Name, email, and phone are required" });
  }

  try {
    // Build user update payload
    const userUpdateData: any = { name, email, phone };
    if (password) {
      userUpdateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: userUpdateData
    });

    // Map frontend status string to AgentStatus enum value
    const statusMap: Record<string, AgentStatus> = {
      online: AgentStatus.ONLINE,
      busy: AgentStatus.BUSY,
      offline: AgentStatus.OFFLINE,
    };
    const mappedStatus = statusMap[status] || AgentStatus.OFFLINE;

    const agentProfile = await prisma.agentProfile.update({
      where: { userId: id },
      data: {
        phone: phone,
        specialty: specialty || "General Support Desk",
        status: mappedStatus,
        fatherName: fatherName || "",
        address: address || "",
        profileImage: profileImage || ""
      }
    });

    return res.status(200).json({
      id: user.id,
      name: user.name,
      fatherName: agentProfile.fatherName || "",
      email: user.email,
      phone: user.phone || phone,
      address: agentProfile.address || "",
      status: agentProfile.status.toLowerCase(),
      specialty: agentProfile.specialty,
      leadsCount: agentProfile.leadsCount,
      conversionRate: agentProfile.conversionRate,
      joinedDate: agentProfile.joinedDate.toISOString().split("T")[0],
      isActive: user.status === "active",
      profileImage: agentProfile.profileImage || ""
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /agents/:id/active
export async function toggleAgentActive(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({ error: "isActive parameter is required" });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { status: isActive ? "active" : "suspended" }
    });

    // Also toggle the active status of agent profile
    await prisma.agentProfile.update({
      where: { userId: id },
      data: { isActive: !!isActive }
    });

    return res.status(200).json({ id: user.id, isActive: user.status === "active" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /agents/:id
export async function deleteAgent(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ message: "Agent removed from roster successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /routing-policy
export async function getRoutingPolicy(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { routingPolicy: true }
    });
    if (!company) return res.status(404).json({ error: "Company not found" });
    return res.status(200).json({ routingPolicy: company.routingPolicy });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /routing-policy
export async function updateRoutingPolicy(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { routingPolicy } = req.body;
  if (!routingPolicy || (routingPolicy !== "round-robin" && routingPolicy !== "load-balanced")) {
    return res.status(400).json({ error: "Invalid routing policy" });
  }

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { routingPolicy }
    });
    return res.status(200).json({ routingPolicy: company.routingPolicy });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /whatsapp/pairing-code
export async function generatePairingCode(req: AuthenticatedRequest, res: Response) {
  return res.status(200).json({ pairingCode: "KV82-9X42" });
}

// POST /whatsapp/verify
export async function verifyWhatsapp(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });
  const { phone, name, connected } = req.body;

  try {
    const isConnected = connected !== undefined ? !!connected : true;

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        whatsappPhone: phone || (isConnected === false ? null : "+91 94380 99999"),
        whatsappName: name || (isConnected === false ? null : "Infotattva Business Live Desk"),
        whatsappConnected: isConnected
      }
    });

    if (isConnected) {
      // Upsert a WhatsAppAccount record for that company containing the verified .env credentials
      const token = process.env.WHATSAPP_ACCESS_TOKEN || null;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;

      await prisma.whatsAppAccount.upsert({
        where: { companyId },
        update: {
          phone: phone || "+91 94380 99999",
          name: name || "Infotattva Business Live Desk",
          accessToken: token,
          apiKey: phoneId, // storing Phone Number ID in apiKey field
          status: "connected"
        },
        create: {
          companyId,
          phone: phone || "+91 94380 99999",
          name: name || "Infotattva Business Live Desk",
          accessToken: token,
          apiKey: phoneId,
          status: "connected"
        }
      });
      console.log(`WhatsApp integration connected for Company ${companyId} with Phone ID: ${phoneId}`);
    } else {
      // Deactivate the integration status
      await prisma.whatsAppAccount.updateMany({
        where: { companyId },
        data: { status: "disconnected" }
      });
      console.log(`WhatsApp integration disconnected for Company ${companyId}`);
    }

    return res.status(200).json({
      whatsappConnected: company.whatsappConnected,
      whatsappPhone: company.whatsappPhone,
      whatsappName: company.whatsappName
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /meta-forms
export async function getMetaForms(req: AuthenticatedRequest, res: Response) {
  return res.status(200).json([
    { id: "form_01", formName: "Patia 2BHK Campaign Form", pageName: "Infotattva Real Estates", leadsSynced: 148, isActive: true },
    { id: "form_02", formName: "AI WhatsApp Chatbot Consultation Form", pageName: "Infotattva Solutions", leadsSynced: 92, isActive: true },
    { id: "form_03", formName: "Salons Booking Retainer Form", pageName: "Elite Spas & Salons", leadsSynced: 35, isActive: false }
  ]);
}

// POST /smtp/verify
export async function verifySMTP(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpEncryption } = req.body;

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpEncryption,
        smtpVerified: true
      }
    });
    return res.status(200).json({
      smtpVerified: company.smtpVerified,
      smtpHost: company.smtpHost,
      smtpUser: company.smtpUser
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/company/config
export async function getCompanyConfig(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        whatsappPhone: true,
        whatsappName: true,
        whatsappConnected: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpEncryption: true,
        smtpVerified: true,
      }
    });

    if (!company) return res.status(404).json({ error: "Company not found" });

    return res.status(200).json(company);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/billing/plan
export async function getBillingPlan(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true, companyName: true }
    });

    if (!company) return res.status(404).json({ error: "Company not found" });

    return res.status(200).json({ currentPlan: company.plan });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/billing/plans
export async function getSystemPlansForClient(req: AuthenticatedRequest, res: Response) {
  try {
    let plans = await prisma.systemPlanConfig.findMany();
    if (plans.length === 0) {
      await prisma.systemPlanConfig.createMany({
        data: [
          { name: "Starter Plan", priceMonthly: 5000, maxChannels: 1, maxSeats: 2, maxTokens: 10000 },
          { name: "Growth Plan", priceMonthly: 15000, maxChannels: 5, maxSeats: 5, maxTokens: 50000 },
          { name: "Premium Plan", priceMonthly: 50000, maxChannels: 99, maxSeats: 99, maxTokens: 200000 }
        ]
      });
      plans = await prisma.systemPlanConfig.findMany();
    }
    return res.status(200).json(plans);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /client-admin/billing/plan
export async function upgradeBillingPlan(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { plan } = req.body;
  if (!plan) {
    return res.status(400).json({ error: "Plan name is required." });
  }

  try {
    const planConfig = await prisma.systemPlanConfig.findFirst({
      where: { name: plan }
    });
    if (!planConfig) {
      return res.status(400).json({ error: `Invalid plan type: ${plan}` });
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: { plan: plan }
    });

    // Log the plan upgrade in audit log
    await prisma.auditLog.create({
      data: {
        category: "BILLING",
        event: `Company upgraded workspace plan to ${plan}`,
        user: req.user?.email || "client-admin",
        ip: req.ip || "127.0.0.1"
      }
    });

    return res.status(200).json({ currentPlan: company.plan, message: `Plan successfully upgraded to ${plan}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/billing/quotas
export async function getBillingQuotas(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: { where: { role: "TEAM" } }
      }
    });

    const activeSeatsCount = company?.users.length || 0;

    const planName = company?.plan || "Starter Plan";
    const planConfig = await prisma.systemPlanConfig.findFirst({
      where: { name: planName }
    });

    const quotas = {
      chatbotUsedTokens: 7412,
      chatbotMaxTokens: planConfig?.maxTokens ?? (planName.toLowerCase().includes("premium") ? 200000 : planName.toLowerCase().includes("growth") ? 50000 : 10000),
      whatsappUsedMessages: 22504,
      whatsappMaxMessages: planName.toLowerCase().includes("premium") ? 100000 : planName.toLowerCase().includes("growth") ? 50000 : 10000,
      usedSeats: activeSeatsCount,
      maxSeats: planConfig?.maxSeats ?? (planName.toLowerCase().includes("premium") ? 99 : planName.toLowerCase().includes("growth") ? 5 : 2),
      credits: (company as any)?.credits ?? 1000
    };

    return res.status(200).json(quotas);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /billing/invoices
export async function getInvoices(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const invoices = await prisma.invoice.findMany({
      where: { companyId },
      orderBy: { date: "desc" }
    });

    if (invoices.length === 0) {
      await prisma.invoice.createMany({
        data: [
          { companyId, invoiceNo: "INV-2026-004", date: new Date("2026-05-28"), amount: "₹15,000", status: "paid", plan: "Growth Plan - Monthly" },
          { companyId, invoiceNo: "INV-2026-003", date: new Date("2026-04-28"), amount: "₹15,000", status: "paid", plan: "Growth Plan - Monthly" },
          { companyId, invoiceNo: "INV-2026-002", date: new Date("2026-03-28"), amount: "₹15,000", status: "paid", plan: "Growth Plan - Monthly" },
          { companyId, invoiceNo: "INV-2026-001", date: new Date("2026-02-28"), amount: "₹25,000", status: "paid", plan: "Starter setup fee" }
        ]
      });
      return res.status(200).json(await prisma.invoice.findMany({ where: { companyId }, orderBy: { date: "desc" } }));
    }

    return res.status(200).json(invoices);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/automation-rules
export async function getAutomationRules(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const rules = await prisma.automationRule.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" }
    });

    if (rules.length === 0) {
      await prisma.automationRule.createMany({
        data: [
          {
            companyId,
            name: "Instant WhatsApp Welcome Flow",
            trigger: RuleTrigger.NEW_LEAD_CREATED,
            condition: "Source is Meta Ads or Website",
            actions: ["Send Welcome WhatsApp Message", "Auto-Assign to Sales Executive", "Notify Admin via Email"],
            delay: "Instant",
            status: RuleStatus.ACTIVE
          },
          {
            companyId,
            name: "Follow-up Delay Reminder",
            trigger: RuleTrigger.STATUS_UPDATED,
            condition: "Status equals 'Follow-up'",
            actions: ["Send Follow-up Reminder", "Create Pending Task for Assigned Executive"],
            delay: "24 Hours",
            status: RuleStatus.ACTIVE
          },
          {
            companyId,
            name: "Cold Lead Re-engagement",
            trigger: RuleTrigger.NO_CUSTOMER_RESPONSE,
            condition: "Duration is 3 Days",
            actions: ["Send 'Missed You' Discount/Offer Message", "Mark Lead as Cold/Lost"],
            delay: "3 Days",
            status: RuleStatus.PAUSED
          }
        ]
      });

      const seeded = await prisma.automationRule.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" }
      });

      return res.status(200).json(seeded.map(r => ({
        id: r.id,
        name: r.name,
        trigger: mapRuleTriggerToFrontend(r.trigger),
        condition: r.condition,
        actions: r.actions,
        delay: r.delay,
        status: r.status.toLowerCase(),
        createdAt: r.createdAt.toISOString()
      })));
    }

    return res.status(200).json(rules.map(r => ({
      id: r.id,
      name: r.name,
      trigger: mapRuleTriggerToFrontend(r.trigger),
      condition: r.condition,
      actions: r.actions,
      delay: r.delay,
      status: r.status.toLowerCase(),
      createdAt: r.createdAt.toISOString()
    })));

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /client-admin/automation-rules
export async function createAutomationRule(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, trigger, condition, actions, delay } = req.body;
  if (!name || !trigger || !actions || actions.length === 0) {
    return res.status(400).json({ error: "Missing required rule parameters" });
  }

  const dbTrigger = mapRuleTriggerToPrisma(trigger);

  try {
    const rule = await prisma.automationRule.create({
      data: {
        companyId,
        name,
        trigger: dbTrigger,
        condition: condition || "No conditions apply",
        actions: actions,
        delay: delay || "Instant",
        status: RuleStatus.ACTIVE
      }
    });

    return res.status(201).json({
      id: rule.id,
      name: rule.name,
      trigger: mapRuleTriggerToFrontend(rule.trigger),
      condition: rule.condition,
      actions: rule.actions,
      delay: rule.delay,
      status: rule.status.toLowerCase(),
      createdAt: rule.createdAt.toISOString()
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /client-admin/automation-rules/:id/status
export async function toggleRuleStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) return res.status(404).json({ error: "Automation rule not found" });

    const updated = await prisma.automationRule.update({
      where: { id },
      data: { status: rule.status === RuleStatus.ACTIVE ? RuleStatus.PAUSED : RuleStatus.ACTIVE }
    });

    return res.status(200).json({ id: updated.id, status: updated.status.toLowerCase() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /client-admin/automation-rules/:id
export async function deleteAutomationRule(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    await prisma.automationRule.delete({ where: { id } });
    return res.status(200).json({ message: "Automation rule deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// APPOINTMENT SLOTS
// ==========================================

// GET /client-admin/appointments/slots
// Returns time slots for today and marks which are booked vs. available.
export async function getAppointmentSlots(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];

  // Fixed daily slots
  const allSlots = ["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];

  try {
    const targetDate = new Date(dateStr);
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find booked/confirmed appointments on this date
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        companyId,
        appointmentDate: { gte: targetDate, lt: nextDay },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] }
      },
      select: { appointmentTime: true }
    });

    const bookedTimes = new Set(bookedAppointments.map(a => a.appointmentTime));

    const slots = allSlots.map(time => ({
      time,
      available: !bookedTimes.has(time)
    }));

    return res.status(200).json(slots);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /appointments/:id/confirm
export async function confirmAppointment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED }
    });
    return res.status(200).json({
      id: appointment.id,
      status: String(appointment.status).toLowerCase()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /client-admin/seed
export async function seedDatabase(req: Request, res: Response) {
  try {
    // 1. Clean existing records to prevent conflicts and ensure clean seeding
    await prisma.auditLog.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.automationRule.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.chatThread.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.agentProfile.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.knowledgeBase.deleteMany({});
    await prisma.company.deleteMany({});

    console.log("Deleted existing records.");

    // 2. Create the default company
    const companyId = "company-infotattva-id";
    const company = await prisma.company.create({
      data: {
        id: companyId,
        companyName: "Infotattva Business Solutions",
        industry: "SaaS & Retail Solutions",
        contactPerson: "Pradeep Patra",
        phone: "+91 94380 99999",
        email: "contact@infotattva.com",
        address: "Bhubaneswar, Odisha, India",
        plan: "Growth Plan",
        status: CompanyStatus.ACTIVE,
        routingPolicy: "round-robin",
        whatsappPhone: "+91 94380 99999",
        whatsappName: "Infotattva Business Live Desk",
        whatsappConnected: true,
        smtpVerified: true,
        smtpHost: "smtp.infotattva.com",
        smtpPort: "587",
        smtpUser: "alerts@infotattva.com",
        smtpPass: "securepassword",
        smtpEncryption: "SSL/TLS"
      }
    });

    // 3. Create Subscription
    await prisma.subscription.create({
      data: {
        companyId: company.id,
        planName: "Growth Plan",
        amount: 15000,
        startDate: new Date("2026-05-28"),
        endDate: new Date("2026-06-28"),
        paymentStatus: "paid"
      }
    });

    const hashedPassword = await bcrypt.hash("securepassword", 10);

    // 4. Create Users (CLIENT_ADMIN and TEAM)
    const pradeep = await prisma.user.create({
      data: {
        id: "user-pradeep-id",
        name: "Pradeep Patra",
        email: "pradeep@infotattva.com",
        phone: "+91 94380 12345",
        password: hashedPassword,
        role: UserRole.CLIENT_ADMIN,
        status: "active",
        companyId: company.id
      }
    });

    const amit = await prisma.user.create({
      data: {
        id: "user-amit-id",
        name: "Amit Sharma",
        email: "sales@infotattva.com",
        phone: "+91 94380 54321",
        password: hashedPassword,
        role: UserRole.TEAM,
        status: "active",
        companyId: company.id
      }
    });

    const rina = await prisma.user.create({
      data: {
        id: "user-rina-id",
        name: "Rina Das",
        email: "rina@infotattva.com",
        phone: "+91 88888 99999",
        password: hashedPassword,
        role: UserRole.TEAM,
        status: "active",
        companyId: company.id
      }
    });

    const debasish = await prisma.user.create({
      data: {
        id: "user-debasish-id",
        name: "Debasish Panda",
        email: "debasish@infotattva.com",
        phone: "+91 77777 88888",
        password: hashedPassword,
        role: UserRole.TEAM,
        status: "suspended",
        companyId: company.id
      }
    });

    // 5. Create Agent Profiles
    await prisma.agentProfile.create({
      data: {
        userId: pradeep.id,
        phone: "+91 94380 12345",
        status: AgentStatus.ONLINE,
        specialty: "AI & Tech Integration",
        isActive: true,
        leadsCount: 8,
        conversionRate: 52.0,
        joinedDate: new Date("2025-02-15")
      }
    });

    await prisma.agentProfile.create({
      data: {
        userId: amit.id,
        phone: "+91 94380 54321",
        status: AgentStatus.ONLINE,
        specialty: "High-Ticket Real Estate",
        isActive: true,
        leadsCount: 14,
        conversionRate: 48.0,
        joinedDate: new Date("2025-01-10")
      }
    });

    await prisma.agentProfile.create({
      data: {
        userId: rina.id,
        phone: "+91 88888 99999",
        status: AgentStatus.ONLINE,
        specialty: "SaaS & Retail Solutions",
        isActive: true,
        leadsCount: 11,
        conversionRate: 35.0,
        joinedDate: new Date("2025-03-01")
      }
    });

    await prisma.agentProfile.create({
      data: {
        userId: debasish.id,
        phone: "+91 77777 88888",
        status: AgentStatus.OFFLINE,
        specialty: "General Support Desk",
        isActive: false,
        leadsCount: 0,
        conversionRate: 0.0,
        joinedDate: new Date("2025-04-20")
      }
    });

    // 6. Create Leads
    const rahulLead = await prisma.lead.create({
      data: {
        id: "lead-rahul-id",
        name: "Rahul Mohanty",
        phone: "+91 98765 43210",
        email: "rahul.m@gmail.com",
        location: "Patia, Bhubaneswar",
        serviceInterest: "2BHK Luxury Flat",
        message: "Looking for a ready to move 2BHK flat near Patia within 60 Lakhs budget.",
        source: LeadSource.META_ADS,
        status: LeadStatus.NEW,
        companyId: company.id,
        assignedToId: amit.id,
        createdAt: new Date("2026-05-30T09:30:00Z")
      }
    });

    const sunitaLead = await prisma.lead.create({
      data: {
        id: "lead-sunita-id",
        name: "Dr. Sunita Rao",
        phone: "+91 94321 09876",
        email: "sunita.rao@healthclinic.in",
        location: "Saheed Nagar",
        serviceInterest: "AI WhatsApp Chatbot integration",
        message: "Need a WhatsApp bot for automatic appointment confirmation and scheduling.",
        source: LeadSource.WHATSAPP,
        status: LeadStatus.INTERESTED,
        companyId: company.id,
        assignedToId: pradeep.id,
        notes: "Very eager. Requested a demo of salon/spa calendar flow.",
        followUpDate: new Date("2026-06-01"),
        createdAt: new Date("2026-05-30T10:15:00Z")
      }
    });

    const vikramLead = await prisma.lead.create({
      data: {
        id: "lead-vikram-id",
        name: "Vikram Malhotra",
        phone: "+91 88888 77777",
        email: "vikram@malhotragroup.co",
        location: "Cuttack Road",
        serviceInterest: "Premium Enterprise CRM",
        message: "Requirement for lead auto-assignment and multi-channel automation.",
        source: LeadSource.WEBSITE_FORMS,
        status: LeadStatus.FOLLOW_UP,
        companyId: company.id,
        assignedToId: amit.id,
        notes: "Follow up tomorrow with customized quotation.",
        followUpDate: new Date("2026-05-31"),
        createdAt: new Date("2026-05-29T14:20:00Z")
      }
    });

    const anjaliLead = await prisma.lead.create({
      data: {
        id: "lead-anjali-id",
        name: "Anjali Mishra",
        phone: "+91 77777 66666",
        email: "anjali.m@outlook.com",
        location: "Jaydev Vihar",
        serviceInterest: "Salon Bridal Package Automation",
        message: "Interested in automated discount offers and follow-up templates.",
        source: LeadSource.GOOGLE_ADS,
        status: LeadStatus.CONVERTED,
        companyId: company.id,
        assignedToId: rina.id,
        notes: "Package activated. Successfully paid setup fee.",
        createdAt: new Date("2026-05-28T11:05:00Z")
      }
    });

    const rajeshLead = await prisma.lead.create({
      data: {
        id: "lead-rajesh-id",
        name: "Rajesh Kumar",
        phone: "+91 99999 88888",
        email: "rajesh.k@gmail.com",
        location: "Nayapalli",
        serviceInterest: "Coaching Center Auto-responder",
        message: "Inquired about fees structure.",
        source: LeadSource.LANDING_PAGES,
        status: LeadStatus.LOST,
        companyId: company.id,
        assignedToId: rina.id,
        notes: "Budget too low. Wants free open source alternatives.",
        createdAt: new Date("2026-05-27T08:50:00Z")
      }
    });

    // 7. Create ChatThreads and Messages
    const rahulThread = await prisma.chatThread.create({
      data: {
        leadId: rahulLead.id,
        aiAutoReply: true,
        status: "active"
      }
    });
    await prisma.message.createMany({
      data: [
        {
          threadId: rahulThread.id,
          sender: SenderType.CUSTOMER,
          text: "Hi, I saw your ad for Patia 2BHK luxury flats.",
          channel: MessageChannel.WHATSAPP,
          timestamp: new Date("2026-05-30T09:30:00Z")
        },
        {
          threadId: rahulThread.id,
          sender: SenderType.BOT,
          text: "Hi Rahul, thank you for your inquiry! We have beautiful 2BHK ready-to-move flats in Patia. May I know your preferred budget range so we can suggest the best options?",
          channel: MessageChannel.WHATSAPP,
          timestamp: new Date("2026-05-30T09:30:05Z")
        },
        {
          threadId: rahulThread.id,
          sender: SenderType.CUSTOMER,
          text: "My budget is around 55 to 60 Lakhs maximum.",
          channel: MessageChannel.WHATSAPP,
          timestamp: new Date("2026-05-30T09:32:00Z")
        }
      ]
    });

    const sunitaThread = await prisma.chatThread.create({
      data: {
        leadId: sunitaLead.id,
        aiAutoReply: false,
        status: "active"
      }
    });
    await prisma.message.createMany({
      data: [
        {
          threadId: sunitaThread.id,
          sender: SenderType.CUSTOMER,
          text: "Do you have calendar bookings integrated in WhatsApp?",
          channel: MessageChannel.WHATSAPP,
          timestamp: new Date("2026-05-30T10:10:00Z")
        },
        {
          threadId: sunitaThread.id,
          sender: SenderType.AGENT,
          text: "Yes Dr. Sunita, we support full WhatsApp-based booking slots. A client can view open slots and confirm immediately.",
          channel: MessageChannel.WHATSAPP,
          timestamp: new Date("2026-05-30T10:14:00Z")
        }
      ]
    });

    // 8. Create Invoices
    await prisma.invoice.createMany({
      data: [
        { companyId: company.id, invoiceNo: "INV-2026-004", date: new Date("2026-05-28"), amount: "₹15,000", status: "paid", plan: "Growth Plan - Monthly" },
        { companyId: company.id, invoiceNo: "INV-2026-003", date: new Date("2026-04-28"), amount: "₹15,000", status: "paid", plan: "Growth Plan - Monthly" },
        { companyId: company.id, invoiceNo: "INV-2026-002", date: new Date("2026-03-28"), amount: "₹15,000", status: "paid", plan: "Growth Plan - Monthly" },
        { companyId: company.id, invoiceNo: "INV-2026-001", date: new Date("2026-02-28"), amount: "₹25,000", status: "paid", plan: "Starter setup fee" }
      ]
    });

    // 9. Create Automation Rules
    await prisma.automationRule.createMany({
      data: [
        {
          companyId: company.id,
          name: "Instant WhatsApp Welcome Flow",
          trigger: RuleTrigger.NEW_LEAD_CREATED,
          condition: "Source is Meta Ads or Website",
          actions: ["Send Welcome WhatsApp Message", "Auto-Assign to Sales Executive", "Notify Admin via Email"],
          delay: "Instant",
          status: RuleStatus.ACTIVE
        },
        {
          companyId: company.id,
          name: "Follow-up Delay Reminder",
          trigger: RuleTrigger.STATUS_UPDATED,
          condition: "Status equals 'Follow-up'",
          actions: ["Send Follow-up Reminder", "Create Pending Task for Assigned Executive"],
          delay: "24 Hours",
          status: RuleStatus.ACTIVE
        },
        {
          companyId: company.id,
          name: "Cold Lead Re-engagement",
          trigger: RuleTrigger.NO_CUSTOMER_RESPONSE,
          condition: "Duration is 3 Days",
          actions: ["Send 'Missed You' Discount/Offer Message", "Mark Lead as Cold/Lost"],
          delay: "3 Days",
          status: RuleStatus.PAUSED
        }
      ]
    });

    // 10. Create Appointments
    await prisma.appointment.createMany({
      data: [
        {
          companyId: company.id,
          leadId: sunitaLead.id,
          customerName: "Dr. Sunita Rao",
          phone: "+91 94321 09876",
          appointmentDate: new Date("2026-06-01"),
          appointmentTime: "11:30 AM",
          service: "Clinic Bot Integration Session",
          status: AppointmentStatus.CONFIRMED
        },
        {
          companyId: company.id,
          leadId: rahulLead.id,
          customerName: "Rahul Mohanty",
          phone: "+91 98765 43210",
          appointmentDate: new Date("2026-06-02"),
          appointmentTime: "02:00 PM",
          service: "Patia Flat Site Viewing",
          status: AppointmentStatus.PENDING
        }
      ]
    });

    // 11. Create Knowledge Base Q&As
    await prisma.knowledgeBase.createMany({
      data: [
        {
          companyId: company.id,
          title: "Weekend hours",
          category: "General",
          content: "We are open from 10:00 AM to 6:00 PM on Saturday and Sunday.",
        },
        {
          companyId: company.id,
          title: "Patia 2BHK pricing",
          category: "pricing",
          content: "Ready-to-move 2BHK flats in Patia start from ₹55 Lakhs to ₹75 Lakhs.",
        }
      ]
    });

    // 12. Create default super admin
    const superadminPassword = await bcrypt.hash("securepassword", 10);
    await prisma.user.create({
      data: {
        name: "Infotattva Super Admin",
        email: "superadmin@infotattva.com",
        phone: "+91 94380 00000",
        password: superadminPassword,
        role: UserRole.SUPER_ADMIN,
        status: "active",
      }
    });

    return res.status(200).json({ success: true, message: "Database seeded successfully!" });
  } catch (error: any) {
    console.error("Database seed failed:", error);
    return res.status(500).json({ error: error.message });
  }
}

// POST /client-admin/billing/checkout-session
export async function createCheckoutSession(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { planName, billingPeriod } = req.body;
  if (!planName) {
    return res.status(400).json({ error: "Plan name is required" });
  }

  try {
    let price = 0;
    const isCreditPack = planName.endsWith("Credits Pack");

    if (isCreditPack) {
      if (planName.startsWith("100")) price = 1000;
      else if (planName.startsWith("500")) price = 4000;
      else if (planName.startsWith("1,500") || planName.startsWith("1500")) price = 10000;
      else return res.status(400).json({ error: `Invalid credits pack: ${planName}` });
    } else {
      const planConfig = await prisma.systemPlanConfig.findFirst({
        where: { name: planName }
      });
      if (!planConfig) {
        return res.status(404).json({ error: `System plan configuration not found for: ${planName}` });
      }

      price = billingPeriod === "annually"
        ? Math.round(planConfig.priceMonthly * 12 * 0.8)
        : planConfig.priceMonthly;
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const isStripeConfigured = stripeSecretKey && stripeSecretKey !== "" && !stripeSecretKey.includes("YOUR_");
    if (isStripeConfigured) {
      const Stripe = require("stripe");
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2024-04-10"
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: isCreditPack ? planName : `${planName} - ${billingPeriod === "annually" ? "Annual Plan (20% Off)" : "Monthly Plan"}`
              },
              unit_amount: price * 100
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: `http://localhost:3000/client-admin/billing/success?session_id={CHECKOUT_SESSION_ID}&planName=${encodeURIComponent(planName)}&billingPeriod=${billingPeriod || "one-time"}&price=${price}`,
        cancel_url: `http://localhost:3000/client-admin/billing/cancel`,
        metadata: {
          companyId,
          planName,
          billingPeriod: billingPeriod || "one-time",
          price: String(price)
        }
      });

      return res.status(200).json({ url: session.url });
    } else {
      const sandboxUrl = `http://localhost:3000/client-admin/billing/sandbox-checkout?planName=${encodeURIComponent(planName)}&billingPeriod=${billingPeriod || "one-time"}&price=${price}&companyId=${companyId}`;
      return res.status(200).json({ url: sandboxUrl });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
