"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, setLeads } from "@/store";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import {
  Users,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Activity,
  Zap,
  PhoneCall,
  CalendarDays,
  Target
} from "lucide-react";

export default function ClientAdminDashboard() {
  const dispatch = useDispatch();
  const leads = useSelector((state: RootState) => state.leads.leads);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const response = await axiosInstance.get(ENDPOINTS.leads.base);
        dispatch(setLeads(response.data));
      } catch (error) {
        console.error("Failed to fetch leads for dashboard:", error);
      }
    }
    fetchLeads();
  }, [dispatch]);

  // Calculate Stats
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "New").length;
  const interestedLeads = leads.filter((l) => l.status === "Interested").length;
  const convertedLeads = leads.filter((l) => l.status === "Converted").length;
  const lostLeads = leads.filter((l) => l.status === "Lost").length;
  const followUpLeads = leads.filter((l) => l.status === "Follow-up").length;

  const getSourceCount = (srcName: string) => leads.filter((l) => l.source === srcName).length;
  const sourceMetaCount = getSourceCount("Meta Ads");
  const sourceWhatsAppCount = getSourceCount("WhatsApp");
  const sourceWebsiteCount = getSourceCount("Website Forms");
  const sourceGoogleCount = getSourceCount("Google Ads");
  const sourceLandingCount = getSourceCount("Landing Pages");
  const sourceManualCount = getSourceCount("Manual Entry");

  const totalSourcesCount = totalLeads || 1;

  const leadChannels = [
    { source: "Meta Ads", count: sourceMetaCount, color: "bg-blue-500" },
    { source: "WhatsApp Channel", count: sourceWhatsAppCount, color: "bg-emerald-500" },
    { source: "Website Forms", count: sourceWebsiteCount, color: "bg-indigo-500" },
    { source: "Google Search Ads", count: sourceGoogleCount, color: "bg-amber-500" },
  ];

  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Workspace Dashboard <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time lead conversions, automated AI auto-responses, and WhatsApp channel metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Live updates sync active
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="relative group overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl transition hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-light" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Inquiries</span>
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{totalLeads}</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +12%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Leads captured across all sources</p>
        </div>

        {/* KPI 2 */}
        <div className="relative group overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl transition hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Converted</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Target className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{convertedLeads}</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {conversionRate}% Rate
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Successfully closed sales deals</p>
        </div>

        {/* KPI 3 */}
        <div className="relative group overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl transition hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Reminders</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-50">{followUpLeads + newLeads}</span>
            <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5 animate-pulse">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires immediate sales actions</p>
        </div>

        {/* KPI 4 */}
        <div className="relative group overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl transition hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Bot Responses</span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <Zap className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-50">92%</span>
            <span className="text-xs font-semibold text-purple-500">
              Auto-Pilot
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Chatbot query answering success</p>
        </div>
      </div>

      {/* Main Charts & Lists Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Analytics Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Conversion Trends</span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-50">Monthly Lead Acquisition</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Meta Ads
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> WhatsApp
              </span>
            </div>
          </div>

          {/* Premium SVG Area/Line Chart Mock */}
          <div className="relative w-full h-64 border-b border-slate-100 dark:border-slate-800 flex items-end">
            {/* SVG Mesh Grid */}
            <svg className="absolute inset-0 h-full w-full opacity-10" fill="none">
              <line x1="0" y1="50" x2="100%" y2="50" stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1="100" x2="100%" y2="100" stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1="150" x2="100%" y2="150" stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1="200" x2="100%" y2="200" stroke="currentColor" strokeWidth="1" />
            </svg>

            {/* Custom Interactive HSL Area Path */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Meta Ads Gradient Path */}
              <path
                d="M 0 200 Q 100 130 200 150 T 400 60 T 600 30"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 0 200 Q 100 130 200 150 T 400 60 T 600 30 L 600 240 L 0 240 Z"
                fill="url(#gradient-area)"
              />

              {/* WhatsApp Path */}
              <path
                d="M 0 220 Q 120 180 240 100 T 480 80 T 600 10"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
            </svg>

            {/* Chart X Labels */}
            <div className="absolute bottom-[-24px] left-0 right-0 flex justify-between text-[9px] uppercase font-bold text-slate-400 px-2">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Right Column: Lead Sources & Hot Updates */}
        <div className="space-y-6">
          {/* Box 1: Sources */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">
              Lead Channels
            </h3>

            <div className="space-y-3">
              {leadChannels.map((src) => {
                const percentage = Math.round((src.count / totalSourcesCount) * 100);
                return (
                  <div key={src.source} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">{src.source}</span>
                      <span className="text-slate-400">{src.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full ${src.color} rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box 2: Instant Campaign Alerts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">
                Campaign Alerts
              </h3>
              <span className="text-[10px] font-bold text-amber-500 px-2 py-0.5 rounded bg-amber-500/10 flex items-center gap-1">
                <Zap className="h-3 w-3 animate-bounce" /> Hot Leads
              </span>
            </div>

            <div className="space-y-3.5">
              {leads.slice(0, 3).map((lead) => (
                <div key={lead.id} className="flex gap-3 items-start text-xs border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                    {lead.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{lead.name}</span>
                      <span className="text-[9px] text-slate-400">Just now</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {lead.serviceInterest}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                        {lead.source}
                      </span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded">
                        {lead.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

