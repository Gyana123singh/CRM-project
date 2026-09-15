import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";

// GET /knowledge/faqs
export async function getFAQs(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    // FAQs are stored in KnowledgeBase with category not equal to "document" or specifically categorized
    const faqs = await prisma.knowledgeBase.findMany({
      where: {
        companyId,
        category: { not: "document" }
      }
    });

    if (faqs.length === 0) {
      // Auto seed initial FAQ records
      await prisma.knowledgeBase.createMany({
        data: [
          {
            companyId,
            category: "Services",
            title: "Ready-to-move flats in Patia",
            content: "Yes, we have several prime 2BHK flat options near Patia ranging from ₹55 Lakhs to ₹75 Lakhs with modern amenities like covered parking, high-speed lift, and 24/7 security."
          },
          {
            companyId,
            category: "Pricing",
            title: "Setup and retainer pricing",
            content: "Our software setup cost ranges between ₹25,000 for small businesses to ₹1.5 Lakhs for larger enterprises. Monthly retainers start at ₹5,000 for the Starter Plan, and ₹15,000 for the Growth Plan."
          },
          {
            companyId,
            category: "Policies",
            title: "Refund policy",
            content: "We offer a 100% money-back guarantee within the first 14 days of subscription activation if our integrations fail to meet your specifications."
          }
        ]
      });

      const seeded = await prisma.knowledgeBase.findMany({
        where: { companyId, category: { not: "document" } }
      });

      return res.status(200).json(seeded.map(f => ({
        id: f.id,
        category: f.category,
        question: f.title,
        answer: f.content
      })));
    }

    return res.status(200).json(faqs.map(f => ({
      id: f.id,
      category: f.category,
      question: f.title,
      answer: f.content
    })));

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /knowledge/faqs
export async function createFAQ(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { question, answer, category } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: "Question and answer are required" });
  }

  try {
    const faq = await prisma.knowledgeBase.create({
      data: {
        companyId,
        title: question,
        content: answer,
        category: category || "General"
      }
    });

    return res.status(201).json({
      id: faq.id,
      category: faq.category,
      question: faq.title,
      answer: faq.content
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /knowledge/faqs/:id
export async function deleteFAQ(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    await prisma.knowledgeBase.delete({ where: { id } });
    return res.status(200).json({ message: "FAQ training log deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /knowledge/documents
export async function getDocuments(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const docs = await prisma.knowledgeBase.findMany({
      where: { companyId, category: "document" }
    });

    if (docs.length === 0) {
      await prisma.knowledgeBase.createMany({
        data: [
          { companyId, title: "2BHK_Luxury_Bhubaneswar.pdf", content: "Indexed catalog for Patia Luxury Flats", category: "document", fileUrl: "https://cloudinary.com/infotattva/2BHK_Luxury_Bhubaneswar.pdf" },
          { companyId, title: "CRM_Pricing_Brochure.docx", content: "Setup and subscription details for CRM SaaS", category: "document", fileUrl: "https://cloudinary.com/infotattva/CRM_Pricing_Brochure.docx" }
        ]
      });

      const seeded = await prisma.knowledgeBase.findMany({
        where: { companyId, category: "document" }
      });

      return res.status(200).json(seeded.map(d => ({
        id: d.id,
        name: d.title,
        size: "2.4 MB", // Mocked size since model uses unified structure
        status: "Indexed",
        fileUrl: d.fileUrl
      })));
    }

    return res.status(200).json(docs.map(d => ({
      id: d.id,
      name: d.title,
      size: "1.2 MB",
      status: "Indexed",
      fileUrl: d.fileUrl
    })));

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /knowledge/documents/upload
export async function uploadDocument(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, size, fileUrl } = req.body;
  if (!name) return res.status(400).json({ error: "File name is required" });

  try {
    const doc = await prisma.knowledgeBase.create({
      data: {
        companyId,
        title: name,
        content: `Indexed contents of uploaded file ${name}`,
        category: "document",
        fileUrl: fileUrl || "https://cloudinary.com/uploaded/" + name
      }
    });

    return res.status(201).json({
      id: doc.id,
      name: doc.title,
      size: size || "100 KB",
      status: "Indexed",
      fileUrl: doc.fileUrl
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /knowledge/ai-settings
export async function getAISettings(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        botPersona: true,
        botModel: true,
        botTemperature: true,
        botAutoPilot: true
      }
    });

    if (!company) return res.status(404).json({ error: "Company not found" });

    return res.status(200).json({
      botPersona: company.botPersona || "You are a professional, polite, and helpful AI assistant for Infotattva Business Solutions. Answer customer queries based on the FAQs. Be friendly and collect customer contact details to pass to the sales team.",
      botModel: company.botModel || "Google Gemini 1.5 Pro",
      botTemperature: company.botTemperature ?? 0.5,
      botAutoPilot: company.botAutoPilot ?? true
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /knowledge/ai-settings
export async function updateAISettings(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { botPersona, botModel, botTemperature, botAutoPilot } = req.body;

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        botPersona: botPersona !== undefined ? botPersona : undefined,
        botModel: botModel !== undefined ? botModel : undefined,
        botTemperature: botTemperature !== undefined ? parseFloat(botTemperature) : undefined,
        botAutoPilot: botAutoPilot !== undefined ? !!botAutoPilot : undefined
      }
    });
    return res.status(200).json({
      botPersona: company.botPersona,
      botModel: company.botModel,
      botTemperature: company.botTemperature,
      botAutoPilot: company.botAutoPilot
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /knowledge/whatsapp-templates & POST /knowledge/whatsapp-templates
export async function getTemplates(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const tpls = await prisma.whatsAppTemplate.findMany({ where: { companyId } });
    if (tpls.length === 0) {
      await prisma.whatsAppTemplate.createMany({
        data: [
          {
            companyId,
            name: "meta_ads_welcome_message",
            category: "MARKETING",
            language: "en_US",
            status: "APPROVED",
            bodyText: "Hi {{1}}! Thank you for your inquiry regarding {{2}}. Our representative will assist you shortly. May I know your preferred budget range or specific requirements?"
          },
          {
            companyId,
            name: "appointment_confirmation_alert",
            category: "UTILITY",
            language: "en_US",
            status: "APPROVED",
            bodyText: "Hi {{1}}, your appointment for {{2}} is confirmed for {{3}} at {{4}}. To reschedule or cancel, reply with Reschedule or Cancel."
          },
          {
            companyId,
            name: "missed_followup_reminder",
            category: "UTILITY",
            language: "en_US",
            status: "APPROVED",
            bodyText: "Hi {{1}}, we haven't heard from you! Are you still interested in exploring {{2}} flat options? Let us know if you want to hop on a quick demo call today."
          }
        ]
      });
      return res.status(200).json(await prisma.whatsAppTemplate.findMany({ where: { companyId } }));
    }
    return res.status(200).json(tpls);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createTemplate(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, category, bodyText } = req.body;
  if (!name || !bodyText) {
    return res.status(400).json({ error: "Template name and body text are required" });
  }

  let dbCategory: "MARKETING" | "UTILITY" | "AUTHENTICATION" = "MARKETING";
  if (category === "utility") dbCategory = "UTILITY";
  if (category === "authentication") dbCategory = "AUTHENTICATION";

  try {
    const tpl = await prisma.whatsAppTemplate.create({
      data: {
        companyId,
        name: name.toLowerCase().replace(/\s+/g, "_"),
        category: dbCategory,
        language: "en_US",
        status: "APPROVED",
        bodyText
      }
    });
    return res.status(201).json(tpl);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /knowledge/whatsapp-templates/:id
export async function deleteTemplate(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    await prisma.whatsAppTemplate.delete({ where: { id } });
    return res.status(200).json({ message: "WhatsApp Template deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
