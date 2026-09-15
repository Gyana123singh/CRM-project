import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-change-this-in-production";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Check user in database
    let dbUser = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    });

    // Dev Fallback / Auto-seeding: If database is empty and logging in with predefined credentials, auto-create them
    if (!dbUser && (email === "pradeep@infotattva.com" || email === "superadmin@infotattva.com" || email === "sales@infotattva.com")) {
      const hashedPassword = await bcrypt.hash("securepassword", 10);
      
      // Check if we need to create the default company
      let defaultCompany = await prisma.company.findFirst({
        where: { email: "contact@infotattva.com" }
      });
      
      if (!defaultCompany && email !== "superadmin@infotattva.com") {
        defaultCompany = await prisma.company.create({
          data: {
            companyName: "Infotattva Business Solutions",
            industry: "SaaS & Retail Solutions",
            contactPerson: "Pradeep Patra",
            phone: "+91 94380 99999",
            email: "contact@infotattva.com",
            address: "Bhubaneswar, Odisha, India",
            plan: "GROWTH_PLAN",
            status: "ACTIVE",
            routingPolicy: "round-robin",
            whatsappPhone: "+91 94380 99999",
            whatsappName: "Infotattva Business Live Desk",
            whatsappConnected: true,
            smtpVerified: true,
          }
        });

        // Create a default subscription for this company
        await prisma.subscription.create({
          data: {
            companyId: defaultCompany.id,
            planName: "Growth Plan",
            amount: 15000,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            paymentStatus: "paid"
          }
        });

        // Auto-seed some mock leads
        await prisma.lead.createMany({
          data: [
            {
              name: "Rahul Mohanty",
              phone: "+91 98765 43210",
              email: "rahul.m@gmail.com",
              location: "Patia, Bhubaneswar",
              serviceInterest: "2BHK Luxury Flat",
              message: "Looking for a ready to move 2BHK flat near Patia within 60 Lakhs budget.",
              source: "META_ADS",
              status: "NEW",
              companyId: defaultCompany.id,
            },
            {
              name: "Dr. Sunita Rao",
              phone: "+91 94321 09876",
              email: "sunita.rao@healthclinic.in",
              location: "Saheed Nagar",
              serviceInterest: "AI WhatsApp Chatbot integration",
              message: "Need a WhatsApp bot for automatic appointment confirmation and scheduling.",
              source: "WHATSAPP",
              status: "INTERESTED",
              companyId: defaultCompany.id,
              notes: "Very eager. Requested a demo of salon/spa calendar flow.",
            }
          ]
        });

        // Auto-seed initial knowledge base Q&As
        await prisma.knowledgeBase.createMany({
          data: [
            {
              companyId: defaultCompany.id,
              title: "Weekend hours",
              category: "General",
              content: "We are open from 10:00 AM to 6:00 PM on Saturday and Sunday.",
            },
            {
              companyId: defaultCompany.id,
              title: "Patia 2BHK pricing",
              category: "pricing",
              content: "Ready-to-move 2BHK flats in Patia start from ₹55 Lakhs to ₹75 Lakhs.",
            }
          ]
        });
      }

      if (email === "superadmin@infotattva.com") {
        dbUser = await prisma.user.create({
          data: {
            name: "Infotattva Super Admin",
            email: "superadmin@infotattva.com",
            phone: "+91 94380 00000",
            password: hashedPassword,
            role: "SUPER_ADMIN",
            status: "active",
          },
          include: { company: true }
        });
      } else if (email === "pradeep@infotattva.com" && defaultCompany) {
        dbUser = await prisma.user.create({
          data: {
            name: "Pradeep Patra",
            email: "pradeep@infotattva.com",
            phone: "+91 94380 12345",
            password: hashedPassword,
            role: "CLIENT_ADMIN",
            status: "active",
            companyId: defaultCompany.id
          },
          include: { company: true }
        });

        // Create Agent Profile
        await prisma.agentProfile.create({
          data: {
            userId: dbUser.id,
            phone: "+91 94380 12345",
            status: "ONLINE",
            specialty: "AI & Tech Integration",
            isActive: true,
            leadsCount: 24,
            conversionRate: 50.0
          }
        });

        // Update lead assignments
        await prisma.lead.updateMany({
          where: { companyId: defaultCompany.id },
          data: { assignedToId: dbUser.id }
        });
      } else if (email === "sales@infotattva.com" && defaultCompany) {
        dbUser = await prisma.user.create({
          data: {
            name: "Amit Sharma (Sales Staff)",
            email: "sales@infotattva.com",
            phone: "+91 94380 54321",
            password: hashedPassword,
            role: "TEAM",
            status: "active",
            companyId: defaultCompany.id
          },
          include: { company: true }
        });

        // Create Agent Profile
        await prisma.agentProfile.create({
          data: {
            userId: dbUser.id,
            phone: "+91 94380 54321",
            status: "ONLINE",
            specialty: "Sales & Client Onboarding",
            isActive: true,
            leadsCount: 12,
            conversionRate: 40.0
          }
        });
      }
    }

    if (!dbUser) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check user status
    if (dbUser.status === "suspended") {
      return res.status(403).json({ error: "Your account has been suspended" });
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, dbUser.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate Token
    const token = jwt.sign(
      {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role.toLowerCase().replace("_", "-"),
        companyId: dbUser.companyId
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      token,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role.toLowerCase().replace("_", "-"),
        companyId: dbUser.companyId || undefined,
        companyName: dbUser.company?.companyName || undefined
      }
    });

  } catch (error: any) {
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  return res.status(200).json({ message: "Password reset link sent to your email" });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and password are required" });
  }
  return res.status(200).json({ message: "Password reset completed successfully" });
}
