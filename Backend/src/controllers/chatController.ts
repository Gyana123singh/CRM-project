import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";

// GET /conversations
export async function getConversations(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const threads = await prisma.chatThread.findMany({
      where: {
        lead: { companyId }
      },
      include: {
        lead: true,
        messages: { orderBy: { timestamp: "asc" } }
      },
      orderBy: { updatedAt: "desc" }
    });

    const formatted = threads.map(t => ({
      leadId: t.leadId,
      leadName: t.lead.name,
      phone: t.lead.phone,
      aiAutoReply: t.aiAutoReply,
      status: t.status,
      messages: t.messages.map(m => ({
        id: m.id,
        sender: m.sender.toLowerCase(),
        text: m.text,
        aiResponse: m.aiResponse || null,
        timestamp: m.timestamp.toISOString(),
        channel: m.channel
      }))
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /conversations (Create New Thread)
export async function createThread(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { leadId } = req.body;
  if (!leadId) return res.status(400).json({ error: "Lead ID is required" });

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.companyId !== companyId) {
      return res.status(404).json({ error: "Lead not found in this company workspace" });
    }

    const thread = await prisma.chatThread.upsert({
      where: { leadId },
      update: {},
      create: {
        leadId,
        aiAutoReply: true,
        status: "active"
      },
      include: { lead: true }
    });

    return res.status(200).json({
      leadId: thread.leadId,
      leadName: thread.lead.name,
      phone: thread.lead.phone,
      aiAutoReply: thread.aiAutoReply,
      status: thread.status,
      messages: []
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /conversations/:leadId/messages (Send message)
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { leadId } = req.params;
  const { text, channel } = req.body;

  if (!text) return res.status(400).json({ error: "Message text is required" });

  try {
    const thread = await prisma.chatThread.findUnique({
      where: { leadId },
      include: { lead: true }
    });

    if (!thread || thread.lead.companyId !== companyId) {
      return res.status(404).json({ error: "Conversation thread not found" });
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        sender: "AGENT",
        text,
        channel: channel || "WHATSAPP"
      }
    });

    // If channel is WHATSAPP, try to dispatch the message through Meta's API in real-time
    const finalChannel = channel || "WHATSAPP";
    if (finalChannel === "WHATSAPP") {
      try {
        const waAccount = await prisma.whatsAppAccount.findUnique({
          where: { companyId }
        });

        if (waAccount && waAccount.status === "connected") {
          // Always prefer the live .env token over the potentially stale DB token
          const token = process.env.WHATSAPP_ACCESS_TOKEN || waAccount.accessToken;
          const tokenSource = process.env.WHATSAPP_ACCESS_TOKEN ? ".env" : "database";

          // Phone Number ID: prefer env variable, then apiKey field in DB
          const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || waAccount.apiKey || waAccount.phone.replace(/\D/g, "");
          const phoneIdSource = process.env.WHATSAPP_PHONE_NUMBER_ID ? ".env" : (waAccount.apiKey ? "db.apiKey" : "db.phone");

          const recipientPhone = thread.lead.phone;

          if (!token) {
            console.warn(`[WHATSAPP] No access token found in .env or database for Company: ${companyId}`);
          } else {
            console.log("\n--- [DEBUG WHATSAPP API OUTGOING] ---");
            console.log(`* Linked Company ID: ${companyId}`);
            console.log(`* Meta Phone Number ID: "${phoneId}" (source: ${phoneIdSource})`);
            console.log(`* Meta Access Token (first 20 chars): "${token.substring(0, 20)}..." (source: ${tokenSource})`);
            console.log(`* Recipient Customer Phone (raw): "${recipientPhone}"`);
            console.log("------------------------------------\n");

            const { sendMetaWhatsappMessage } = await import("../utils/whatsappSender");
            await sendMetaWhatsappMessage(phoneId, token, recipientPhone, text);
            console.log(`✅ Dispatched real-time WhatsApp message to ${recipientPhone} via Meta Cloud API.`);
          }
        } else {
          console.warn(`[WHATSAPP] Account not found or not connected for Company: ${companyId}. Status: ${waAccount?.status || 'no account'}`);
        }
      } catch (waErr: any) {
        console.error(`Meta API message transmission failed: ${waErr.message}`);
      }
    }

    try {
      // broadcast new message to workspace subscribers
      const companyId = thread.lead.companyId;
      const payload = {
        leadId: thread.leadId,
        id: message.id,
        sender: "agent",
        text: message.text,
        timestamp: message.timestamp.toISOString(),
        channel: message.channel
      };
      // lazy import to avoid cycles
      const { broadcastToCompany } = await import("../utils/sse");
      broadcastToCompany(companyId, "message_created", payload);
    } catch (err) {
      // ignore
    }

    // Update conversation update timestamp
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() }
    });

    return res.status(201).json({
      id: message.id,
      sender: "agent",
      text: message.text,
      aiResponse: null,
      timestamp: message.timestamp.toISOString(),
      channel: message.channel
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /conversations/:leadId/auto-reply (Toggle AI Auto Reply)
export async function toggleAutoReply(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { leadId } = req.params;

  try {
    const thread = await prisma.chatThread.findUnique({
      where: { leadId },
      include: { lead: true }
    });

    if (!thread || thread.lead.companyId !== companyId) {
      return res.status(404).json({ error: "Conversation thread not found" });
    }

    const updated = await prisma.chatThread.update({
      where: { id: thread.id },
      data: { aiAutoReply: !thread.aiAutoReply }
    });

    return res.status(200).json({ leadId: updated.leadId, aiAutoReply: updated.aiAutoReply });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /conversations/:leadId/messages/:messageId (Edit message text)
export async function editMessage(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { leadId, messageId } = req.params;
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: "Message text is required" });

  try {
    const thread = await prisma.chatThread.findUnique({
      where: { leadId },
      include: { lead: true }
    });

    if (!thread || thread.lead.companyId !== companyId) {
      return res.status(404).json({ error: "Conversation thread not found" });
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.threadId !== thread.id) {
      return res.status(404).json({ error: "Message not found in this conversation" });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { text }
    });

    try {
      const payload = {
        leadId,
        messageId,
        text: updatedMessage.text,
        timestamp: updatedMessage.timestamp.toISOString()
      };
      const { broadcastToCompany } = await import("../utils/sse");
      broadcastToCompany(companyId, "message_edited", payload);
    } catch (err) {
      // ignore
    }

    return res.status(200).json({
      id: updatedMessage.id,
      text: updatedMessage.text,
      timestamp: updatedMessage.timestamp.toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /conversations/:leadId/messages/:messageId (Delete message for everyone)
export async function deleteMessage(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { leadId, messageId } = req.params;

  try {
    const thread = await prisma.chatThread.findUnique({
      where: { leadId },
      include: { lead: true }
    });

    if (!thread || thread.lead.companyId !== companyId) {
      return res.status(404).json({ error: "Conversation thread not found" });
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.threadId !== thread.id) {
      return res.status(404).json({ error: "Message not found in this conversation" });
    }

    await prisma.message.delete({ where: { id: messageId } });

    try {
      const payload = {
        leadId,
        messageId
      };
      const { broadcastToCompany } = await import("../utils/sse");
      broadcastToCompany(companyId, "message_deleted", payload);
    } catch (err) {
      // ignore
    }

    return res.status(200).json({ status: "success", messageId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
