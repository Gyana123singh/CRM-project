import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";
import { AppointmentStatus } from "@prisma/client";

// GET /appointments
export async function getAppointments(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const appointments = await prisma.appointment.findMany({
      where: { companyId },
      include: { lead: true },
      orderBy: { appointmentDate: "asc" }
    });

    // Seed mock if empty
    if (appointments.length === 0) {
      const firstLead = await prisma.lead.findFirst({ where: { companyId } });
      if (firstLead) {
        await prisma.appointment.createMany({
          data: [
            {
              companyId,
              leadId: firstLead.id,
              customerName: "Dr. Sunita Rao",
              phone: "+91 94321 09876",
              email: "sunita.rao@healthclinic.in",
              notes: "Needs automated spa booking slots calendar demonstration.",
              appointmentDate: new Date("2026-06-01"),
              appointmentTime: "11:30 AM",
              service: "Clinic Bot Integration Session",
              status: "CONFIRMED"
            },
            {
              companyId,
              leadId: firstLead.id,
              customerName: "Rahul Mohanty",
              phone: "+91 98765 43210",
              email: "rahul.m@gmail.com",
              notes: "Interested in ready-to-move 2BHK flat near Patia.",
              appointmentDate: new Date("2026-06-02"),
              appointmentTime: "02:00 PM",
              service: "Patia Flat Site Viewing",
              status: "PENDING"
            }
          ]
        });
        const seeded = await prisma.appointment.findMany({
          where: { companyId },
          include: { lead: true },
          orderBy: { appointmentDate: "asc" }
        });
        return res.status(200).json(seeded.map(a => ({
          id: a.id,
          customerName: a.customerName,
          phone: a.phone,
          email: a.email || "",
          notes: a.notes || "",
          date: a.appointmentDate.toISOString().split("T")[0],
          timeSlot: a.appointmentTime,
          service: a.service,
          status: String(a.status).toLowerCase()
        })));
      }
    }

    const formatted = appointments.map(a => ({
      id: a.id,
      customerName: a.customerName,
      phone: a.phone,
      email: a.email || "",
      notes: a.notes || "",
      date: a.appointmentDate.toISOString().split("T")[0],
      timeSlot: a.appointmentTime,
      service: a.service,
      status: String(a.status).toLowerCase()
    }));

    return res.status(200).json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /appointments
export async function createAppointment(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { customerName, phone, email, notes, date, timeSlot, service } = req.body;
  if (!customerName || !phone || !date || !timeSlot) {
    return res.status(400).json({ error: "Missing required booking details" });
  }

  try {
    const matchedLead = await prisma.lead.findFirst({
      where: { companyId, phone }
    });

    const appointment = await prisma.appointment.create({
      data: {
        companyId,
        leadId: matchedLead?.id || null,
        customerName,
        phone,
        email: email || null,
        notes: notes || null,
        appointmentDate: new Date(date),
        appointmentTime: timeSlot,
        service: service || "Real Estate Consultation",
        status: "CONFIRMED"
      }
    });

    return res.status(201).json({
      id: appointment.id,
      customerName: appointment.customerName,
      phone: appointment.phone,
      email: appointment.email || "",
      notes: appointment.notes || "",
      date: appointment.appointmentDate.toISOString().split("T")[0],
      timeSlot: appointment.appointmentTime,
      service: appointment.service,
      status: String(appointment.status).toLowerCase()
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /appointments/:id/cancel
export async function cancelAppointment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
    return res.status(200).json({ id: appointment.id, status: String(appointment.status).toLowerCase() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/appointments/slots
export async function getAppointmentSlots(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];

  try {
    const targetDate = new Date(dateStr);
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);

    // 1. Fetch custom slot configuration for this date
    const config = await prisma.appointmentSlotConfig.findFirst({
      where: {
        companyId,
        slotDate: { gte: targetDate, lt: nextDay }
      }
    });

    // Fallback to default slots if not custom configured
    const allSlots = config ? config.slotTimes : ["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];

    // 2. Find booked/confirmed appointments on this date
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

// GET /public/appointments/slots
export async function getPublicAppointmentSlots(req: Request, res: Response) {
  const { companyId, date } = req.query;
  if (!companyId) return res.status(400).json({ error: "Company ID is required" });

  const dateStr = (date as string) || new Date().toISOString().split("T")[0];

  try {
    const targetDate = new Date(dateStr);
    const nextDay = new Date(dateStr);
    nextDay.setDate(nextDay.getDate() + 1);

    // 1. Fetch custom slot config
    const config = await prisma.appointmentSlotConfig.findFirst({
      where: {
        companyId: String(companyId),
        slotDate: { gte: targetDate, lt: nextDay }
      }
    });

    const allSlots = config ? config.slotTimes : ["10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM"];

    // 2. Find booked/confirmed appointments
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        companyId: String(companyId),
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

// POST /public/appointments
export async function createPublicAppointment(req: Request, res: Response) {
  const { companyId, customerName, phone, email, notes, date, timeSlot, service } = req.body;
  if (!companyId || !customerName || !phone || !date || !timeSlot) {
    return res.status(400).json({ error: "Missing required booking details" });
  }

  try {
    // 1. Find or create a Lead
    let matchedLead = await prisma.lead.findFirst({
      where: { companyId, phone }
    });

    let assignedAgentId: string | null = null;

    if (!matchedLead) {
      matchedLead = await prisma.lead.create({
        data: {
          companyId,
          name: customerName,
          phone,
          email: email || null,
          serviceInterest: service || "Public Booking Session",
          message: notes || "Lead registered via public appointment booking.",
          source: "LANDING_PAGES",
          status: "NEW"
        }
      });

      const thread = await prisma.chatThread.create({
        data: {
          leadId: matchedLead.id,
          aiAutoReply: true,
          status: "active"
        }
      });

      const welcomeMsg = await prisma.message.create({
        data: {
          threadId: thread.id,
          sender: "BOT",
          text: `Hi ${customerName}, thank you for scheduling a ${service || "session"} with us! Your appointment is confirmed for ${date} at ${timeSlot}. Our team will connect with you shortly.`,
          channel: "WHATSAPP"
        }
      });

      try {
        const { broadcastToCompany } = require("../utils/sse");
        broadcastToCompany(companyId, "lead_created", {
          id: matchedLead.id,
          name: matchedLead.name,
          phone: matchedLead.phone,
          email: matchedLead.email || "",
          location: "N/A",
          serviceInterest: matchedLead.serviceInterest,
          message: matchedLead.message || "",
          source: "Landing Pages",
          status: "New",
          assignedTo: "Unassigned",
          notes: "",
          createdAt: matchedLead.createdAt.toISOString()
        });

        broadcastToCompany(companyId, "message_created", {
          leadId: matchedLead.id,
          id: welcomeMsg.id,
          sender: "bot",
          text: welcomeMsg.text,
          timestamp: welcomeMsg.timestamp.toISOString(),
          channel: welcomeMsg.channel
        });
      } catch (e) {}

      const companyInfo = await prisma.company.findUnique({
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

      if (activeAgents.length > 0) {
        if (companyInfo?.routingPolicy === "load-balanced") {
          const bestAgent = activeAgents.reduce((prev, curr) =>
            (prev.agentProfile!.leadsCount < curr.agentProfile!.leadsCount) ? prev : curr
          );
          assignedAgentId = bestAgent.id;
        } else {
          const sortedAgents = activeAgents.sort((a, b) =>
            a.agentProfile!.joinedDate.getTime() - b.agentProfile!.joinedDate.getTime()
          );
          assignedAgentId = sortedAgents[0].id;
        }

        await prisma.$transaction([
          prisma.lead.update({
            where: { id: matchedLead.id },
            data: { assignedToId: assignedAgentId }
          }),
          prisma.agentProfile.update({
            where: { userId: assignedAgentId },
            data: { leadsCount: { increment: 1 } }
          })
        ]);
      }

      await prisma.auditLog.create({
        data: {
          category: "AI_ENGINE",
          event: `Captured Lead ${customerName} via Public Booking, assigned to agent: ${assignedAgentId || "Unassigned"}`,
          user: "Public Booking System",
          ip: req.ip || "127.0.0.1"
        }
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        companyId,
        leadId: matchedLead.id,
        customerName,
        phone,
        email: email || null,
        notes: notes || null,
        appointmentDate: new Date(date),
        appointmentTime: timeSlot,
        service: service || "General Meeting",
        status: "CONFIRMED"
      }
    });

    return res.status(201).json({
      id: appointment.id,
      customerName: appointment.customerName,
      phone: appointment.phone,
      email: appointment.email || "",
      notes: appointment.notes || "",
      date: appointment.appointmentDate.toISOString().split("T")[0],
      timeSlot: appointment.appointmentTime,
      service: appointment.service,
      status: String(appointment.status).toLowerCase()
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /public/appointments/meta
export async function getPublicMeta(req: Request, res: Response) {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: "Company ID is required" });

  try {
    const slotConfigs = await prisma.appointmentSlotConfig.findMany({
      where: { companyId: String(companyId) },
      orderBy: { slotDate: "asc" }
    });

    const serviceConfigs = await prisma.appointmentServiceConfig.findMany({
      where: { companyId: String(companyId) },
      orderBy: { name: "asc" }
    });

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        companyId: String(companyId),
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] }
      },
      select: {
        appointmentDate: true,
        appointmentTime: true
      }
    });

    const bookedByDate: Record<string, Set<string>> = {};
    bookedAppointments.forEach(apt => {
      const dateKey = apt.appointmentDate.toISOString().split("T")[0];
      if (!bookedByDate[dateKey]) {
        bookedByDate[dateKey] = new Set();
      }
      bookedByDate[dateKey].add(apt.appointmentTime);
    });

    const formattedSlots = slotConfigs.map(config => {
      const dateKey = config.slotDate.toISOString().split("T")[0];
      const bookedTimes = bookedByDate[dateKey] || new Set();

      const slotsList = config.slotTimes.map(time => ({
        time,
        available: !bookedTimes.has(time)
      }));

      return {
        date: dateKey,
        slots: slotsList
      };
    });

    return res.status(200).json({
      dates: formattedSlots,
      services: serviceConfigs.map(s => s.name)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/appointments/slot-configs
export async function getSlotConfigs(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const configs = await prisma.appointmentSlotConfig.findMany({
      where: { companyId },
      orderBy: { slotDate: "asc" }
    });
    return res.status(200).json(configs.map(c => ({
      id: c.id,
      date: c.slotDate.toISOString().split("T")[0],
      times: c.slotTimes
    })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /client-admin/appointments/slot-configs
export async function saveSlotConfig(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { date, times } = req.body;
  if (!date || !times || !Array.isArray(times)) {
    return res.status(400).json({ error: "Date and times array are required" });
  }

  try {
    const slotDate = new Date(date);
    
    const config = await prisma.appointmentSlotConfig.upsert({
      where: {
        companyId_slotDate: {
          companyId,
          slotDate
        }
      },
      update: {
        slotTimes: times
      },
      create: {
        companyId,
        slotDate,
        slotTimes: times
      }
    });

    return res.status(200).json({
      id: config.id,
      date: config.slotDate.toISOString().split("T")[0],
      times: config.slotTimes
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /client-admin/appointments/slot-configs/:id
export async function deleteSlotConfig(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    await prisma.appointmentSlotConfig.delete({
      where: { id }
    });
    return res.status(200).json({ message: "Slot configuration deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /client-admin/appointments/service-configs
export async function getServiceConfigs(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  try {
    const services = await prisma.appointmentServiceConfig.findMany({
      where: { companyId },
      orderBy: { name: "asc" }
    });
    return res.status(200).json(services);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /client-admin/appointments/service-configs
export async function createServiceConfig(req: AuthenticatedRequest, res: Response) {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(400).json({ error: "Tenant Company ID is missing" });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Service name is required" });

  try {
    const service = await prisma.appointmentServiceConfig.upsert({
      where: {
        companyId_name: {
          companyId,
          name
        }
      },
      update: {},
      create: {
        companyId,
        name
      }
    });
    return res.status(201).json(service);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /client-admin/appointments/service-configs/:id
export async function deleteServiceConfig(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    await prisma.appointmentServiceConfig.delete({
      where: { id }
    });
    return res.status(200).json({ message: "Service type deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
