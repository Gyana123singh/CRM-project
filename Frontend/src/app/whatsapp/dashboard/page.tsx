"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import {
  MessageCircle, Users, Send, BarChart3, TrendingUp,
  CheckCircle, XCircle, Eye, Clock, Zap, ArrowUpRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

export default function WhatsAppDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, trendsRes, recentRes] = await Promise.all([
          axiosInstance.get(ENDPOINTS.whatsapp.reportsDashboard),
          axiosInstance.get(ENDPOINTS.whatsapp.reportsTrends + "?period=daily"),
          axiosInstance.get(ENDPOINTS.whatsapp.reportsRecent),
        ]);
        setStats(statsRes.data);
        setTrends(trendsRes.data);
        setRecentActivity(recentRes.data);
      } catch (err) {
        console.error("Failed to load WhatsApp dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fallback mock data for display
  const displayStats = stats || {
    totalContacts: 1247,
    totalCampaigns: 24,
    totalGroups: 8,
    messages: {
      total: 15840,
      sent: 2100,
      delivered: 8230,
      read: 4120,
      failed: 390,
      queued: 1000,
      deliveryRate: "78.0",
      readRate: "26.0",
      failRate: "2.5",
    },
  };

  const mockTrends = trends.length > 0 ? trends : [
    { date: "Jun 15", delivered: 320, read: 180, failed: 12 },
    { date: "Jun 16", delivered: 480, read: 290, failed: 18 },
    { date: "Jun 17", delivered: 390, read: 210, failed: 8 },
    { date: "Jun 18", delivered: 560, read: 340, failed: 22 },
    { date: "Jun 19", delivered: 710, read: 420, failed: 15 },
    { date: "Jun 20", delivered: 620, read: 380, failed: 10 },
    { date: "Jun 21", delivered: 840, read: 510, failed: 25 },
  ];

  const pieData = [
    { name: "Delivered", value: displayStats.messages.delivered, color: "#10b981" },
    { name: "Read", value: displayStats.messages.read, color: "#6366f1" },
    { name: "Failed", value: displayStats.messages.failed, color: "#ef4444" },
    { name: "Queued", value: displayStats.messages.queued, color: "#f59e0b" },
  ];

  const kpiCards = [
    { label: "Total Contacts", value: displayStats.totalContacts.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Campaigns", value: displayStats.totalCampaigns.toLocaleString(), icon: Send, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Messages Sent", value: displayStats.messages.total.toLocaleString(), icon: MessageCircle, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Delivery Rate", value: `${displayStats.messages.deliveryRate}%`, icon: CheckCircle, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "Read Rate", value: `${displayStats.messages.readRate}%`, icon: Eye, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Failure Rate", value: `${displayStats.messages.failRate}%`, icon: XCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  const statusColors: Record<string, string> = {
    QUEUED: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
    SENT: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
    DELIVERED: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
    READ: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600",
    FAILED: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              WhatsApp Campaign Dashboard <MessageCircle className="h-6 w-6 text-emerald-500" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monitor your WhatsApp campaign performance, delivery metrics, and engagement analytics.
            </p>
          </div>
          <a
            href="/whatsapp/campaigns/create"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
          >
            <Zap className="h-4 w-4" /> New Campaign
          </a>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.bg} shrink-0`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">{card.label}</span>
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{card.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Line Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Message Delivery Trends
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Last 7 Days</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={mockTrends}>
                <defs>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: 700 }} />
                <Area type="monotone" dataKey="delivered" stroke="#10b981" fillOpacity={1} fill="url(#colorDelivered)" strokeWidth={2} />
                <Area type="monotone" dataKey="read" stroke="#6366f1" fillOpacity={1} fill="url(#colorRead)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-violet-500" /> Status Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  {item.name}: {item.value.toLocaleString()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-amber-500" /> Recent Message Activity
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-4">Contact</th>
                  <th className="pb-3 pr-4">Campaign</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(recentActivity.length > 0 ? recentActivity.slice(0, 10) : [
                  { contact: { firstName: "Rahul", lastName: "Sharma", mobile: "9876543210" }, campaign: { name: "Diwali Offer" }, status: "DELIVERED", createdAt: new Date().toISOString() },
                  { contact: { firstName: "Priya", lastName: "Patel", mobile: "9876543211" }, campaign: { name: "New Year Sale" }, status: "READ", createdAt: new Date().toISOString() },
                  { contact: { firstName: "Amit", lastName: "Kumar", mobile: "9876543212" }, campaign: { name: "Weekly Update" }, status: "FAILED", createdAt: new Date().toISOString() },
                  { contact: { firstName: "Sneha", lastName: "Gupta", mobile: "9876543213" }, campaign: { name: "Diwali Offer" }, status: "DELIVERED", createdAt: new Date().toISOString() },
                  { contact: { firstName: "Vikram", lastName: "Singh", mobile: "9876543214" }, campaign: { name: "Welcome Message" }, status: "READ", createdAt: new Date().toISOString() },
                ]).map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-[10px] uppercase">
                          {log.contact?.firstName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{log.contact?.firstName} {log.contact?.lastName}</span>
                          <span className="block text-[9px] text-slate-400">{log.contact?.mobile}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300">{log.campaign?.name}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColors[log.status] || "bg-slate-100 text-slate-500"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-400 font-medium">{new Date(log.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}
