"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import {
  Send, Plus, Search, Filter, Trash2, Play, Pause, Copy,
  XCircle, Eye, Clock, Zap, BarChart3, ChevronRight,
  MessageCircle, ArrowRight
} from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.campaigns);
      setCampaigns(res.data.campaigns || res.data);
    } catch {
      setCampaigns([
        { id: "1", name: "Diwali Offer Campaign", status: "COMPLETED", messageBody: "Exclusive Diwali offer...", createdAt: "2025-10-15T10:00:00Z", _count: { logs: 1250 }, sentCount: 1200, deliveredCount: 1150, readCount: 890, failedCount: 50 },
        { id: "2", name: "New Year Greeting", status: "RUNNING", messageBody: "Happy New Year...", createdAt: "2025-12-31T00:00:00Z", _count: { logs: 3500 }, sentCount: 3200, deliveredCount: 2800, readCount: 1500, failedCount: 200 },
        { id: "3", name: "Weekly Newsletter", status: "DRAFT", messageBody: "Weekly updates...", createdAt: "2026-01-10T08:00:00Z", _count: { logs: 0 }, sentCount: 0, deliveredCount: 0, readCount: 0, failedCount: 0 },
        { id: "4", name: "Flash Sale Alert", status: "PAUSED", messageBody: "Flash sale live now...", createdAt: "2026-01-15T14:00:00Z", _count: { logs: 780 }, sentCount: 500, deliveredCount: 480, readCount: 320, failedCount: 20 },
        { id: "5", name: "Customer Feedback", status: "FAILED", messageBody: "Please rate us...", createdAt: "2026-01-20T09:00:00Z", _count: { logs: 150 }, sentCount: 50, deliveredCount: 30, readCount: 10, failedCount: 100 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleSend = async (id: string) => {
    if (!confirm("Launch this campaign now?")) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignSend(id));
      toast.success("Campaign launched!");
      fetchCampaigns();
    } catch { toast.error("Failed to launch campaign"); }
  };

  const handlePause = async (id: string) => {
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignPause(id));
      toast.info("Campaign paused");
      fetchCampaigns();
    } catch { toast.error("Failed to pause campaign"); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this campaign?")) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignCancel(id));
      toast.info("Campaign cancelled");
      fetchCampaigns();
    } catch { toast.error("Failed to cancel"); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignDuplicate(id));
      toast.success("Campaign duplicated!");
      fetchCampaigns();
    } catch { toast.error("Failed to duplicate"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await axiosInstance.delete(ENDPOINTS.whatsapp.campaignDetail(id));
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch { toast.error("Failed to delete"); }
  };

  const statusConfig: Record<string, { color: string; icon: any }> = {
    DRAFT: { color: "bg-slate-100 dark:bg-slate-800 text-slate-500", icon: Clock },
    SCHEDULED: { color: "bg-amber-100 dark:bg-amber-950/40 text-amber-600", icon: Clock },
    RUNNING: { color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600", icon: Zap },
    PAUSED: { color: "bg-orange-100 dark:bg-orange-950/40 text-orange-600", icon: Pause },
    COMPLETED: { color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600", icon: Send },
    FAILED: { color: "bg-rose-100 dark:bg-rose-950/40 text-rose-600", icon: XCircle },
  };

  const filtered = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">Campaigns <Send className="h-5 w-5 text-blue-500" /></h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create, manage, and launch WhatsApp marketing campaigns.</p>
          </div>
          <a href="/whatsapp/campaigns/create" className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Create Campaign
          </a>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2.5 w-full md:w-80 relative">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {["All", "DRAFT", "RUNNING", "SCHEDULED", "PAUSED", "COMPLETED", "FAILED"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === s ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700"}`}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign Cards */}
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((c) => {
            const sc = statusConfig[c.status] || statusConfig.DRAFT;
            const StatusIcon = sc.icon;
            const totalLogs = c._count?.logs || c.sentCount || 0;

            return (
              <div key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Icon + Name */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{c.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 shrink-0 ${sc.color}`}>
                          <StatusIcon className="h-2.5 w-2.5" /> {c.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{c.messageBody || "No message body"}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Created: {new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 text-center text-[10px]">
                    <div>
                      <p className="font-black text-base text-slate-900 dark:text-slate-100">{totalLogs.toLocaleString()}</p>
                      <span className="font-bold text-slate-400 uppercase">Messages</span>
                    </div>
                    <div>
                      <p className="font-black text-base text-emerald-600">{(c.deliveredCount || 0).toLocaleString()}</p>
                      <span className="font-bold text-slate-400 uppercase">Delivered</span>
                    </div>
                    <div>
                      <p className="font-black text-base text-violet-600">{(c.readCount || 0).toLocaleString()}</p>
                      <span className="font-bold text-slate-400 uppercase">Read</span>
                    </div>
                    <div>
                      <p className="font-black text-base text-rose-500">{(c.failedCount || 0).toLocaleString()}</p>
                      <span className="font-bold text-slate-400 uppercase">Failed</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                    {c.status === "DRAFT" && <button onClick={() => handleSend(c.id)} className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 transition" title="Send"><Play className="h-4 w-4" /></button>}
                    {c.status === "RUNNING" && <button onClick={() => handlePause(c.id)} className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 transition" title="Pause"><Pause className="h-4 w-4" /></button>}
                    {(c.status === "RUNNING" || c.status === "PAUSED") && <button onClick={() => handleCancel(c.id)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 transition" title="Cancel"><XCircle className="h-4 w-4" /></button>}
                    <button onClick={() => handleDuplicate(c.id)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-500 transition" title="Duplicate"><Copy className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-400 transition" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    <a href={`/whatsapp/campaigns/${c.id}`} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition" title="View Details"><ChevronRight className="h-4 w-4" /></a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Send className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold">No campaigns found</p>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
}
