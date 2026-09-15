"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import { Clock, Calendar, XCircle, Play, Send, MessageCircle, Loader2 } from "lucide-react";

export default function ScheduledCampaignsPage() {
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduled = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.scheduled);
      setScheduled(res.data);
    } catch {
      setScheduled([
        { id: "1", name: "Valentine's Day Sale", scheduledAt: "2026-02-14T09:00:00Z", status: "SCHEDULED", messageBody: "Celebrate love with 30% off...", groupName: "Premium Customers", _count: { logs: 245 } },
        { id: "2", name: "Weekend Flash Sale", scheduledAt: "2026-01-25T18:00:00Z", status: "SCHEDULED", messageBody: "This weekend only! Flat 50%...", groupName: "All Contacts", _count: { logs: 1200 } },
        { id: "3", name: "Monthly Newsletter", scheduledAt: "2026-02-01T10:00:00Z", status: "SCHEDULED", messageBody: "Monthly roundup of updates...", groupName: "Leads", _count: { logs: 892 } },
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchScheduled(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this scheduled campaign?")) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignCancel(id));
      toast.info("Scheduled campaign cancelled");
      fetchScheduled();
    } catch { toast.error("Failed to cancel"); }
  };

  const handleSendNow = async (id: string) => {
    if (!confirm("Send this campaign immediately instead of at the scheduled time?")) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.campaignSend(id));
      toast.success("Campaign launched now!");
      fetchScheduled();
    } catch { toast.error("Failed to send"); }
  };

  const formatCountdown = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return "Overdue";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">Scheduled Campaigns <Clock className="h-5 w-5 text-amber-500" /></h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage upcoming scheduled campaign sends.</p>
        </div>

        {/* Timeline Cards */}
        <div className="space-y-4">
          {scheduled.map((s) => (
            <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all relative group">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-6 w-6 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{s.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-600">Scheduled</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.messageBody}</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(s.scheduledAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> in {formatCountdown(s.scheduledAt)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {s.groupName || "All Contacts"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleSendNow(s.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow transition">
                    <Play className="h-3 w-3" /> Send Now
                  </button>
                  <button onClick={() => handleCancel(s.id)} className="flex items-center gap-1 px-3 py-1.5 border border-rose-200 dark:border-rose-800/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-[10px] font-bold transition">
                    <XCircle className="h-3 w-3" /> Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {scheduled.length === 0 && !loading && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Clock className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold">No scheduled campaigns</p>
            <p className="text-[10px] text-slate-400">Schedule a campaign from the Create Campaign page</p>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
}
