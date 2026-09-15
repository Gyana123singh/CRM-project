import { Request, Response } from "express";
import prisma from "../config/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// GET /webhooks/whatsapp (Meta Webhook Verification Handshake)
export async function verifyWhatsappWebhook(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "my_secure_verify_token_123";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WhatsApp Webhook verified successfully with Meta!");
      return res.status(200).send(challenge);
    } else {
      console.warn("WhatsApp Webhook verification failed: Token mismatch.");
      return res.status(403).send("Forbidden: Verification token mismatch.");
    }
  }
  return res.status(400).send("Bad Request: Missing hub.mode or hub.verify_token query parameters.");
}

// POST /webhooks/whatsapp
export async function receiveWhatsappMessage(req: Request, res: Response) {
  let phone = req.body.phone;
  let text = req.body.text;
  let companyId = req.body.companyId;
  let isMetaPayload = false;

  // Check if this is a real Meta WhatsApp Business API webhook payload
  if (req.body.object === "whatsapp_business_account") {
    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (message) {
        isMetaPayload = true;
        phone = message.from; // Customer's phone number
        text = message.text?.body || ""; // Text message body
        
        const displayPhone = value?.metadata?.display_phone_number;
        if (displayPhone) {
          const cleanDisplay = displayPhone.replace(/\D/g, "");
          
          // 1. Try to look up via active WhatsAppAccount records
          const waAccounts = await prisma.whatsAppAccount.findMany({
            where: { status: "connected" }
          });
          
          const matchingAccount = waAccounts.find(a => {
            const cleanAccountPhone = a.phone.replace(/\D/g, "");
            return cleanAccountPhone === cleanDisplay || a.phone === displayPhone;
          });

          if (matchingAccount) {
            companyId = matchingAccount.companyId;
          } else {
            // 2. Fallback to Company records directly
            const companies = await prisma.company.findMany({
              where: { whatsappConnected: true }
            });
            
            const matchingCompany = companies.find(c => {
              const cleanCompanyPhone = c.whatsappPhone ? c.whatsappPhone.replace(/\D/g, "") : "";
              return cleanCompanyPhone === cleanDisplay || c.whatsappPhone === displayPhone;
            });

            if (matchingCompany) {
              companyId = matchingCompany.id;
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error parsing Meta webhook payload:", err);
    }
  }

  // If no companyId or details found, handle responses appropriately
  if (!phone || !text || !companyId) {
    if (isMetaPayload) {
      // Return HTTP 200 to Meta so it stops retrying the webhook
      console.warn(`Meta webhook received but could not map to workspace. Phone: ${phone}, Text: ${text}, Company: ${companyId}`);
      return res.status(200).send("EVENT_RECEIVED_BUT_UNMAPPED");
    }
    return res.status(400).json({ error: "Missing required parameters: phone, text, and companyId" });
  }

  try {
    // 1. Find or create lead for this company
    let lead = await prisma.lead.findFirst({
      where: { companyId, phone }
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          companyId,
          name: `WhatsApp Lead ${phone.slice(-4)}`,
          phone,
          source: "WHATSAPP",
          status: "NEW",
          serviceInterest: "WhatsApp Conversation Inbound"
        }
      });
    }

    // 2. Find or create ChatThread
    let thread = await prisma.chatThread.findUnique({
      where: { leadId: lead.id }
    });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          leadId: lead.id,
          aiAutoReply: true,
          status: "active"
        }
      });
    }

    // 3. Save incoming customer message
    const customerMsg = await prisma.message.create({
      data: {
        threadId: thread.id,
        sender: "CUSTOMER",
        text,
        channel: "WHATSAPP"
      }
    });

    // 4. Update thread timestamp
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() }
    });

    let botReplyText = "";
    // 5. Trigger Gemini RAG if AutoPilot is active
    if (thread.aiAutoReply) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { botPersona: true, botTemperature: true, botAutoPilot: true }
      });

      if (company && company.botAutoPilot) {
        // Fetch KnowledgeBase Q&As (excluding document documents)
        const faqs = await prisma.knowledgeBase.findMany({
          where: { companyId, category: { not: "document" } }
        });
        const contextString = faqs.map(f => `Q: ${f.title}\nA: ${f.content}`).join("\n\n");

        const systemInstructions = `
          ${company.botPersona}
          
          Here is the official knowledge base context:
          ${contextString}
          
          Answer the user's message using only the context above. If you do not know the answer, politely ask them for contact details so a human representative can reach out.
        `;

        try {
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (geminiApiKey && geminiApiKey !== "YOUR_GEMINI_API_KEY_HERE") {
            const ai = new GoogleGenerativeAI(geminiApiKey);
            const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

            const result = await model.generateContent({
              contents: [{ role: "user", parts: [{ text }] }],
              generationConfig: {
                temperature: company.botTemperature ?? 0.5,
              },
              systemInstruction: systemInstructions
            });

            botReplyText = result.response.text();
          } else {
            botReplyText = `[Simulated Gemini Reply] Thank you for your inquiry about "${text}". We have ready-to-move flats in Patia. What is your budget?`;
          }
        } catch (err: any) {
          botReplyText = `[Simulated Gemini Reply] Thank you for your message. An agent will follow up with you shortly.`;
        }

        // Save Bot Reply Message, storing both input and generated response
        const botMsg = await prisma.message.create({
          data: {
            threadId: thread.id,
            sender: "BOT",
            text: botReplyText,
            aiResponse: botReplyText,
            channel: "WHATSAPP"
          }
        });

        try {
          const { broadcastToCompany } = await import("../utils/sse");
          broadcastToCompany(companyId, "message_created", {
            leadId: lead.id,
            id: botMsg.id,
            sender: "bot",
            text: botMsg.text,
            timestamp: botMsg.timestamp.toISOString(),
            channel: botMsg.channel
          });
        } catch (err) {}
      }
    }

    // broadcast customer message as well
    try {
      const { broadcastToCompany } = await import("../utils/sse");
      broadcastToCompany(companyId, "message_created", {
        leadId: lead.id,
        id: customerMsg.id,
        sender: "customer",
        text: customerMsg.text,
        timestamp: customerMsg.timestamp.toISOString(),
        channel: customerMsg.channel
      });
    } catch (err) {}

    return res.status(200).json({
      status: "success",
      customerMessage: text,
      botReplied: botReplyText ? true : false,
      botReply: botReplyText || undefined
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /webhooks/facebook-leads
export async function receiveFacebookLead(req: Request, res: Response) {
  const { name, phone, email, location, serviceInterest, companyId } = req.body;
  if (!name || !phone || !companyId) {
    return res.status(400).json({ error: "Missing required parameters: name, phone, and companyId" });
  }

  try {
    // 1. Create Lead Card
    const lead = await prisma.lead.create({
      data: {
        companyId,
        name,
        phone,
        email,
        location,
        serviceInterest: serviceInterest || "Meta Ads Inbound Campaign Lead",
        source: "META_ADS",
        status: "NEW"
      }
    });

    // 2. Create Chat Thread
    await prisma.chatThread.create({
      data: {
        leadId: lead.id,
        aiAutoReply: true,
        status: "active"
      }
    });

    // 3. Routing Policy Execution
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

    return res.status(201).json({
      status: "success",
      leadId: lead.id,
      assignedTo: assignedAgentId || "Unassigned"
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/ai/chat
export async function handleAIChat(req: Request, res: Response) {
  const { phone, text, companyId } = req.body;
  if (!text || !companyId) {
    return res.status(400).json({ error: "Missing required parameters: text and companyId" });
  }

  try {
    const lookupPhone = phone || "+91 00000 00000";
    let lead = await prisma.lead.findFirst({
      where: { companyId, phone: lookupPhone }
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          companyId,
          name: `Web Chat Visitor`,
          phone: lookupPhone,
          source: "WEBSITE_FORMS",
          status: "NEW",
          serviceInterest: "Web Chat Inbound"
        }
      });
    }

    let thread = await prisma.chatThread.findUnique({
      where: { leadId: lead.id }
    });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          leadId: lead.id,
          aiAutoReply: true,
          status: "active"
        }
      });
    }

    await prisma.message.create({
      data: {
        threadId: thread.id,
        sender: "CUSTOMER",
        text,
        channel: "WEB"
      }
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { botPersona: true, botTemperature: true, botAutoPilot: true }
    });

    const faqs = await prisma.knowledgeBase.findMany({
      where: { companyId, category: { not: "document" } }
    });
    const contextString = faqs.map(f => `Q: ${f.title}\nA: ${f.content}`).join("\n\n");

    const systemInstructions = `
      ${company?.botPersona || "You are a helpful assistant."}
      
      Here is the official knowledge base context:
      ${contextString}
      
      Answer the user's message using only the context above. If you do not know the answer, politely ask them for contact details so a human representative can reach out.
    `;

    let botReplyText = "";
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey && geminiApiKey !== "YOUR_GEMINI_API_KEY_HERE") {
        const ai = new GoogleGenerativeAI(geminiApiKey);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            temperature: company?.botTemperature ?? 0.5,
          },
          systemInstruction: systemInstructions
        });

        botReplyText = result.response.text();
      } else {
        botReplyText = `[Simulated Gemini Web Reply] Thank you for your inquiry about "${text}". We have ready-to-move flats in Patia. What is your budget?`;
      }
    } catch (err: any) {
      botReplyText = `[Simulated Gemini Web Reply] Thank you for your message. An agent will follow up with you shortly.`;
    }

    await prisma.message.create({
      data: {
        threadId: thread.id,
        sender: "BOT",
        text: botReplyText,
        aiResponse: botReplyText,
        channel: "WEB"
      }
    });

    return res.status(200).json({
      status: "success",
      customerMessage: text,
      botReply: botReplyText
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /webhooks/stripe
export async function handleStripeWebhook(req: Request, res: Response) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const isStripeConfigured = stripeSecretKey && stripeSecretKey !== "" && !stripeSecretKey.includes("YOUR_") &&
                             webhookSecret && webhookSecret !== "" && !webhookSecret.includes("YOUR_");

  let event: any;

  if (isStripeConfigured && req.headers["stripe-signature"]) {
    const Stripe = require("stripe");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-04-10"
    });

    const sig = req.headers["stripe-signature"];
    try {
      const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: any) {
      console.warn("Stripe signature verification failed, falling back to body:", err.message);
      event = req.body;
    }
  } else {
    event = req.body;
  }

  // Handle the event
  if (event && (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded")) {
    const session = event.data?.object;
    if (session) {
      const metadata = session.metadata;
      if (metadata && metadata.companyId && metadata.planName) {
        const { companyId, planName, billingPeriod, price } = metadata;
        const priceNum = parseFloat(price || "0");

        try {
          const isCreditPack = planName.endsWith("Credits Pack");

          if (isCreditPack) {
            let creditAmount = 100;
            if (planName.startsWith("500")) creditAmount = 500;
            else if (planName.startsWith("1,500") || planName.startsWith("1500")) creditAmount = 1500;

            // 1. Increment company credits
            await prisma.company.update({
              where: { id: companyId },
              data: { credits: { increment: creditAmount } }
            });

            // 2. Create invoice record
            const invoiceNo = `INV-STRIPE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            await prisma.invoice.create({
              data: {
                companyId,
                invoiceNo,
                date: new Date(),
                amount: `₹${priceNum.toLocaleString("en-IN")}`,
                status: "paid",
                plan: planName
              }
            });

            // 3. Log the audit event
            await prisma.auditLog.create({
              data: {
                category: "BILLING",
                event: `Company purchased ${planName} (+${creditAmount} credits) via Stripe payment`,
                user: "Stripe Webhook",
                ip: req.ip || "127.0.0.1"
              }
            });

            // 4. Broadcast billing update in real-time to active sessions
            try {
              const { broadcastToCompany } = await import("../utils/sse");
              broadcastToCompany(companyId, "billing_updated", {
                planName,
                billingPeriod: "one-time",
                price: String(priceNum),
                creditsUpdated: true
              });
            } catch (err) {}

            console.log(`Successfully processed Stripe payment for company: ${companyId}, added ${creditAmount} credits.`);
          } else {
            // 1. Update company plan
            await prisma.company.update({
              where: { id: companyId },
              data: { plan: planName }
            });

            // 2. Create subscription record
            const startDate = new Date();
            const endDate = new Date();
            if (billingPeriod === "annually") {
              endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
              endDate.setMonth(endDate.getMonth() + 1);
            }

            await prisma.subscription.create({
              data: {
                companyId,
                planName,
                amount: priceNum,
                startDate,
                endDate,
                paymentStatus: "paid"
              }
            });

            // 3. Create invoice record
            const invoiceNo = `INV-STRIPE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            await prisma.invoice.create({
              data: {
                companyId,
                invoiceNo,
                date: new Date(),
                amount: `₹${priceNum.toLocaleString("en-IN")}`,
                status: "paid",
                plan: `${planName} - ${billingPeriod === "annually" ? "Annually" : "Monthly"}`
              }
            });

            // 4. Log the audit event
            await prisma.auditLog.create({
              data: {
                category: "BILLING",
                event: `Company upgraded workspace plan to ${planName} via Stripe payment (${billingPeriod})`,
                user: "Stripe Webhook",
                ip: req.ip || "127.0.0.1"
              }
            });

            // 5. Broadcast billing update in real-time to active sessions
            try {
              const { broadcastToCompany } = await import("../utils/sse");
              broadcastToCompany(companyId, "billing_updated", {
                planName,
                billingPeriod,
                price: String(priceNum)
              });
            } catch (err) {}

            console.log(`Successfully processed Stripe payment for company: ${companyId}, upgraded to ${planName}`);
          }
        } catch (err: any) {
          console.error("Error processing Stripe webhook database updates:", err.message);
          return res.status(500).json({ error: err.message });
        }
      }
    }
  }

  return res.status(200).json({ received: true });
}

