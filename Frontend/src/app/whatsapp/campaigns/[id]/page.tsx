"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, Clock, RefreshCw, Send, Play, Pause, Trash2,
  XCircle, Copy, AlertTriangle, MessageCircle, BarChart3, Users,
  CheckCircle, ShieldAlert, Eye, Search, ExternalLink
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchDetails = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.campaignDetail(id));
      setData(res.data);
    } catch {
      // Fallback dummy data for development without DB connection
      setData({
        campaign: {
          id,
          name: "Diwali Offer Campaign",
          status: "RUNNING",
          createdAt: "2026-06-22T10:00:00Z",
          scheduledTime: null,
          template: { name: "welcome_message", category: "marketing", bodyText: "Hello {{name}},\n\nGet 20% order discount today!" },
          audiences: [{ id: "1", name: "High Value Leads" }],
          logs: [
            { id: "l1", status: "READ", createdAt: "2026-06-22T10:05:00Z", deliveredAt: "2026-06-22T10:05:05Z", readAt: "2026-06-22T10:08:12Z", contact: { firstName: "Rahul", lastName: "Sharma", mobile: "9876543210", countryCode: "91" } },
            { id: "l2", status: "DELIVERED", createdAt: "2026-06-22T10:05:02Z", deliveredAt: "2026-06-22T10:05:10Z", readAt: null, contact: { firstName: "Priya", lastName: "Patel", mobile: "9988776655", countryCode: "91" } },
            { id: "l3", status: "SENT", createdAt: "2026-06-22T10:05:05Z", deliveredAt: null, readAt: null, contact: { firstName: "Amit", lastName: "Verma", mobile: "8877665544", countryCode: "91" } },
            { id: "l4", status: "FAILED", createdAt: "2026-06-22T10:05:10Z", deliveredAt: null, readAt: null, failedReason: "Incorrect mobile number format / User not on WhatsApp", contact: { firstName: "John", lastName: "Doe", mobile: "1234567890", countryCode: "1" } },
            { id: "l5", status: "QUEUED", createdAt: "2026-06-22T10:05:15Z", deliveredAt: null, readAt: null, contact: { firstName: "Vikram", lastName: "Singh", mobile: "7766554433", countryCode: "91" } }
          ]
        },
        metrics: {
          total: 5,
          queued: 1,
          sent: 1,
          delivered: 1,
          read: 1,
          failed: 1,
          deliveryRate: 40.0,
          readRate: 20.0,
          failRate: 20.0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleSend = async () => {
    if (!confirm("Launch this campaign now?")) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignSend(id));
      toast.success("Campaign launched!");
      fetchDetails();
    } catch { toast.error("Failed to launch campaign"); }
  };

  const handlePause = async () => {
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignPause(id));
      toast.info("Campaign paused");
      fetchDetails();
    } catch { toast.error("Failed to pause campaign"); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this campaign?")) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignCancel(id));
      toast.info("Campaign schedule cancelled");
      fetchDetails();
    } catch { toast.error("Failed to cancel schedule"); }
  };

  const handleDuplicate = async () => {
    try {
      const res = await axiosInstance.post(ENDPOINTS.whatsapp.campaignDuplicate(id));
      toast.success("Campaign duplicated!");
      router.push(`/whatsapp/campaigns/${res.data.id || res.data}`);
    } catch { toast.error("Failed to duplicate campaign"); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this campaign? This action is irreversible.")) return;
    try {
      await axiosInstance.delete(ENDPOINTS.whatsapp.campaignDetail(id));
      toast.success("Campaign deleted");
      router.push("/whatsapp/campaigns");
    } catch { toast.error("Failed to delete campaign"); }
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      </DashboardWrapper>
    );
  }

  if (!data || !data.campaign) {
    return (
      <DashboardWrapper>
        <div className="py-16 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Campaign Not Found</h2>
          <button onClick={() => router.push("/whatsapp/campaigns")} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200">
            Back to Campaigns
          </button>
        </div>
      </DashboardWrapper>
    );
  }

  const { campaign, metrics } = data;

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700",
    SCHEDULED: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-250/20",
    RUNNING: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-250/20 animate-pulse",
    PAUSED: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 border border-orange-250/20",
    COMPLETED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-250/20",
    FAILED: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-250/20",
  };

  const logStatusColors: Record<string, string> = {
    QUEUED: "bg-slate-100 dark:bg-slate-800 text-slate-500",
    SENT: "bg-blue-150 dark:bg-blue-950/30 text-blue-600",
    DELIVERED: "bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600",
    READ: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600",
    FAILED: "bg-rose-100 dark:bg-rose-950/30 text-rose-600",
  };

  // Pie Chart Data
  const pieData = [
    { name: "Queued", value: metrics.queued, color: "#94a3b8" },
    { name: "Sent", value: metrics.sent, color: "#3b82f6" },
    { name: "Delivered", value: metrics.delivered, color: "#6366f1" },
    { name: "Read", value: metrics.read, color: "#10b981" },
    { name: "Failed", value: metrics.failed, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // Filter message logs
  const filteredLogs = (campaign.logs || []).filter((log: any) => {
    const contactName = `${log.contact?.firstName || ""} ${log.contact?.lastName || ""}`.toLowerCase();
    const phone = `${log.contact?.mobile || ""}`;
    const matchesSearch = contactName.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
    const matchesStatus = statusFilter === "ALL" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/whatsapp/campaigns")} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:scale-105 transition text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campaign detail dashboard</span>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">{campaign.name}</h1>
          </div>
        </div>

        {/* Info Grid & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Details Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Current Status</span>
                <div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[campaign.status] || statusColors.DRAFT}`}>
                    {campaign.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {campaign.status === "DRAFT" && (
                  <button onClick={handleSend} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                    <Play className="h-3.5 w-3.5" /> Launch Now
                  </button>
                )}
                {campaign.status === "RUNNING" && (
                  <button onClick={handlePause} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                    <Pause className="h-3.5 w-3.5" /> Pause Sending
                  </button>
                )}
                {campaign.status === "SCHEDULED" && (
                  <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                    <XCircle className="h-3.5 w-3.5" /> Cancel Schedule
                  </button>
                )}
                <button onClick={handleDuplicate} className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition" title="Duplicate Campaign">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={handleDelete} className="p-2 border border-rose-200 dark:border-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-rose-500 hover:text-rose-600 transition" title="Delete Campaign">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1"><MessageCircle className="h-3 w-3 text-indigo-500" /> Template Name</span>
                <p className="font-black text-slate-900 dark:text-slate-100">{campaign.template?.name || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1"><Users className="h-3 w-3 text-indigo-500" /> Target Audiences</span>
                <p className="font-black text-slate-900 dark:text-slate-100 truncate">
                  {campaign.audiences?.map((a: any) => a.name).join(", ") || "No audience groups"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1"><Calendar className="h-3 w-3 text-indigo-500" /> Scheduled Time</span>
                <p className="font-black text-slate-900 dark:text-slate-100">
                  {campaign.scheduledTime ? new Date(campaign.scheduledTime).toLocaleString() : "Send Immediately / Direct"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1"><Clock className="h-3 w-3 text-indigo-500" /> Created At</span>
                <p className="font-black text-slate-900 dark:text-slate-100">
                  {new Date(campaign.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Template Body Text Box */}
            {campaign.template?.bodyText && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <span className="font-bold text-slate-400 uppercase text-[9px] block mb-2">Message Body Preview</span>
                <div className="bg-[#e5ddd5] dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 relative max-w-md">
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#e5ddd5] dark:bg-slate-950 border-l border-t border-slate-200 dark:border-slate-800 transform rotate-45" />
                  <div className="bg-white dark:bg-slate-850 rounded-xl rounded-tl-sm p-3 shadow-xs">
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {campaign.template.bodyText}
                    </p>
                    <span className="block text-right text-[8px] text-slate-400 mt-1">{new Date(campaign.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Performance rates / Visual chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" /> Delivery Split
            </h3>

            {pieData.length > 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[160px]">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 10, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-wrap justify-center gap-2 mt-4 text-[9px] font-bold text-slate-500">
                  {pieData.map(entry => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-455 text-xs text-center">
                <MessageCircle className="h-8 w-8 text-slate-300 mb-2" />
                <p>No messages sent yet</p>
                <p className="text-[10px] text-slate-400">Launch campaign to see metrics</p>
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-lg font-black text-emerald-600">{metrics.deliveryRate.toFixed(1)}%</p>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Delivery Rate</span>
              </div>
              <div>
                <p className="text-lg font-black text-indigo-600">{metrics.readRate.toFixed(1)}%</p>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Read Rate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Queued", value: metrics.queued, color: "text-slate-500", bg: "bg-slate-500/10" },
            { label: "Sent", value: metrics.sent, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Delivered", value: metrics.delivered, color: "text-indigo-500", bg: "bg-indigo-500/10" },
            { label: "Read", value: metrics.read, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Failed", value: metrics.failed, color: "text-rose-500", bg: "bg-rose-500/10" }
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase">{stat.label}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${stat.bg}`} />
              </div>
              <p className={`text-xl font-black ${stat.color}`}>{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Message Logs Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">Message Delivery Logs</h3>
              <p className="text-[11px] text-slate-400">Detailed list of the first 100 message dispatches for validation.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input type="text" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition" />
              </div>
              {/* Status Filter */}
              <div className="flex gap-1 text-[10px]">
                {["ALL", "QUEUED", "SENT", "DELIVERED", "READ", "FAILED"].map(status => (
                  <button key={status} onClick={() => setStatusFilter(status)}
                    className={`px-2 py-1 rounded font-bold transition ${statusFilter === status ? "bg-slate-900 text-white dark:bg-slate-850" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"}`}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-4">Recipient Name</th>
                  <th className="pb-3 pr-4">Phone Number</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Sent Time</th>
                  <th className="pb-3 pr-4">Delivered Time</th>
                  <th className="pb-3 pr-4">Read Time</th>
                  <th className="pb-3">Failure Reason / Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log: any) => {
                  const name = `${log.contact?.firstName || ""} ${log.contact?.lastName || ""}`.trim() || "Unknown Contact";
                  const phone = `+${log.contact?.countryCode || "91"} ${log.contact?.mobile || ""}`;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                      <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">{name}</td>
                      <td className="py-3 pr-4 text-slate-550 dark:text-slate-400 font-semibold">{phone}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${logStatusColors[log.status] || logStatusColors.QUEUED}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"}</td>
                      <td className="py-3 pr-4 text-slate-400">{log.deliveredAt ? new Date(log.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"}</td>
                      <td className="py-3 pr-4 text-slate-400">{log.readAt ? new Date(log.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "-"}</td>
                      <td className="py-3 text-rose-500 font-medium max-w-xs truncate" title={log.failedReason}>
                        {log.failedReason || "-"}
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                      No matching log entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}
