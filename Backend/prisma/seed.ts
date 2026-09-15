import {
  PrismaClient,
  UserRole,
  PlanType,
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
import bcrypt from "bcryptjs";
declare const process: any;

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Clean existing records to prevent unique key violations and ensure clean start
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
      plan: PlanType.GROWTH_PLAN,
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

  // 7. Create ChatThreads and Messages for active chats
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

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
