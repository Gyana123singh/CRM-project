import { Router } from "express";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";
import * as authController from "../controllers/authController";
import * as superAdminController from "../controllers/superAdminController";
import * as clientAdminController from "../controllers/clientAdminController";
import * as leadsController from "../controllers/leadsController";
import * as chatController from "../controllers/chatController";
import * as appointmentsController from "../controllers/appointmentsController";
import * as knowledgeController from "../controllers/knowledgeController";
import * as webhookController from "../controllers/webhookController";
import * as realtimeController from "../controllers/realtimeController";
import * as auditController from "../controllers/auditController";
import * as enrichmentController from "../controllers/enrichmentController";
import * as waContactsCtrl from "../controllers/whatsappContactsController";
import * as waGroupsCtrl from "../controllers/whatsappGroupsController";
import * as waCampaignsCtrl from "../controllers/whatsappCampaignsController";
import * as waReportsCtrl from "../controllers/whatsappReportsController";
import * as waSettingsCtrl from "../controllers/whatsappSettingsController";
import * as superAdminWACtrl from "../controllers/superAdminWhatsappController";
import businessRouter from "../app/api/business/routes/businessRoutes";

export const router = Router();

// ==========================================
// BUSINESS LEAD FINDER MIDDLEWARE ROUTES
// ==========================================
router.use("/business", businessRouter);

// ==========================================
// PUBLIC & WEBHOOK ROUTES
// ==========================================
router.post("/auth/login", authController.login);
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);

// Section 16 API Flow mappings (available without version prefixes as well)
router.post("/leads/create", leadsController.captureLead);
router.get("/public/appointments/slots", appointmentsController.getPublicAppointmentSlots);
router.post("/public/appointments", appointmentsController.createPublicAppointment);
router.get("/public/appointments/meta", appointmentsController.getPublicMeta);
router.post("/ai/chat", webhookController.handleAIChat);
router.get("/webhooks/whatsapp", webhookController.verifyWhatsappWebhook);
router.post("/webhooks/whatsapp", webhookController.receiveWhatsappMessage);
router.post("/webhooks/facebook-leads", webhookController.receiveFacebookLead);
router.post("/webhooks/stripe", webhookController.handleStripeWebhook);
router.get("/realtime", realtimeController.subscribe);
router.get("/realtime/stats", realtimeController.getStats);
router.post("/client-admin/seed", clientAdminController.seedDatabase);


// ==========================================
// SUPER ADMIN ROUTES
// ==========================================
router.get(
  "/super-admin/companies",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.getCompanies
);
router.post(
  "/super-admin/companies",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.createCompany
);
router.patch(
  "/super-admin/companies/:id/status",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.toggleCompanyStatus
);
router.patch(
  "/super-admin/companies/:id",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.updateCompany
);
router.get(
  "/super-admin/system-plans",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.getSystemPlans
);
router.patch(
  "/super-admin/system-plans/:id",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.updateSystemPlan
);
router.post(
  "/super-admin/system-plans",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.createSystemPlan
);
router.delete(
  "/super-admin/system-plans/:id",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.deleteSystemPlan
);
router.get(
  "/super-admin/subscriptions",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.getSubscriptions
);
router.delete(
  "/super-admin/subscriptions/:id",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.deleteSubscription
);
router.get(
  "/super-admin/audit-logs",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.getAuditLogs
);
router.get(
  "/super-admin/global-config",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.getGlobalConfig
);
router.patch(
  "/super-admin/global-config",
  authenticateJWT,
  authorizeRoles(["super-admin"]),
  superAdminController.updateGlobalConfig
);

// ==========================================
// CLIENT ADMIN ROUTES
// ==========================================

// Dashboard
router.get(
  "/client-admin/dashboard/stats",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getDashboardStats
);
router.get(
  "/client-admin/dashboard/lead-sources",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getLeadSources
);

// Reports
router.get(
  "/client-admin/reports",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getReports
);

// Agents
router.get(
  "/client-admin/agents",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getAgents
);
router.post(
  "/client-admin/agents",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.createAgent
);
router.patch(
  "/client-admin/agents/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.updateAgent
);
router.patch(
  "/client-admin/agents/:id/active",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.toggleAgentActive
);
router.delete(
  "/client-admin/agents/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.deleteAgent
);
router.get(
  "/client-admin/routing-policy",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getRoutingPolicy
);
router.patch(
  "/client-admin/routing-policy",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.updateRoutingPolicy
);
router.post(
  "/client-admin/whatsapp/pairing-code",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  clientAdminController.generatePairingCode
);
router.post(
  "/client-admin/whatsapp/verify",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  clientAdminController.verifyWhatsapp
);
router.get(
  "/client-admin/meta-forms",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  clientAdminController.getMetaForms
);
router.post(
  "/client-admin/smtp/verify",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  clientAdminController.verifySMTP
);
router.get(
  "/client-admin/company/config",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  clientAdminController.getCompanyConfig
);
router.get(
  "/client-admin/billing/plan",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getBillingPlan
);
router.get(
  "/client-admin/billing/plans",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getSystemPlansForClient
);
router.patch(
  "/client-admin/billing/plan",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.upgradeBillingPlan
);
router.post(
  "/client-admin/billing/checkout-session",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.createCheckoutSession
);
router.get(
  "/client-admin/billing/quotas",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getBillingQuotas
);
router.get(
  "/client-admin/billing/invoices",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getInvoices
);
router.get(
  "/client-admin/automation-rules",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.getAutomationRules
);
router.post(
  "/client-admin/automation-rules",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.createAutomationRule
);
router.patch(
  "/client-admin/automation-rules/:id/status",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.toggleRuleStatus
);
router.delete(
  "/client-admin/automation-rules/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  clientAdminController.deleteAutomationRule
);

// ==========================================
// CLIENT ADMIN AUDIT MODULES
// ==========================================
router.post(
  "/client-admin/audits/seo",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  auditController.runSEOAudit
);
router.post(
  "/client-admin/audits/social",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  auditController.runSocialAudit
);
router.post(
  "/client-admin/audits/gmb",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  auditController.runGoogleBusinessAudit
);
router.get(
  "/client-admin/audits",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  auditController.getMyAudits
);
router.delete(
  "/client-admin/audits/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  auditController.deleteAudit
);

// ==========================================
// CLIENT ADMIN LEAD ENRICHMENT MODULES
// ==========================================
router.post(
  "/client-admin/enrichments/find-detect",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  enrichmentController.runFindDetect
);
router.post(
  "/client-admin/enrichments/audit",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  enrichmentController.runLeadBatchAudit
);
router.post(
  "/client-admin/enrichments/enrich",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  enrichmentController.runEnrichContacts
);
router.post(
  "/client-admin/enrichments/validate-emails",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  enrichmentController.runEmailValidation
);
router.post(
  "/client-admin/enrichments/outreach",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  enrichmentController.runWriteOutreach
);
router.get(
  "/client-admin/enrichments/batches",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  enrichmentController.getLeadAndEnrichmentBatches
);
router.get(
  "/client-admin/enrichments/niche-suggestions",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  enrichmentController.getNicheSuggestions
);
router.get(
  "/client-admin/enrichments/region-suggestions",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  enrichmentController.getRegionSuggestions
);
router.delete(
  "/client-admin/enrichments/lead-batches/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  enrichmentController.deleteLeadBatch
);
router.delete(
  "/client-admin/enrichments/enrichment-batches/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  enrichmentController.deleteEnrichmentBatch
);
router.get(
  "/client-admin/enrichments/validations",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  enrichmentController.getEmailValidationsHistory
);

// ==========================================
// LEADS & CONVERSATIONS (SHARED BY CLIENT ADMIN & TEAM AGENTS)
// ==========================================
router.get(
  "/leads",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  leadsController.getLeads
);
router.post(
  "/leads",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  leadsController.createLead
);
router.patch(
  "/leads/:id/status",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  leadsController.updateLeadStatus
);
router.patch(
  "/leads/:id/notes",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  leadsController.updateLeadNotes
);
router.patch(
  "/leads/:id/followup",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  leadsController.updateLeadFollowUp
);
router.patch(
  "/leads/:id/assign",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  leadsController.assignLead
);

router.get(
  "/conversations",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  chatController.getConversations
);
router.post(
  "/conversations",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  chatController.createThread
);
router.post(
  "/conversations/:leadId/messages",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  chatController.sendMessage
);
router.patch(
  "/conversations/:leadId/auto-reply",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  chatController.toggleAutoReply
);
router.patch(
  "/conversations/:leadId/messages/:messageId",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  chatController.editMessage
);
router.delete(
  "/conversations/:leadId/messages/:messageId",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  chatController.deleteMessage
);

// ==========================================
// APPOINTMENTS
// ==========================================
router.get(
  "/client-admin/appointments/slots",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  appointmentsController.getAppointmentSlots
);
router.get(
  "/appointments",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  appointmentsController.getAppointments
);
router.post(
  "/appointments",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  appointmentsController.createAppointment
);
router.patch(
  "/appointments/:id/confirm",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  clientAdminController.confirmAppointment
);
router.patch(
  "/appointments/:id/cancel",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  appointmentsController.cancelAppointment
);

// Custom Slots and Services Configs (Client Admin only)
router.get(
  "/client-admin/appointments/slot-configs",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  appointmentsController.getSlotConfigs
);
router.post(
  "/client-admin/appointments/slot-configs",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  appointmentsController.saveSlotConfig
);
router.delete(
  "/client-admin/appointments/slot-configs/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  appointmentsController.deleteSlotConfig
);
router.get(
  "/client-admin/appointments/service-configs",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  appointmentsController.getServiceConfigs
);
router.post(
  "/client-admin/appointments/service-configs",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  appointmentsController.createServiceConfig
);
router.delete(
  "/client-admin/appointments/service-configs/:id",
  authenticateJWT,
  authorizeRoles(["client-admin"]),
  appointmentsController.deleteServiceConfig
);

// ==========================================
// KNOWLEDGE BASE (SHARED BY CLIENT ADMIN & TEAM AGENTS)
// ==========================================
router.get(
  "/knowledge/faqs",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.getFAQs
);
router.post(
  "/knowledge/faqs",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.createFAQ
);
router.delete(
  "/knowledge/faqs/:id",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.deleteFAQ
);
router.get(
  "/knowledge/documents",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.getDocuments
);
router.post(
  "/knowledge/documents/upload",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.uploadDocument
);
router.get(
  "/knowledge/ai-settings",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.getAISettings
);
router.patch(
  "/knowledge/ai-settings",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.updateAISettings
);
router.get(
  "/knowledge/whatsapp-templates",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.getTemplates
);
router.post(
  "/knowledge/whatsapp-templates",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.createTemplate
);
router.delete(
  "/knowledge/whatsapp-templates/:id",
  authenticateJWT,
  authorizeRoles(["client-admin", "team"]),
  knowledgeController.deleteTemplate
);

// ==========================================
// WHATSAPP CAMPAIGN MANAGEMENT ROUTES
// ==========================================

// --- Contacts ---
router.get("/client-admin/whatsapp/contacts", authenticateJWT, authorizeRoles(["client-admin", "team"]), waContactsCtrl.getContacts);
router.get("/client-admin/whatsapp/contacts/tags", authenticateJWT, authorizeRoles(["client-admin", "team"]), waContactsCtrl.getUniqueTags);
router.get("/client-admin/whatsapp/contacts/export", authenticateJWT, authorizeRoles(["client-admin"]), waContactsCtrl.exportContacts);
router.get("/client-admin/whatsapp/contacts/:id", authenticateJWT, authorizeRoles(["client-admin", "team"]), waContactsCtrl.getContactDetails);
router.post("/client-admin/whatsapp/contacts", authenticateJWT, authorizeRoles(["client-admin", "team"]), waContactsCtrl.createContact);
router.patch("/client-admin/whatsapp/contacts/:id", authenticateJWT, authorizeRoles(["client-admin", "team"]), waContactsCtrl.updateContact);
router.delete("/client-admin/whatsapp/contacts/:id", authenticateJWT, authorizeRoles(["client-admin"]), waContactsCtrl.deleteContact);
router.post("/client-admin/whatsapp/contacts/bulk-delete", authenticateJWT, authorizeRoles(["client-admin"]), waContactsCtrl.bulkDeleteContacts);
router.post("/client-admin/whatsapp/contacts/bulk-tag", authenticateJWT, authorizeRoles(["client-admin"]), waContactsCtrl.bulkTagContacts);
router.post("/client-admin/whatsapp/contacts/import", authenticateJWT, authorizeRoles(["client-admin"]), waContactsCtrl.importContacts);

// --- Contact Groups ---
router.get("/client-admin/whatsapp/groups", authenticateJWT, authorizeRoles(["client-admin", "team"]), waGroupsCtrl.getGroups);
router.get("/client-admin/whatsapp/groups/:id", authenticateJWT, authorizeRoles(["client-admin", "team"]), waGroupsCtrl.getGroupDetails);
router.post("/client-admin/whatsapp/groups", authenticateJWT, authorizeRoles(["client-admin"]), waGroupsCtrl.createGroup);
router.patch("/client-admin/whatsapp/groups/:id", authenticateJWT, authorizeRoles(["client-admin"]), waGroupsCtrl.updateGroup);
router.delete("/client-admin/whatsapp/groups/:id", authenticateJWT, authorizeRoles(["client-admin"]), waGroupsCtrl.deleteGroup);
router.post("/client-admin/whatsapp/groups/:id/assign", authenticateJWT, authorizeRoles(["client-admin"]), waGroupsCtrl.assignContacts);
router.post("/client-admin/whatsapp/groups/:id/remove", authenticateJWT, authorizeRoles(["client-admin"]), waGroupsCtrl.removeContacts);

// --- Campaigns ---
router.get("/client-admin/whatsapp/campaigns", authenticateJWT, authorizeRoles(["client-admin", "team"]), waCampaignsCtrl.getCampaigns);
router.get("/client-admin/whatsapp/campaigns/:id", authenticateJWT, authorizeRoles(["client-admin", "team"]), waCampaignsCtrl.getCampaignDetails);
router.post("/client-admin/whatsapp/campaigns", authenticateJWT, authorizeRoles(["client-admin", "team"]), waCampaignsCtrl.createCampaign);
router.patch("/client-admin/whatsapp/campaigns/:id", authenticateJWT, authorizeRoles(["client-admin"]), waCampaignsCtrl.updateCampaign);
router.delete("/client-admin/whatsapp/campaigns/:id", authenticateJWT, authorizeRoles(["client-admin"]), waCampaignsCtrl.deleteCampaign);
router.post("/client-admin/whatsapp/campaigns/:id/duplicate", authenticateJWT, authorizeRoles(["client-admin"]), waCampaignsCtrl.duplicateCampaign);
router.post("/client-admin/whatsapp/campaigns/:id/send", authenticateJWT, authorizeRoles(["client-admin"]), waCampaignsCtrl.launchCampaignImmediately);
router.post("/client-admin/whatsapp/campaigns/:id/cancel", authenticateJWT, authorizeRoles(["client-admin"]), waCampaignsCtrl.cancelCampaign);
router.post("/client-admin/whatsapp/campaigns/:id/pause", authenticateJWT, authorizeRoles(["client-admin"]), waCampaignsCtrl.pauseCampaign);
router.get("/client-admin/whatsapp/scheduled", authenticateJWT, authorizeRoles(["client-admin", "team"]), waCampaignsCtrl.getScheduledCampaigns);

// --- Reports & Analytics ---
router.get("/client-admin/whatsapp/reports/dashboard", authenticateJWT, authorizeRoles(["client-admin", "team"]), waReportsCtrl.getDashboardStats);
router.get("/client-admin/whatsapp/reports/campaigns", authenticateJWT, authorizeRoles(["client-admin", "team"]), waReportsCtrl.getCampaignPerformance);
router.get("/client-admin/whatsapp/reports/trends", authenticateJWT, authorizeRoles(["client-admin", "team"]), waReportsCtrl.getMessageTrends);
router.get("/client-admin/whatsapp/reports/recent", authenticateJWT, authorizeRoles(["client-admin", "team"]), waReportsCtrl.getRecentActivity);

// --- Settings, API Keys & Billing ---
router.get("/client-admin/whatsapp/settings", authenticateJWT, authorizeRoles(["client-admin"]), waSettingsCtrl.getSettings);
router.post("/client-admin/whatsapp/settings/connect", authenticateJWT, authorizeRoles(["client-admin"]), waSettingsCtrl.connectAccount);
router.post("/client-admin/whatsapp/settings/disconnect", authenticateJWT, authorizeRoles(["client-admin"]), waSettingsCtrl.disconnectAccount);
router.get("/client-admin/whatsapp/api-keys", authenticateJWT, authorizeRoles(["client-admin"]), waSettingsCtrl.getApiKey);
router.post("/client-admin/whatsapp/api-keys/regenerate", authenticateJWT, authorizeRoles(["client-admin"]), waSettingsCtrl.regenerateApiKey);
router.get("/client-admin/whatsapp/billing", authenticateJWT, authorizeRoles(["client-admin"]), waSettingsCtrl.getBillingInfo);

// --- Super Admin WhatsApp ---
router.get("/super-admin/whatsapp/stats", authenticateJWT, authorizeRoles(["super-admin"]), superAdminWACtrl.getGlobalStats);
router.get("/super-admin/whatsapp/tenants", authenticateJWT, authorizeRoles(["super-admin"]), superAdminWACtrl.getTenantUsage);
router.get("/super-admin/whatsapp/queue", authenticateJWT, authorizeRoles(["super-admin"]), superAdminWACtrl.getQueueHealth);
router.get("/super-admin/whatsapp/campaigns", authenticateJWT, authorizeRoles(["super-admin"]), superAdminWACtrl.getAllCampaigns);
router.post("/super-admin/whatsapp/campaigns/:id/suspend", authenticateJWT, authorizeRoles(["super-admin"]), superAdminWACtrl.suspendCampaign);
router.post("/super-admin/whatsapp/tenants/:id/restrict", authenticateJWT, authorizeRoles(["super-admin"]), superAdminWACtrl.restrictTenant);

export default router;
