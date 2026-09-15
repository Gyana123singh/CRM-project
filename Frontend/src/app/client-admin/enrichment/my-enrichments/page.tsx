"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Search, Loader2, Download, Trash2, Globe, Phone, Mail, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

interface LeadBatch {
  id: string;
  name: string;
  niche: string;
  region: string;
  platform: string;
  count: number;
  createdAt: string;
  leads?: any[];
}

interface ContactItem {
  id: string;
  businessName: string;
  websiteUrl: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp: string;
  linkedin: string;
  socialProfiles: any;
}

interface EnrichmentBatch {
  id: string;
  name: string;
  createdAt: string;
  contacts: ContactItem[];
}

export default function MyEnrichmentsPage() {
  const [activeTab, setActiveTab] = useState<"discovery" | "contacts">("discovery");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [leadBatches, setLeadBatches] = useState<LeadBatch[]>([]);
  const [enrichmentBatches, setEnrichmentBatches] = useState<EnrichmentBatch[]>([]);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/api/client-admin/enrichments/batches");
      setLeadBatches(response.data.leadBatches || []);
      setEnrichmentBatches(response.data.enrichmentBatches || []);
    } catch (error) {
      console.error("Failed to load batch lists:", error);
      toast.error("Failed to load enrichment history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteLeadBatch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discovery batch? This action cannot be undone.")) return;
    try {
      await axiosInstance.delete(`/api/client-admin/enrichments/lead-batches/${id}`);
      toast.success("Batch successfully deleted!");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete batch.");
    }
  };

  const handleDeleteEnrichmentBatch = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact enrichment batch?")) return;
    try {
      await axiosInstance.delete(`/api/client-admin/enrichments/enrichment-batches/${id}`);
      toast.success("Enrichment batch successfully deleted!");
      fetchData();
      if (expandedBatchId === id) setExpandedBatchId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete enrichment batch.");
    }
  };

  const handleExportCSV = (batch: EnrichmentBatch) => {
    if (!batch.contacts || batch.contacts.length === 0) {
      toast.warn("No contact profiles found in this batch to export.");
      return;
    }

    const headers = ["Business Name", "Website URL", "Name", "Role", "Email", "Phone", "WhatsApp", "LinkedIn"];
    const rows = batch.contacts.map(c => [
      `"${c.businessName || ""}"`,
      `"${c.websiteUrl || ""}"`,
      `"${c.name || ""}"`,
      `"${c.role || ""}"`,
      `"${c.email || ""}"`,
      `"${c.phone || ""}"`,
      `"${c.whatsapp || ""}"`,
      `"${c.linkedin || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${batch.name.replace(/\s+/g, "_")}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export successfully generated!");
  };

  // Filter lists
  const filteredLeadBatches = leadBatches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEnrichmentBatches = enrichmentBatches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              My Enrichments
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your lead discovery lists and contact enrichment records
            </p>
          </div>
        </div>

        {/* Filters and Search panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 border-slate-100 dark:border-slate-800 pb-0">
            <button
              onClick={() => {
                setActiveTab("discovery");
                setSearchQuery("");
              }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "discovery"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              Lead Batches (Discovery)
            </button>
            <button
              onClick={() => {
                setActiveTab("contacts");
                setSearchQuery("");
              }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "contacts"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              Enrichment Batches
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 placeholder:text-slate-450"
            />
          </div>
        </div>

        {/* Display results */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-555" />
            <span className="text-xs font-bold text-slate-400 mt-2 block">Loading lists...</span>
          </div>
        ) : activeTab === "discovery" ? (
          // LEAD DISCOVERY LISTS
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            {filteredLeadBatches.length === 0 ? (
              <div className="text-center py-12 text-xs font-bold text-slate-400">
                No lead discovery batches found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {filteredLeadBatches.map(batch => (
                  <div key={batch.id}>
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{batch.name}</div>
                        <div className="text-[10px] font-black uppercase text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>Niche: {batch.niche}</span>
                          <span>•</span>
                          <span>Region: {batch.region}</span>
                          <span>•</span>
                          <span>CMS Filter: {batch.platform}</span>
                          <span>•</span>
                          <span>Created: {batch.createdAt.split("T")[0]}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right mr-2">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Leads Found</span>
                          <span className="text-sm font-black text-teal-555">{batch.count}</span>
                        </div>

                        <button
                          onClick={() => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id)}
                          className="p-2 border border-slate-250 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                        >
                          {expandedBatchId === batch.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteLeadBatch(batch.id)}
                          className="p-2 border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                          title="Delete discovery history"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed leads table inside batch */}
                    {expandedBatchId === batch.id && (
                      <div className="p-5 bg-slate-50/30 dark:bg-slate-950/30 border-t border-b border-slate-100 dark:border-slate-800 animate-fadeIn">
                        {(!batch.leads || batch.leads.length === 0) ? (
                          <div className="text-center py-6 text-xs text-slate-400 font-bold">
                            No business leads found in this discovery batch.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                                  <th className="py-2 px-2">Business Name</th>
                                  <th className="py-2 px-2">Website URL</th>
                                  <th className="py-2 px-2">Detected CMS</th>
                                  <th className="py-2 px-2">Contact Info</th>
                                  <th className="py-2 px-2 text-right">Location</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350 font-medium">
                                {batch.leads.map((lead: any) => (
                                  <tr key={lead.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
                                    <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-slate-100">{lead.name}</td>
                                    <td className="py-2.5 px-2">
                                      {lead.email ? (
                                        <a
                                          href={`https://www.${lead.email.split("@")[1]}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-teal-650 dark:text-teal-400 hover:underline flex items-center gap-1 inline-flex"
                                        >
                                          <Globe className="h-3 w-3" />
                                          {`www.${lead.email.split("@")[1]}`}
                                        </a>
                                      ) : (
                                        <span className="text-slate-400">N/A</span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {lead.cms || "Custom"}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-500 text-[10px]">
                                      <div>Email: {lead.email || "N/A"}</div>
                                      <div>Phone: {lead.phone || "N/A"}</div>
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-slate-500">{lead.location}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // CONTACT ENRICHMENT LISTS WITH EXPANDABLE DETAIL VIEW
          <div className="space-y-4">
            {filteredEnrichmentBatches.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center text-xs font-bold text-slate-400 rounded-2xl">
                No enrichment batches found.
              </div>
            ) : (
              filteredEnrichmentBatches.map(batch => {
                const isExpanded = expandedBatchId === batch.id;
                return (
                  <div
                    key={batch.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/40">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{batch.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Created Date: {batch.createdAt.split("T")[0]} • Profiles: {(batch.contacts || []).length}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleExportCSV(batch)}
                          className="px-3 py-2 border border-slate-250 dark:border-slate-800 text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition inline-flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider"
                        >
                          <Download className="h-3.5 w-3.5" /> Export CSV
                        </button>
                        
                        <button
                          onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                          className="p-2 border border-slate-250 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                        >
                          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteEnrichmentBatch(batch.id)}
                          className="p-2 border border-slate-250 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed contacts grid */}
                    {isExpanded && (
                      <div className="p-5 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 animate-fadeIn">
                        {(!batch.contacts || batch.contacts.length === 0) ? (
                          <div className="text-center py-6 text-xs text-slate-400 font-bold">
                            No profiles extracted in this enrichment run.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {batch.contacts.map((contact) => (
                              <div
                                key={contact.id}
                                className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/20 dark:bg-slate-900/20 space-y-3 shadow-xs"
                              >
                                <div className="flex items-start justify-between min-w-0 gap-2">
                                  <div>
                                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-50">{contact.name}</h4>
                                    <p className="text-[10px] font-bold text-teal-650 dark:text-teal-400 uppercase tracking-wide">
                                      {contact.role} @ {contact.businessName}
                                    </p>
                                  </div>
                                  
                                  {contact.websiteUrl && (
                                    <a
                                      href={contact.websiteUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 border border-slate-205 dark:border-slate-800 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                      title="Open website"
                                    >
                                      <Globe className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>

                                <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs text-slate-600 dark:text-slate-400">
                                  {contact.email && (
                                    <div className="flex items-center gap-2 truncate">
                                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="font-mono">{contact.email}</span>
                                    </div>
                                  )}
                                  {contact.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span>{contact.phone}</span>
                                    </div>
                                  )}
                                  {contact.whatsapp && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black uppercase text-teal-500 bg-teal-500/10 px-1.5 py-0.5 rounded shrink-0">WA</span>
                                      <span>{contact.whatsapp}</span>
                                    </div>
                                  )}
                                  {contact.linkedin && (
                                    <div className="flex items-center gap-2 truncate">
                                      <LinkedinIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                      <a
                                        href={contact.linkedin}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-500 hover:underline font-medium truncate"
                                      >
                                        {contact.linkedin}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </DashboardWrapper>
  );
}
