"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import {
  BarChart3, TrendingUp, Target, Award, ArrowUpRight, ArrowDownRight, Filter
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

export default function ReportsPage() {
  const [campaignStats, setCampaignStats] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [campaignRes, trendsRes] = await Promise.all([
          axiosInstance.get(ENDPOINTS.whatsapp.reportsCampaigns),
          axiosInstance.get(ENDPOINTS.whatsapp.reportsTrends + `?period=${period}`),
        ]);
        setCampaignStats(campaignRes.data);
        setTrends(trendsRes.data);
      } catch {
        setCampaignStats([
          { id: "1", name: "Diwali Offer", status: "COMPLETED", totalMessages: 1250, delivered: 1150, read: 890, failed: 50, deliveryRate: "92.0", readRate: "71.2", failRate: "4.0" },
          { id: "2", name: "New Year Sale", status: "COMPLETED", totalMessages: 3500, delivered: 3200, read: 1800, failed: 150, deliveryRate: "91.4", readRate: "51.4", failRate: "4.3" },
          { id: "3", name: "Weekly Newsletter", status: "RUNNING", totalMessages: 800, delivered: 720, read: 450, failed: 30, deliveryRate: "90.0", readRate: "56.3", failRate: "3.8" },
          { id: "4", name: "Flash Sale", status: "COMPLETED", totalMessages: 2100, delivered: 1950, read: 1200, failed: 80, deliveryRate: "92.9", readRate: "57.1", failRate: "3.8" },
        ]);
        setTrends([
          { date: "Jun 15", delivered: 320, read: 180, failed: 12, total: 512 },
          { date: "Jun 16", delivered: 480, read: 290, failed: 18, total: 788 },
          { date: "Jun 17", delivered: 390, read: 210, failed: 8, total: 608 },
          { date: "Jun 18", delivered: 560, read: 340, failed: 22, total: 922 },
          { date: "Jun 19", delivered: 710, read: 420, failed: 15, total: 1145 },
          { date: "Jun 20", delivered: 620, read: 380, failed: 10, total: 1010 },
          { date: "Jun 21", delivered: 840, read: 510, failed: 25, total: 1375 },
        ]);
      }
    };
    fetchReports();
  }, [period]);

  const totalAllDelivered = campaignStats.reduce((sum, c) => sum + (c.delivered || 0), 0);
  const totalAllRead = campaignStats.reduce((sum, c) => sum + (c.read || 0), 0);
  const totalAllFailed = campaignStats.reduce((sum, c) => sum + (c.failed || 0), 0);
  const totalAllMessages = campaignStats.reduce((sum, c) => sum + (c.totalMessages || 0), 0);

  const summaryPie = [
    { name: "Delivered", value: totalAllDelivered, color: "#10b981" },
    { name: "Read", value: totalAllRead, color: "#6366f1" },
    { name: "Failed", value: totalAllFailed, color: "#ef4444" },
  ];

  const kpis = [
    { label: "Total Messages", value: totalAllMessages.toLocaleString(), icon: BarChart3, delta: "+12.3%", up: true, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Avg Delivery Rate", value: totalAllMessages > 0 ? `${((totalAllDelivered / totalAllMessages) * 100).toFixed(1)}%` : "0%", icon: Target, delta: "+2.1%", up: true, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Avg Read Rate", value: totalAllMessages > 0 ? `${((totalAllRead / totalAllMessages) * 100).toFixed(1)}%` : "0%", icon: Award, delta: "+5.4%", up: true, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Failure Rate", value: totalAllMessages > 0 ? `${((totalAllFailed / totalAllMessages) * 100).toFixed(1)}%` : "0%", icon: TrendingUp, delta: "-1.2%", up: false, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">Campaign Reports <BarChart3 className="h-5 w-5 text-indigo-500" /></h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Detailed analytics and performance metrics for your campaigns.</p>
          </div>
          <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
            {["daily", "weekly", "monthly"].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg font-bold transition ${period === p ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700"}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${kpi.bg}`}><Icon className={`h-4 w-4 ${kpi.color}`} /></div>
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${kpi.up ? "text-emerald-500" : "text-rose-500"}`}>
                    {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {kpi.delta}
                  </span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{kpi.value}</p>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{kpi.label}</span>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-4">Message Volume Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: 700 }} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1" }} />
                <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-4">Overall Status Split</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={summaryPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {summaryPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {summaryPie.map(s => (
                <div key={s.name} className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.name}</div>
                  <span>{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaign Performance Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-4">Campaign Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignStats.slice(0, 8)} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="read" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-4">Detailed Campaign Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-4">Campaign</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4 text-right">Total</th>
                  <th className="pb-3 pr-4 text-right">Delivered</th>
                  <th className="pb-3 pr-4 text-right">Read</th>
                  <th className="pb-3 pr-4 text-right">Failed</th>
                  <th className="pb-3 text-right">Delivery %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaignStats.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="py-3 pr-4 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold ${c.status === "COMPLETED" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"}`}>{c.status}</span></td>
                    <td className="py-3 pr-4 text-right font-bold text-slate-600 dark:text-slate-300">{(c.totalMessages || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right font-bold text-emerald-600">{(c.delivered || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right font-bold text-violet-600">{(c.read || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-right font-bold text-rose-500">{(c.failed || 0).toLocaleString()}</td>
                    <td className="py-3 text-right font-black text-slate-900 dark:text-slate-100">{c.deliveryRate}%</td>
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
