import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../config/db";
import bcrypt from "bcryptjs";

// GET /companies
export async function getCompanies(req: AuthenticatedRequest, res: Response) {
  try {
    const companies = await prisma.company.findMany({
      include: {
        leads: { select: { id: true } },
        subscriptions: {
          orderBy: { startDate: "desc" },
          take: 1
        }
      }
    });

    const mapped = companies.map(c => {
      const activeSub = c.subscriptions[0];
      return {
        id: c.id,
        name: c.companyName,
        industry: c.industry,
        contactPerson: c.contactPerson,
        email: c.email,
        plan: c.plan,
        status: c.status.toLowerCase(),
        leadsCount: c.leads.length,
        planPrice: activeSub ? activeSub.amount : null,
        planUpgradedDate: activeSub ? activeSub.startDate.toISOString() : null,
        credits: c.credits
      };
    });

    return res.status(200).json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /companies (Register Tenant)
export async function createCompany(req: AuthenticatedRequest, res: Response) {
  const { name, industry, plan, email, phone, address, password, credits } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  try {
    const existing = await prisma.company.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Company email is already registered" });
    }

    const company = await prisma.company.create({
      data: {
        companyName: name,
        industry: industry || "Real Estate",
        contactPerson: "Company Admin",
        email,
        phone,
        address,
        plan: plan || "Starter Plan",
        status: "ACTIVE",
        credits: credits !== undefined ? Number(credits) : 1000
      }
    });

    // Create a client admin account automatically
    const hashedPassword = await bcrypt.hash(password || "securepassword", 10);
    await prisma.user.create({
      data: {
        name: "Workspace Admin",
        email,
        phone,
        password: hashedPassword,
        role: "CLIENT_ADMIN",
        status: "active",
        companyId: company.id
      }
    });

    // Create a subscription record for this company
    const planConfig = await prisma.systemPlanConfig.findFirst({
      where: { name: plan || "Starter Plan" }
    });
    const basePrice = planConfig?.priceMonthly ?? 5000;
    await prisma.subscription.create({
      data: {
        companyId: company.id,
        planName: plan || "Starter Plan",
        amount: basePrice,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        paymentStatus: "paid"
      }
    });

    // Log the event
    await prisma.auditLog.create({
      data: {
        category: "TENANTS",
        event: `New Tenant Company ${name} registered`,
        user: req.user?.email || "System",
        ip: req.ip || "127.0.0.1"
      }
    });

    return res.status(201).json({
      id: company.id,
      name: company.companyName,
      industry: company.industry,
      contactPerson: company.contactPerson,
      email: company.email,
      plan: plan,
      status: "active",
      leadsCount: 0,
      planPrice: basePrice,
      planUpgradedDate: new Date().toISOString(),
      credits: company.credits
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /companies/:id/status
export async function toggleCompanyStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body; // active or suspended

  if (!status || (status !== "active" && status !== "suspended")) {
    return res.status(400).json({ error: "Invalid status format" });
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: { status: status === "active" ? "ACTIVE" : "SUSPENDED" }
    });

    // Log the event
    await prisma.auditLog.create({
      data: {
        category: "SECURITY",
        event: `Client Workspace ${company.companyName} status updated to ${status}`,
        user: req.user?.email || "System",
        ip: req.ip || "127.0.0.1"
      }
    });

    return res.status(200).json({ id: company.id, status: company.status.toLowerCase() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /system-plans
export async function getSystemPlans(req: AuthenticatedRequest, res: Response) {
  try {
    let plans = await prisma.systemPlanConfig.findMany();
    if (plans.length === 0) {
      // Auto seed pricing configs
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

// PATCH /system-plans/:id
export async function updateSystemPlan(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { priceMonthly, maxChannels, maxSeats, maxTokens } = req.body;

  try {
    const updated = await prisma.systemPlanConfig.update({
      where: { id },
      data: {
        priceMonthly: priceMonthly !== undefined ? parseFloat(priceMonthly) : undefined,
        maxChannels: maxChannels !== undefined ? parseInt(maxChannels) : undefined,
        maxSeats: maxSeats !== undefined ? parseInt(maxSeats) : undefined,
        maxTokens: maxTokens !== undefined ? parseInt(maxTokens) : undefined
      }
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /system-plans
export async function createSystemPlan(req: AuthenticatedRequest, res: Response) {
  const { name, priceMonthly, maxChannels, maxSeats, maxTokens } = req.body;
  if (!name || priceMonthly === undefined || maxChannels === undefined || maxSeats === undefined || maxTokens === undefined) {
    return res.status(400).json({ error: "Missing required fields for system plan configuration" });
  }

  try {
    const existing = await prisma.systemPlanConfig.findUnique({
      where: { name }
    });
    if (existing) {
      return res.status(400).json({ error: "A plan with this name already exists" });
    }

    const created = await prisma.systemPlanConfig.create({
      data: {
        name,
        priceMonthly: parseFloat(priceMonthly),
        maxChannels: parseInt(maxChannels),
        maxSeats: parseInt(maxSeats),
        maxTokens: parseInt(maxTokens)
      }
    });

    // Log the plan creation in audit log
    await prisma.auditLog.create({
      data: {
        category: "BILLING",
        event: `Super Admin created new system plan: ${name}`,
        user: req.user?.email || "Super Admin",
        ip: req.ip || "127.0.0.1"
      }
    });

    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /system-plans/:id
export async function deleteSystemPlan(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    const plan = await prisma.systemPlanConfig.findUnique({
      where: { id }
    });
    if (!plan) {
      return res.status(404).json({ error: "System plan configuration not found" });
    }

    await prisma.systemPlanConfig.delete({
      where: { id }
    });

    // Log the plan deletion in audit log
    await prisma.auditLog.create({
      data: {
        category: "BILLING",
        event: `Super Admin deleted system plan: ${plan.name}`,
        user: req.user?.email || "Super Admin",
        ip: req.ip || "127.0.0.1"
      }
    });

    return res.status(200).json({ message: "System plan configuration deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /audit-logs
export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 50
    });
    return res.status(200).json(logs.map(l => ({
      id: l.id,
      timestamp: l.timestamp.toISOString().replace("T", " ").substring(0, 19),
      category: l.category,
      event: l.event,
      user: l.user,
      ip: l.ip
    })));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /global-config & PATCH /global-config
export async function getGlobalConfig(req: AuthenticatedRequest, res: Response) {
  try {
    let config = await prisma.globalConfig.findUnique({ where: { id: "singleton" } });
    if (!config) {
      config = await prisma.globalConfig.create({
        data: { id: "singleton", maintenanceMode: false, allowRegistration: true, globalRateLimit: 100 }
      });
    }
    return res.status(200).json(config);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateGlobalConfig(req: AuthenticatedRequest, res: Response) {
  const { maintenanceMode, allowRegistration, globalRateLimit } = req.body;
  try {
    const config = await prisma.globalConfig.upsert({
      where: { id: "singleton" },
      update: {
        maintenanceMode: maintenanceMode !== undefined ? !!maintenanceMode : undefined,
        allowRegistration: allowRegistration !== undefined ? !!allowRegistration : undefined,
        globalRateLimit: globalRateLimit !== undefined ? parseInt(globalRateLimit) : undefined
      },
      create: {
        id: "singleton",
        maintenanceMode: maintenanceMode || false,
        allowRegistration: allowRegistration || true,
        globalRateLimit: globalRateLimit || 100
      }
    });
    return res.status(200).json(config);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /companies/:id
export async function updateCompany(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { name, email, industry, plan, credits } = req.body;

  try {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Company not found" });
    }

    let planPrice: number | null = null;
    let planUpgradedDate: string | null = null;

    if (plan && plan !== existing.plan) {
      const planConfig = await prisma.systemPlanConfig.findFirst({
        where: { name: plan }
      });
      if (!planConfig) {
        return res.status(400).json({ error: `Invalid plan name: ${plan}` });
      }

      const price = planConfig.priceMonthly;

      // 1. Create subscription record for manual override
      const sub = await prisma.subscription.create({
        data: {
          companyId: id,
          planName: plan,
          amount: price,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          paymentStatus: "paid"
        }
      });

      // 2. Create invoice record
      const invoiceNo = `INV-MANUAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.invoice.create({
        data: {
          companyId: id,
          invoiceNo,
          date: new Date(),
          amount: `₹${price.toLocaleString("en-IN")}`,
          status: "paid",
          plan: `${plan} - Manually Activated`
        }
      });

      planPrice = price;
      planUpgradedDate = sub.startDate.toISOString();
    } else {
      const activeSub = await prisma.subscription.findFirst({
        where: { companyId: id },
        orderBy: { startDate: "desc" }
      });
      if (activeSub) {
        planPrice = activeSub.amount;
        planUpgradedDate = activeSub.startDate.toISOString();
      }
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        companyName: name || undefined,
        email: email || undefined,
        industry: industry || undefined,
        plan: plan || undefined,
        credits: credits !== undefined ? Number(credits) : undefined
      }
    });

    // Log the event in audit log
    await prisma.auditLog.create({
      data: {
        category: "TENANTS",
        event: `Super Admin manually updated company settings for ${updated.companyName} (Plan: ${updated.plan}, Credits: ${updated.credits})`,
        user: req.user?.email || "Super Admin",
        ip: req.ip || "127.0.0.1"
      }
    });

    if (plan && plan !== existing.plan) {
      try {
        const { broadcastToCompany } = require("../utils/sse");
        broadcastToCompany(id, "billing_updated", {
          planName: plan,
          manualOverride: true
        });
      } catch (err) {}
    }

    return res.status(200).json({
      id: updated.id,
      name: updated.companyName,
      industry: updated.industry,
      contactPerson: updated.contactPerson,
      email: updated.email,
      plan: updated.plan,
      status: updated.status.toLowerCase(),
      leadsCount: 0,
      planPrice,
      planUpgradedDate,
      credits: updated.credits
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /super-admin/subscriptions
export async function getSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        company: {
          select: {
            companyName: true,
            email: true,
            address: true
          }
        }
      },
      orderBy: { startDate: "desc" }
    });

    const mapped = subscriptions.map(s => {
      // Map company logo/color index or seed consistently
      const hash = s.companyId.charCodeAt(0) + s.companyId.charCodeAt(s.companyId.length - 1);
      const logoTypes: ("hexagon" | "zap" | "atom" | "leaf" | "compass" | "building")[] = [
        "hexagon", "zap", "atom", "leaf", "compass", "building"
      ];
      const logoColors = [
        "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800",
        "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800",
        "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800",
        "bg-teal-100 text-teal-600 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800",
        "bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800",
        "bg-sky-100 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:border-sky-850",
        "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",
        "bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800",
        "bg-cyan-100 text-cyan-600 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-800"
      ];

      // Calculate days difference for billing cycle
      const diffTime = Math.abs(s.endDate.getTime() - s.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const billingCycle = diffDays > 300 ? "365 Days" : "30 Days";

      return {
        id: s.id,
        subscriberName: s.company?.companyName || "Unknown Tenant",
        subscriberEmail: s.company?.email || "unknown@example.com",
        subscriberAddress: s.company?.address || "No Address Provided",
        logoColor: logoColors[hash % logoColors.length],
        logoType: logoTypes[hash % logoTypes.length],
        plan: s.planName,
        billingCycle,
        paymentMethod: "Manual / Stripe",
        paymentLast4: "N/A",
        amount: s.amount,
        createdDate: s.startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        expiringOn: s.endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status: s.paymentStatus === "paid" ? "Paid" : "Unpaid"
      };
    });

    return res.status(200).json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

// DELETE /super-admin/subscriptions/:id
export async function deleteSubscription(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  try {
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Subscription record not found" });
    }

    await prisma.subscription.delete({ where: { id } });

    // Log the deletion in audit log
    await prisma.auditLog.create({
      data: {
        category: "BILLING",
        event: `Super Admin deleted subscription transaction record: ${existing.id} (Plan: ${existing.planName}, Company ID: ${existing.companyId})`,
        user: req.user?.email || "Super Admin",
        ip: req.ip || "127.0.0.1"
      }
    });

    return res.status(200).json({ success: true, message: "Subscription record deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
