"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import {
  MessageSquare, ShieldAlert, Users, Zap, RefreshCw, BarChart3,
  Server, AlertTriangle, Eye, ShieldCheck, XCircle, Search, Edit2, Play
} from "lucide-react";

export default function SuperAdminWhatsappPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [queue, setQueue] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("tenants");

  // Search/Filters
  const [searchTenant, setSearchTenant] = useState("");
  const [searchCampaign, setSearchCampaign] = useState("");

  // Edit Credits modal state
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [creditsInput, setCreditsInput] = useState(0);

  const fetchGlobalData = async () => {
    try {
      const [statsRes, tenantsRes, queueRes, campaignsRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.superAdminWhatsapp.stats),
        axiosInstance.get(ENDPOINTS.superAdminWhatsapp.tenants),
        axiosInstance.get(ENDPOINTS.superAdminWhatsapp.queue),
        axiosInstance.get(ENDPOINTS.superAdminWhatsapp.campaigns)
      ]);

      setStats(statsRes.data);
      setTenants(tenantsRes.data);
      setQueue(queueRes.data);
      setCampaigns(campaignsRes.data);
    } catch (err) {
      // Fallback dev mock data
      setStats({
        totalTenants: 12,
        tenantsWithWhatsApp: 8,
        totalCampaigns: 48,
        runningCampaigns: 2,
        totalMessages: 43250,
        totalContacts: 18200,
        deliveryRate: "92.4",
        failRate: "4.1"
      });
      setTenants([
        { id: "t1", companyName: "Acme Corp", plan: "PREMIUM_PLAN", status: "active", credits: 1500, contacts: 2500, campaigns: 12, messagesSent: 18500, whatsappConnected: true, whatsappPhone: "919876543210" },
        { id: "t2", companyName: "Global Retail", plan: "GROWTH_PLAN", status: "active", credits: 450, contacts: 850, campaigns: 6, messagesSent: 4200, whatsappConnected: true, whatsappPhone: "919988776655" },
        { id: "t3", companyName: "Alpha Logistics", plan: "STARTER_PLAN", status: "active", credits: 120, contacts: 110, campaigns: 2, messagesSent: 120, whatsappConnected: false, whatsappPhone: null },
        { id: "t4", companyName: "Rogue Spammer", plan: "STARTER_PLAN", status: "suspended", credits: 0, contacts: 450, campaigns: 3, messagesSent: 850, whatsappConnected: true, whatsappPhone: "918877665544" }
      ]);
      setQueue({
        mode: "BullMQ (Redis)",
        redisStatus: "Connected",
        waiting: 0,
        active: 1,
        completed: 1258,
        failed: 42,
        delayed: 0
      });
      setCampaigns([
        { id: "c1", name: "Mega Promo Offer", status: "RUNNING", company: { companyName: "Acme Corp" }, template: { name: "welcome_message" }, _count: { logs: 2500 }, createdAt: "2026-06-22T12:00:00Z" },
        { id: "c2", name: "Urgent Alerts", status: "COMPLETED", company: { companyName: "Global Retail" }, template: { name: "utility_alert" }, _count: { logs: 450 }, createdAt: "2026-06-22T08:00:00Z" },
        { id: "c3", name: "Spam Attack Campaign", status: "RUNNING", company: { companyName: "Rogue Spammer" }, template: { name: "spam_message" }, _count: { logs: 8000 }, createdAt: "2026-06-22T12:15:00Z" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleSuspendCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to forcibly suspend this campaign? Its status will be changed to FAILED and queue sending terminated.")) return;
    try {
      await axiosInstance.post(ENDPOINTS.superAdminWhatsapp.suspendCampaign(campaignId));
      toast.success("Campaign suspended successfully!");
      fetchGlobalData();
    } catch {
      toast.error("Failed to suspend campaign");
    }
  };

  const handleUpdateCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      await axiosInstance.post(ENDPOINTS.superAdminWhatsapp.restrictTenant(selectedTenant.id), {
        credits: creditsInput
      });
      toast.success(`Credits updated for ${selectedTenant.companyName}`);
      setSelectedTenant(null);
      fetchGlobalData();
    } catch {
      toast.error("Failed to update credits");
    }
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 text-rose-600 animate-spin" />
        </div>
      </DashboardWrapper>
    );
  }

  const filteredTenants = tenants.filter(t => t.companyName.toLowerCase().includes(searchTenant.toLowerCase()));
  const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(searchCampaign.toLowerCase()) || c.company?.companyName.toLowerCase().includes(searchCampaign.toLowerCase()));

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">WhatsApp Global Monitor <ShieldAlert className="h-5 w-5 text-rose-500" /></h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">System-wide monitoring dashboard for queue status, tenant usages, and campaign moderation.</p>
        </div>

        {/* Global Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Active Integrations", value: `${stats.tenantsWithWhatsApp} / ${stats.totalTenants} Tenants`, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Running Campaigns", value: stats.runningCampaigns, icon: Play, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Total Campaigns", value: stats.totalCampaigns, icon: BarChart3, color: "text-indigo-500", bg: "bg-indigo-500/10" },
              { label: "Global Messages Routed", value: stats.totalMessages.toLocaleString(), icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" }
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{card.label}</span>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.bg}`}><Icon className={`h-4.5 w-4.5 ${card.color}`} /></div>
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{card.value}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Queue Health Diagnostics */}
        {queue && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-emerald-500" /> WhatsApp Campaign Dispatch Queue Monitor
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Queue Engine</span>
                <p className="text-xs font-black text-slate-850 dark:text-slate-200 mt-1">{queue.mode}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Active Dispatchers</span>
                <p className="text-xs font-black text-amber-500 mt-1">{queue.active || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Delayed / Retries</span>
                <p className="text-xs font-black text-indigo-500 mt-1">{queue.delayed || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Waiting in Queue</span>
                <p className="text-xs font-black text-blue-500 mt-1">{queue.waiting || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Total Completed</span>
                <p className="text-xs font-black text-emerald-600 mt-1">{(queue.completed || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Total Failed</span>
                <p className="text-xs font-black text-rose-500 mt-1">{(queue.failed || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button onClick={() => setActiveTab("tenants")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === "tenants" ? "border-rose-550 text-slate-900 dark:text-slate-100 font-black" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            Tenant Workspaces
          </button>
          <button onClick={() => setActiveTab("campaigns")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${activeTab === "campaigns" ? "border-rose-550 text-slate-900 dark:text-slate-100 font-black" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            Active Moderation Campaigns
          </button>
        </div>

        {/* TAB 1: Tenants List */}
        {activeTab === "tenants" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">Tenant Quotas & Activity</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input type="text" placeholder="Search tenants..." value={searchTenant} onChange={(e) => setSearchTenant(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="pb-3 pr-4">Tenant Company</th>
                    <th className="pb-3 pr-4">Plan Tier</th>
                    <th className="pb-3 pr-4">WhatsApp Status</th>
                    <th className="pb-3 pr-4 text-right">Contacts</th>
                    <th className="pb-3 pr-4 text-right">Campaigns</th>
                    <th className="pb-3 pr-4 text-right">Messages Sent</th>
                    <th className="pb-3 pr-4 text-right">Available Credits</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTenants.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                      <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">
                        {t.companyName}
                        {t.status === "suspended" && <span className="ml-2 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-bold">Suspended</span>}
                      </td>
                      <td className="py-3 pr-4 font-bold text-indigo-500">{t.plan.replace("_", " ")}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.whatsappConnected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                          {t.whatsappConnected ? `Linked: ${t.whatsappPhone}` : "Disconnected"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-650 dark:text-slate-350">{t.contacts.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-650 dark:text-slate-350">{t.campaigns.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-650 dark:text-slate-350">{t.messagesSent.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-right font-black text-teal-600">{t.credits.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => { setSelectedTenant(t); setCreditsInput(t.credits); }} className="p-1 text-slate-400 hover:text-slate-600 rounded" title="Adjust Quotas">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Campaigns Moderation */}
        {activeTab === "campaigns" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">Live Dispatch Control</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input type="text" placeholder="Search campaign or tenant..." value={searchCampaign} onChange={(e) => setSearchCampaign(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="pb-3 pr-4">Tenant Company</th>
                    <th className="pb-3 pr-4">Campaign Name</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Template</th>
                    <th className="pb-3 pr-4 text-right">Messages Count</th>
                    <th className="pb-3 pr-4">Launch Date</th>
                    <th className="pb-3 text-right">Admin Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCampaigns.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                      <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">{c.company?.companyName}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-700 dark:text-slate-300">{c.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.status === "RUNNING" ? "bg-blue-100 text-blue-600 animate-pulse" : c.status === "FAILED" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-550"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-[10px] text-slate-400">{c.template?.name}</td>
                      <td className="py-3 pr-4 text-right font-bold text-slate-700 dark:text-slate-200">{(c._count?.logs || 0).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-right">
                        {c.status === "RUNNING" && (
                          <button onClick={() => handleSuspendCampaign(c.id)} className="px-2 py-0.5 bg-rose-650 hover:bg-rose-700 text-white rounded text-[9px] font-bold shadow-xs transition">
                            Suspend Send
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Credits Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-2">Adjust Tenant Credits</h3>
            <p className="text-[11px] text-slate-500 mb-4">Set available API / Messaging credits for <span className="font-bold text-slate-700 dark:text-slate-200">{selectedTenant.companyName}</span>.</p>

            <form onSubmit={handleUpdateCredits} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[9px]">Available Credits</label>
                <input type="number" required value={creditsInput} onChange={(e) => setCreditsInput(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-rose-500/20 outline-none" />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setSelectedTenant(null)} className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm transition">
                  Apply Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
}
