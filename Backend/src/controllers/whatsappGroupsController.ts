import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";

// GET /api/client-admin/whatsapp/groups
export async function getGroups(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const groups = await prisma.whatsappContactGroup.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For dynamic groups, count the matching contacts dynamically
    const formattedGroups = await Promise.all(
      groups.map(async (group) => {
        if (group.isDynamic && group.dynamicRules) {
          const rules = group.dynamicRules as any;
          const filters: any = { companyId, status: "active" };
          
          if (rules.tags && Array.isArray(rules.tags) && rules.tags.length > 0) {
            filters.tags = { hasSome: rules.tags };
          }
          if (rules.countryCode) {
            filters.countryCode = rules.countryCode;
          }

          const dynamicCount = await prisma.whatsappContact.count({ where: filters });
          return {
            ...group,
            contactCount: dynamicCount,
          };
        }

        return {
          ...group,
          contactCount: group._count.contacts,
        };
      })
    );

    return res.status(200).json(formattedGroups);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/client-admin/whatsapp/groups/:id
export async function getGroupDetails(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const group = await prisma.whatsappContactGroup.findFirst({
      where: { id, companyId },
      include: {
        contacts: {
          take: 100, // Limit preview contacts
          orderBy: { firstName: "asc" },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Contact group not found" });
    }

    // If dynamic, fetch contacts dynamically instead
    let contacts = group.contacts;
    if (group.isDynamic && group.dynamicRules) {
      const rules = group.dynamicRules as any;
      const filters: any = { companyId, status: "active" };

      if (rules.tags && Array.isArray(rules.tags) && rules.tags.length > 0) {
        filters.tags = { hasSome: rules.tags };
      }
      if (rules.countryCode) {
        filters.countryCode = rules.countryCode;
      }

      contacts = await prisma.whatsappContact.findMany({
        where: filters,
        orderBy: { firstName: "asc" },
        take: 100,
      });
    }

    return res.status(200).json({
      group,
      contacts,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/groups
export async function createGroup(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, description, isDynamic, dynamicRules, contactIds } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    const data: any = {
      companyId,
      name,
      description,
      isDynamic: !!isDynamic,
      dynamicRules: isDynamic ? dynamicRules || {} : null,
    };

    // If static group and contactIds provided
    if (!isDynamic && contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
      data.contacts = {
        connect: contactIds.map((id: string) => ({ id })),
      };
    }

    const group = await prisma.whatsappContactGroup.create({
      data,
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    return res.status(201).json(group);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/client-admin/whatsapp/groups/:id
export async function updateGroup(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name, description, isDynamic, dynamicRules } = req.body;

  try {
    const existing = await prisma.whatsappContactGroup.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Group not found" });
    }

    const updated = await prisma.whatsappContactGroup.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        isDynamic: isDynamic !== undefined ? !!isDynamic : existing.isDynamic,
        dynamicRules: isDynamic !== undefined 
          ? (isDynamic ? dynamicRules || {} : null)
          : (existing.isDynamic ? dynamicRules || existing.dynamicRules : null),
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /api/client-admin/whatsapp/groups/:id
export async function deleteGroup(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const existing = await prisma.whatsappContactGroup.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Group not found" });
    }

    await prisma.whatsappContactGroup.delete({
      where: { id },
    });

    return res.status(200).json({ success: true, message: "Group deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/groups/:id/assign
export async function assignContacts(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  const { contactIds } = req.body; // Array of contact IDs
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });
  if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({ error: "contactIds array is required" });
  }

  try {
    const group = await prisma.whatsappContactGroup.findFirst({
      where: { id, companyId },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.isDynamic) {
      return res.status(400).json({ error: "Cannot manually assign contacts to a dynamic group" });
    }

    await prisma.whatsappContactGroup.update({
      where: { id },
      data: {
        contacts: {
          connect: contactIds.map((cid: string) => ({ id: cid })),
        },
      },
    });

    return res.status(200).json({ success: true, message: "Contacts assigned to group successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/client-admin/whatsapp/groups/:id/remove
export async function removeContacts(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  const { id } = req.params;
  const { contactIds } = req.body;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });
  if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({ error: "contactIds array is required" });
  }

  try {
    const group = await prisma.whatsappContactGroup.findFirst({
      where: { id, companyId },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.isDynamic) {
      return res.status(400).json({ error: "Cannot manually remove contacts from a dynamic group" });
    }

    await prisma.whatsappContactGroup.update({
      where: { id },
      data: {
        contacts: {
          disconnect: contactIds.map((cid: string) => ({ id: cid })),
        },
      },
    });

    return res.status(200).json({ success: true, message: "Contacts removed from group successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
