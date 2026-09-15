import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";

// GET /api/client-admin/whatsapp/contacts
export async function getContacts(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { search, tag, status, page = "1", limit = "10" } = req.query;
  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const filters: any = { companyId };

    if (status && status !== "All") {
      filters.status = status;
    }

    if (tag && tag !== "All") {
      filters.tags = { has: String(tag) };
    }

    if (search) {
      filters.OR = [
        { firstName: { contains: String(search), mode: "insensitive" } },
        { lastName: { contains: String(search), mode: "insensitive" } },
        { mobile: { contains: String(search) } },
        { email: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [contacts, totalCount] = await prisma.$transaction([
      prisma.whatsappContact.findMany({
        where: filters,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.whatsappContact.count({ where: filters }),
    ]);

    return res.status(200).json({
      contacts,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/contacts/:id
export async function getContactDetails(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const contact = await prisma.whatsappContact.findFirst({
      where: { id, companyId },
      include: {
        groups: { select: { id: true, name: true } },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            campaign: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    return res.status(200).json(contact);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/contacts
export async function createContact(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { firstName, lastName, mobile, email, countryCode, tags, notes } = req.body;
  if (!firstName || !mobile) {
    return res.status(400).json({ error: "First Name and Mobile Number are required" });
  }

  try {
    // Check if mobile already exists in company
    const existing = await prisma.whatsappContact.findFirst({
      where: { companyId, mobile },
    });
    if (existing) {
      return res.status(409).json({ error: "Contact with this mobile number already exists" });
    }

    const contact = await prisma.whatsappContact.create({
      data: {
        companyId,
        firstName,
        lastName,
        mobile,
        email,
        countryCode: countryCode || "91",
        tags: tags || [],
        notes,
        status: "active",
      },
    });

    return res.status(201).json(contact);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/client-admin/whatsapp/contacts/:id
export async function updateContact(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { firstName, lastName, mobile, email, countryCode, tags, notes, status } = req.body;

  try {
    const existing = await prisma.whatsappContact.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // If changing mobile, make sure it's unique
    if (mobile && mobile !== existing.mobile) {
      const dupe = await prisma.whatsappContact.findFirst({
        where: { companyId, mobile },
      });
      if (dupe) {
        return res.status(409).json({ error: "Mobile number is already assigned to another contact" });
      }
    }

    const updated = await prisma.whatsappContact.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName : existing.firstName,
        lastName: lastName !== undefined ? lastName : existing.lastName,
        mobile: mobile !== undefined ? mobile : existing.mobile,
        email: email !== undefined ? email : existing.email,
        countryCode: countryCode !== undefined ? countryCode : existing.countryCode,
        tags: tags !== undefined ? tags : existing.tags,
        notes: notes !== undefined ? notes : existing.notes,
        status: status !== undefined ? status : existing.status,
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /api/client-admin/whatsapp/contacts/:id
export async function deleteContact(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const existing = await prisma.whatsappContact.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Contact not found" });
    }

    await prisma.whatsappContact.delete({
      where: { id },
    });

    return res.status(200).json({ success: true, message: "Contact deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/contacts/bulk-delete
export async function bulkDeleteContacts(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "IDs array is required and cannot be empty" });
  }

  try {
    const result = await prisma.whatsappContact.deleteMany({
      where: {
        companyId,
        id: { in: ids },
      },
    });

    return res.status(200).json({ success: true, count: result.count });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/contacts/bulk-tag
export async function bulkTagContacts(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { ids, tags, action } = req.body; // action: 'add' | 'remove'
  if (!ids || !Array.isArray(ids) || ids.length === 0 || !tags || !Array.isArray(tags)) {
    return res.status(400).json({ error: "Invalid payload parameters" });
  }

  try {
    const contacts = await prisma.whatsappContact.findMany({
      where: { companyId, id: { in: ids } },
      select: { id: true, tags: true },
    });

    const updates = contacts.map((c) => {
      let newTags = [...c.tags];
      if (action === "add") {
        tags.forEach((t) => {
          if (!newTags.includes(t)) newTags.push(t);
        });
      } else if (action === "remove") {
        newTags = newTags.filter((t) => !tags.includes(t));
      }
      return prisma.whatsappContact.update({
        where: { id: c.id },
        data: { tags: newTags },
      });
    });

    await prisma.$transaction(updates);

    return res.status(200).json({ success: true, count: updates.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/contacts/import
export async function importContacts(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { rows } = req.body; // Array of object: { name, mobile, email, tags }
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "Import list 'rows' is required" });
  }

  try {
    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const errorReport: string[] = [];

    // Pre-fetch all existing mobiles to avoid DB calls in loop
    const existingContacts = await prisma.whatsappContact.findMany({
      where: { companyId },
      select: { mobile: true },
    });
    const existingMobiles = new Set(existingContacts.map((c) => c.mobile));

    const insertData: any[] = [];

    rows.forEach((row: any, idx: number) => {
      let { Name, Mobile, Email, Tags } = row;
      // Also check lowercases if frontend parsed headers literally
      if (!Name) Name = row.name;
      if (!Mobile) Mobile = row.mobile;
      if (!Email) Email = row.email;
      if (!Tags) Tags = row.tags;

      // Sanitization & Validation
      if (!Name || !Mobile) {
        errors++;
        errorReport.push(`Row ${idx + 1}: Name and Mobile are required.`);
        return;
      }

      // Sanitize Mobile (digits only)
      const cleanMobile = String(Mobile).replace(/\D/g, "");
      if (cleanMobile.length < 8 || cleanMobile.length > 15) {
        errors++;
        errorReport.push(`Row ${idx + 1} (${Name}): Invalid mobile number length: ${Mobile}`);
        return;
      }

      // Check duplicates
      if (existingMobiles.has(cleanMobile)) {
        duplicates++;
        return;
      }

      // Parse tags (split comma separated if string)
      let tagsArray: string[] = [];
      if (typeof Tags === "string") {
        tagsArray = Tags.split(",").map((t) => t.trim()).filter(Boolean);
      } else if (Array.isArray(Tags)) {
        tagsArray = Tags.map((t) => String(t).trim()).filter(Boolean);
      }

      // Extract country code if starts with common codes, default "91"
      let countryCode = "91";
      let finalMobile = cleanMobile;
      if (cleanMobile.length > 10) {
        if (cleanMobile.startsWith("91")) {
          countryCode = "91";
          finalMobile = cleanMobile.substring(2);
        } else if (cleanMobile.startsWith("1")) {
          countryCode = "1";
          finalMobile = cleanMobile.substring(1);
        } else {
          // generic fallback: split first 2 digits
          countryCode = cleanMobile.substring(0, 2);
          finalMobile = cleanMobile.substring(2);
        }
      }

      // Separate first and last name
      const nameParts = String(Name).trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || null;

      insertData.push({
        companyId,
        firstName,
        lastName,
        mobile: finalMobile,
        email: Email ? String(Email).trim() : null,
        countryCode,
        tags: tagsArray,
        status: "active",
      });
      
      // Prevent push of duplicate in same batch
      existingMobiles.add(cleanMobile);
    });

    if (insertData.length > 0) {
      await prisma.whatsappContact.createMany({
        data: insertData,
      });
      imported = insertData.length;
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalProcessed: rows.length,
        imported,
        duplicates,
        errors,
      },
      errorReport,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/contacts/export
export async function exportContacts(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const contacts = await prisma.whatsappContact.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    const formatted = contacts.map((c) => ({
      Name: `${c.firstName} ${c.lastName || ""}`.trim(),
      Mobile: `${c.countryCode}${c.mobile}`,
      Email: c.email || "",
      Tags: c.tags.join(", "),
      Status: c.status,
      Notes: c.notes || "",
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/contacts/tags
export async function getUniqueTags(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const contacts = await prisma.whatsappContact.findMany({
      where: { companyId },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    contacts.forEach((c) => {
      c.tags.forEach((t) => tagSet.add(t));
    });

    return res.status(200).json(Array.from(tagSet));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
