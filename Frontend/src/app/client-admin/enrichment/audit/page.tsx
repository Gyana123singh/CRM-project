"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Search, Loader2, Play, FileText, CheckCircle, HelpCircle, Layers } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";
import Link from "next/link";

interface BatchItem {
  id: string;
  name: string;
  count: number;
}

interface AuditItem {
  id: string;
  target: string;
  score: number;
  status: string;
  createdAt: string;
}

export default function LeadAuditPage() {
  const [activeTab, setActiveTab] = useState<"batch" | "urls">("batch");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [limit, setLimit] = useState("All");
  const [loading, setLoading] = useState(false);
  const [leadBatches, setLeadBatches] = useState<BatchItem[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditItem[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  const fetchBatchesAndHistory = async () => {
    try {
      const batchRes = await axiosInstance.get("/api/client-admin/enrichments/batches");
      setLeadBatches(batchRes.data.leadBatches || []);

      const auditsRes = await axiosInstance.get("/api/client-admin/audits");
      setRecentAudits(auditsRes.data || []);
    } catch (error) {
      console.error("Failed to load audit page history:", error);
    }
  };

  const fetchQuotas = async () => {
    try {
      const response = await axiosInstance.get("/api/client-admin/billing/quotas");
      setCredits(response.data.credits);
    } catch (error) {
      console.error("Failed to fetch credits quota:", error);
    }
  };

  useEffect(() => {
    fetchBatchesAndHistory();
    fetchQuotas();
  }, []);

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetsCount = 0;
    let payload: any = {};

    if (activeTab === "batch") {
      if (!selectedBatch) {
        toast.error("Please select a Lead batch");
        return;
      }
      const batchObj = leadBatches.find(b => b.id === selectedBatch);
      if (batchObj) {
        targetsCount = batchObj.count;
        if (limit !== "All") {
          targetsCount = Math.min(targetsCount, parseInt(limit));
        }
      }
      payload = {
        batchId: selectedBatch,
        limit: limit === "All" ? undefined : parseInt(limit)
      };
    } else {
      const parsedUrls = urlsText
        .split(/[\n,]+/)
        .map(u => u.trim())
        .filter(u => u.length > 0);

      if (parsedUrls.length === 0) {
        toast.error("Please enter at least one URL to audit");
        return;
      }
      targetsCount = parsedUrls.length;
      payload = {
        urls: parsedUrls
      };
    }

    const totalCost = targetsCount * 2; // 2 credits per lead audit
    if (credits !== null && credits < totalCost) {
      toast.error(`Insufficient credits. Required: ${totalCost} credits. Available: ${credits} credits.`);
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/client-admin/enrichments/audit", payload);
      toast.success(res.data.message || `Successfully started audit for ${targetsCount} websites!`);
      setSelectedBatch("");
      setUrlsText("");
      fetchBatchesAndHistory();
      fetchQuotas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to start lead audit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Title Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Audit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quick-scan websites for issues — pull from Find & Detect or paste URLs
          </p>
        </div>

        {/* Informative Workflow steps */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">How The Lead Audit Works</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 text-xs font-black">1</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Pick leads or paste URLs</span>
              </div>
              <p className="text-[11px] text-slate-400">Use a Find & Detect batch or paste website URLs.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 text-xs font-black">2</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">AI scans each site</span>
              </div>
              <p className="text-[11px] text-slate-400">Checks mobile, SSL, speed, basic SEO, trust signals, CTA & contact info.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-black">3</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Scores & flags issues</span>
              </div>
              <p className="text-[11px] text-slate-400">Rates each lead (critical — good) with the fixable problems.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-black">4</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Prioritise prospects</span>
              </div>
              <p className="text-[11px] text-slate-400">Use the scores to choose who to enrich and pitch.</p>
            </div>

          </div>
        </div>

        {/* Input Form Selector Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
          
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab("batch")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "batch"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              From Find & Detect
            </button>
            <button
              onClick={() => setActiveTab("urls")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "urls"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              Paste URLs
            </button>
          </div>

          <form onSubmit={handleStartAudit} className="space-y-5">
            {activeTab === "batch" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="batch-select" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Source Batch</label>
                  <select
                    id="batch-select"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 appearance-none"
                  >
                    <option value="">Select a Find & Detect batch...</option>
                    {leadBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.count} leads)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="limit-select" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Limit (Optional)</label>
                  <select
                    id="limit-select"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 appearance-none"
                  >
                    <option value="All">All</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="urls-textarea" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Paste Website URLs</label>
                <textarea
                  id="urls-textarea"
                  rows={4}
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  placeholder="e.g. https://clinic.example.com&#10;https://lawyers-hub.in&#10;https://restaurant-place.org"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Cost & Submit Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-850">
              <div className="text-xs font-bold text-slate-400">
                Cost: <span className="text-teal-500 font-extrabold">2 credits per website audit</span>
                {credits !== null && <span className="ml-2 font-medium">(You have: {credits} credits)</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-primary to-teal-500 hover:scale-102 hover:shadow-lg text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Scanning Sites...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Start Audit
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* History of Audits */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-slate-50 mb-4">
            Recent Audit Runs
          </h3>

          {recentAudits.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400">
              No previous runs yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAudits.slice(0, 10).map((audit) => (
                <div
                  key={audit.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {audit.target}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                      <span>Audit Run: {new Date(audit.createdAt).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-350 dark:bg-slate-700" />
                      <span className="capitalize">{audit.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Health Score</span>
                      <span className={`text-sm font-black ${
                        audit.score >= 80 ? "text-emerald-500" : audit.score >= 50 ? "text-amber-500" : "text-rose-500"
                      }`}>{audit.score}/100</span>
                    </div>

                    <Link
                      href="/client-admin/audit/my-audits"
                      className="p-2.5 border border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                    >
                      <FileText className="h-4 w-4" /> View Report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardWrapper>
  );
}
