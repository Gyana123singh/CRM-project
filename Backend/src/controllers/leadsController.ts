import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";
import {
  mapLeadStatusToFrontend,
  mapLeadStatusToPrisma,
  mapLeadSourceToFrontend,
  mapLeadSourceToPrisma
} from "../utils/mappers";
import { broadcastToCompany } from "../utils/sse";

// GET /leads
export async function getLeads(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { status, source, search } = req.query;

  try {
    const filters: any = { companyId };

    if (status && status !== "All") {
      filters.status = mapLeadStatusToPrisma(String(status));
    }
    if (source && source !== "All") {
      filters.source = mapLeadSourceToPrisma(String(source));
    }
    if (search) {
      filters.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { phone: { contains: String(search), mode: "insensitive" } },
        { email: { contains: String(search), mode: "insensitive" } },
        { serviceInterest: { contains: String(search), mode: "insensitive" } }
      ];
    }

    const leads = await prisma.lead.findMany({
      where: filters,
      orderBy: { createdAt: "desc" }
    });

    const mapped = leads.map(l => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email || "",
      location: l.location || "N/A",
      serviceInterest: l.serviceInterest,
      message: l.message || "",
      source: mapLeadSourceToFrontend(l.source),
      status: mapLeadStatusToFrontend(l.status),
      assignedTo: l.assignedToId || "Unassigned",
      followUpDate: l.followUpDate ? l.followUpDate.toISOString().split("T")[0] : undefined,
      notes: l.notes || "",
      createdAt: l.createdAt.toISOString()
    }));

    return res.status(200).json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /leads (Manual Add Lead)
export async function createLead(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, phone, email, location, serviceInterest, message, source, assignedTo } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone number are required" });
  }

  try {
    // Check if an agent is specified
    let assignedToId: string | null = null;
    if (assignedTo && assignedTo !== "Unassigned") {
      const user = await prisma.user.findFirst({
        where: { companyId, id: assignedTo }
      });
      if (user) assignedToId = user.id;
    }

    const lead = await prisma.lead.create({
      data: {
        companyId,
        name,
        phone,
        email,
        location,
        serviceInterest: serviceInterest || "AI Integration Consultation",
        message: message || "Manually registered lead inquiry.",
        source: source ? mapLeadSourceToPrisma(String(source)) : "MANUAL_ENTRY",
        status: "NEW",
        assignedToId
      }
    });

    // Broadcast to workspace subscribers that a new lead was created
    try {
      broadcastToCompany(companyId, "lead_created", {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || "",
        location: lead.location || "N/A",
        serviceInterest: lead.serviceInterest,
        message: lead.message || "",
        source: mapLeadSourceToFrontend(lead.source),
        status: mapLeadStatusToFrontend(lead.status),
        assignedTo: lead.assignedToId || "Unassigned",
        notes: lead.notes || "",
        createdAt: lead.createdAt.toISOString()
      });
    } catch (err) {
      // ignore broadcast errors
    }

    // Automatically create a ChatThread for this lead
    await prisma.chatThread.create({
      data: {
        leadId: lead.id,
        aiAutoReply: true,
        status: "active"
      }
    });

    return res.status(201).json({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email || "",
      location: lead.location || "N/A",
      serviceInterest: lead.serviceInterest,
      message: lead.message || "",
      source: mapLeadSourceToFrontend(lead.source),
      status: mapLeadStatusToFrontend(lead.status),
      assignedTo: lead.assignedToId || "Unassigned",
      notes: lead.notes || "",
      createdAt: lead.createdAt.toISOString()
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/leads/create (Lead Capture API - public/external)
export async function captureLead(req: Request, res: Response) {
  const { name, phone, email, location, serviceInterest, message, source, companyId } = req.body;
  if (!name || !phone || !companyId) {
    return res.status(400).json({ error: "Name, phone, and companyId are required" });
  }

  try {
    // 1. Save lead in database
    const lead = await prisma.lead.create({
      data: {
        companyId,
        name,
        phone,
        email,
        location,
        serviceInterest: serviceInterest || "Inbound Web Inquiry",
        message: message || "Automated lead ingestion.",
        source: source ? mapLeadSourceToPrisma(String(source)) : "WEBSITE_FORMS",
        status: "NEW"
      }
    });

    // 2. Create Chat Thread
    const thread = await prisma.chatThread.create({
      data: {
        leadId: lead.id,
        aiAutoReply: true,
        status: "active"
      }
    });

    // 3. Trigger welcome WhatsApp message (Mock / save in chat thread)
    const welcomeMsg = await prisma.message.create({
      data: {
        threadId: thread.id,
        sender: "BOT",
        text: `Hi ${name}, thank you for your interest in our ${serviceInterest || "services"}! Our team has received your request and will contact you shortly.`,
        channel: "WHATSAPP"
      }
    });

    try {
      broadcastToCompany(companyId, "message_created", {
        leadId: lead.id,
        id: welcomeMsg.id,
        sender: "bot",
        text: welcomeMsg.text,
        timestamp: welcomeMsg.timestamp.toISOString(),
        channel: welcomeMsg.channel
      });
    } catch (err) {}

    // 4. Assign lead to team (Auto-routing loop)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { routingPolicy: true }
    });

    const activeAgents = await prisma.user.findMany({
      where: {
        companyId,
        role: "TEAM",
        agentProfile: {
          isActive: true,
          status: { in: ["ONLINE", "BUSY"] }
        }
      },
      include: { agentProfile: true }
    });

    let assignedAgentId: string | null = null;
    if (activeAgents.length > 0) {
      if (company?.routingPolicy === "load-balanced") {
        const bestAgent = activeAgents.reduce((prev, curr) =>
          (prev.agentProfile!.leadsCount < curr.agentProfile!.leadsCount) ? prev : curr
        );
        assignedAgentId = bestAgent.id;
      } else {
        // Round-Robin
        const sortedAgents = activeAgents.sort((a, b) =>
          a.agentProfile!.joinedDate.getTime() - b.agentProfile!.joinedDate.getTime()
        );
        assignedAgentId = sortedAgents[0].id;
      }

      await prisma.$transaction([
        prisma.lead.update({
          where: { id: lead.id },
          data: { assignedToId: assignedAgentId }
        }),
        prisma.agentProfile.update({
          where: { userId: assignedAgentId },
          data: { leadsCount: { increment: 1 } }
        })
      ]);
    }

    // 5. Create automation task (Audit log / mock task)
    await prisma.auditLog.create({
      data: {
        category: "AI_ENGINE",
        event: `Captured Lead ${name} assigned to agent: ${assignedAgentId || "Unassigned"}`,
        user: "Lead API Ingestion",
        ip: req.ip || "127.0.0.1"
      }
    });

    return res.status(201).json({
      success: true,
      message: "Lead captured successfully",
      leadId: lead.id,
      assignedAgentId
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /leads/:id/status
export async function updateLeadStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Status value is required" });

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { status: mapLeadStatusToPrisma(String(status)) }
    });
    try {
      // broadcast status update to company
      const companyId = req.user?.companyId;
      if (companyId) {
        broadcastToCompany(companyId, "lead_updated", {
          id: lead.id,
          status: mapLeadStatusToFrontend(lead.status)
        });
      }
    } catch (err) {
      // ignore
    }
    return res.status(200).json({ id: lead.id, status: mapLeadStatusToFrontend(lead.status) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /leads/:id/notes
export async function updateLeadNotes(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { notes }
    });
    return res.status(200).json({ id: lead.id, notes: lead.notes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /leads/:id/followup
export async function updateLeadFollowUp(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { date } = req.body; // e.g. "2026-06-01"

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { followUpDate: date ? new Date(date) : null }
    });
    return res.status(200).json({ id: lead.id, followUpDate: lead.followUpDate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /leads/:id/assign
export async function assignLead(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { agentId } = req.body;

  try {
    // Validate agent belongs to the same company
    if (agentId) {
      const companyId = req.user?.companyId;
      const agent = await prisma.user.findFirst({
        where: { id: agentId, companyId, role: "TEAM" }
      });
      if (!agent) {
        return res.status(404).json({ error: "Agent not found in this workspace" });
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { assignedToId: agentId || null }
    });

    // Update agent lead count if assigning
    if (agentId) {
      await prisma.agentProfile.update({
        where: { userId: agentId },
        data: { leadsCount: { increment: 1 } }
      });
    }

    return res.status(200).json({
      id: lead.id,
      assignedTo: lead.assignedToId || "Unassigned"
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

