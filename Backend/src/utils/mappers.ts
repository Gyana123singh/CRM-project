import { LeadStatus, LeadSource, RuleTrigger } from "@prisma/client";

// ==========================================
// LeadStatus Mapping
// ==========================================

export function mapLeadStatusToFrontend(status: LeadStatus): string {
  switch (status) {
    case LeadStatus.NEW:
      return "New";
    case LeadStatus.CONTACTED:
      return "Contacted";
    case LeadStatus.INTERESTED:
      return "Interested";
    case LeadStatus.FOLLOW_UP:
      return "Follow-up";
    case LeadStatus.CONVERTED:
      return "Converted";
    case LeadStatus.LOST:
      return "Lost";
    case LeadStatus.NOT_REACHABLE:
      return "Not Reachable";
    default:
      return "New";
  }
}

export function mapLeadStatusToPrisma(statusStr: string): LeadStatus {
  switch (statusStr) {
    case "New":
    case "NEW":
      return LeadStatus.NEW;
    case "Contacted":
    case "CONTACTED":
      return LeadStatus.CONTACTED;
    case "Interested":
    case "INTERESTED":
      return LeadStatus.INTERESTED;
    case "Follow-up":
    case "FOLLOW_UP":
      return LeadStatus.FOLLOW_UP;
    case "Converted":
    case "CONVERTED":
      return LeadStatus.CONVERTED;
    case "Lost":
    case "LOST":
      return LeadStatus.LOST;
    case "Not Reachable":
    case "NOT_REACHABLE":
      return LeadStatus.NOT_REACHABLE;
    default:
      return LeadStatus.NEW;
  }
}

// ==========================================
// LeadSource Mapping
// ==========================================

export function mapLeadSourceToFrontend(source: LeadSource): string {
  switch (source) {
    case LeadSource.WEBSITE_FORMS:
      return "Website Forms";
    case LeadSource.LANDING_PAGES:
      return "Landing Pages";
    case LeadSource.META_ADS:
      return "Meta Ads";
    case LeadSource.GOOGLE_ADS:
      return "Google Ads";
    case LeadSource.WHATSAPP:
      return "WhatsApp";
    case LeadSource.MANUAL_ENTRY:
      return "Manual Entry";
    default:
      return "Manual Entry";
  }
}

export function mapLeadSourceToPrisma(sourceStr: string): LeadSource {
  switch (sourceStr) {
    case "Website Forms":
    case "WEBSITE_FORMS":
      return LeadSource.WEBSITE_FORMS;
    case "Landing Pages":
    case "LANDING_PAGES":
      return LeadSource.LANDING_PAGES;
    case "Meta Ads":
    case "META_ADS":
      return LeadSource.META_ADS;
    case "Google Ads":
    case "GOOGLE_ADS":
      return LeadSource.GOOGLE_ADS;
    case "WhatsApp":
    case "WHATSAPP":
      return LeadSource.WHATSAPP;
    case "Manual Entry":
    case "MANUAL_ENTRY":
      return LeadSource.MANUAL_ENTRY;
    default:
      return LeadSource.MANUAL_ENTRY;
  }
}

// ==========================================
// RuleTrigger Mapping
// ==========================================

export function mapRuleTriggerToFrontend(trigger: RuleTrigger): string {
  switch (trigger) {
    case RuleTrigger.NEW_LEAD_CREATED:
      return "New Lead Created";
    case RuleTrigger.STATUS_UPDATED:
      return "Status Updated";
    case RuleTrigger.NO_CUSTOMER_RESPONSE:
      return "No Customer Response";
    default:
      return "New Lead Created";
  }
}

export function mapRuleTriggerToPrisma(triggerStr: string): RuleTrigger {
  switch (triggerStr) {
    case "New Lead Created":
    case "NEW_LEAD_CREATED":
      return RuleTrigger.NEW_LEAD_CREATED;
    case "Status Updated":
    case "STATUS_UPDATED":
      return RuleTrigger.STATUS_UPDATED;
    case "No Customer Response":
    case "NO_CUSTOMER_RESPONSE":
      return RuleTrigger.NO_CUSTOMER_RESPONSE;
    default:
      return RuleTrigger.NEW_LEAD_CREATED;
  }
}
