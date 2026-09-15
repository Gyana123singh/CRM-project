"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Search, HelpCircle, Check, Loader2, FileText, ArrowRight, ShieldCheck, Star, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";
import Link from "next/link";

interface AuditItem {
  id: string;
  type: string;
  target: string;
  score: number;
  status: string;
  createdAt: string;
}

export default function WebsiteSEOPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentAudits, setRecentAudits] = useState<AuditItem[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const activeAuditIdRef = useRef<string | null>(null);

  // Audit configuration checkboxes
  const [options, setOptions] = useState({
    onPage: true,
    technical: true,
    offPage: true,
    local: true,
    competitor: true,
    quickWins: true
  });

  const fetchRecentAudits = async () => {
    try {
      const response = await axiosInstance.get("/api/client-admin/audits?type=seo");
      setRecentAudits(response.data);
    } catch (error) {
      console.error("Failed to fetch recent SEO audits:", error);
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
    fetchRecentAudits();
    fetchQuotas();

    let eventSource: EventSource | null = null;
    const token = localStorage.getItem("token");
    if (token) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      eventSource = new EventSource(`${apiBaseUrl}/api/realtime?token=${token}`);

      eventSource.addEventListener("audit-progress", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (activeAuditIdRef.current && data.auditId === activeAuditIdRef.current) {
            setProgress(data.progress || 0);
            setProgressMessage(data.message || "");

            if (data.status === "completed") {
              toast.success(data.message || "SEO Audit completed successfully!");
              setLoading(false);
              setUrl("");
              activeAuditIdRef.current = null;
              fetchRecentAudits();
              fetchQuotas();
            } else if (data.status === "failed") {
              toast.error(data.message || "SEO Audit failed.");
              setLoading(false);
              activeAuditIdRef.current = null;
              fetchQuotas();
            }
          }
        } catch (err) {
          console.error("Error parsing progress event:", err);
        }
      });
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Please enter a valid website URL");
      return;
    }

    if (credits !== null && credits < 5) {
      toast.error("Insufficient credits. SEO Audit requires 5 credits.");
      return;
    }

    setLoading(true);
    setProgress(5);
    setProgressMessage("Submitting request to audit queue...");

    try {
      const response = await axiosInstance.post("/api/client-admin/audits/seo", {
        url,
        options
      });
      if (response.data && response.data.id) {
        activeAuditIdRef.current = response.data.id;
      } else {
        throw new Error("Audit ID not returned from queue");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to run website SEO audit.");
      setLoading(false);
      activeAuditIdRef.current = null;
    }
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Website SEO
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Comprehensive SEO audit covering on-page, technical, off-page, and local SEO factors.
          </p>
        </div>

        {/* Workflow Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">How Website SEO Works</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 text-xs font-black">1</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Enter the URL</span>
              </div>
              <p className="text-[11px] text-slate-400">Paste the website you want to audit.</p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 text-xs font-black">2</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">AI research & crawl</span>
              </div>
              <p className="text-[11px] text-slate-400">Live web search inspects on-page, technical, off-page & local SEO.</p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-black">3</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Scored by area</span>
              </div>
              <p className="text-[11px] text-slate-400">Grades on-page, technical, off-page, local, competitors & quick wins.</p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-black">4</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Report + PDF</span>
              </div>
              <p className="text-[11px] text-slate-400">A scored report with issues, fixes and a downloadable PDF.</p>
            </div>
            
          </div>
        </div>

        {/* Input Form Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-5">
          <form onSubmit={handleRunAudit} suppressHydrationWarning className="space-y-4">
            
            <div className="space-y-2">
              <label htmlFor="website-url" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Website URL</label>
              <div className="relative">
                <input
                  id="website-url"
                  type="text"
                  suppressHydrationWarning
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Checklist options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: "onPage", label: "On-Page SEO" },
                { key: "technical", label: "Technical SEO" },
                { key: "offPage", label: "Off-Page Signals" },
                { key: "local", label: "Local SEO" },
                { key: "competitor", label: "Competitor Analysis" },
                { key: "quickWins", label: "Quick Wins" }
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    suppressHydrationWarning
                    checked={(options as any)[opt.key]}
                    onChange={() => setOptions(prev => ({ ...prev, [opt.key]: !(prev as any)[opt.key] }))}
                    className="h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500 accent-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Warning alert if insufficient credits */}
            {credits !== null && credits < 5 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>Insufficient credits. Website SEO Audit requires 5 credits (You have: {credits} credits).</span>
                </div>
                <Link
                  href="/client-admin/billing?tab=credits"
                  className="px-3.5 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-650 hover:scale-102 transition font-black text-[10px] uppercase tracking-wider shrink-0"
                >
                  Buy Credits
                </Link>
              </div>
            )}

            {/* Trigger Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-850">
              <div className="text-xs font-bold text-slate-400">
                Cost: <span className="text-teal-500 font-extrabold">5 credits</span>
                {credits !== null && <span className="ml-2 font-medium">(You have: {credits} credits)</span>}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                suppressHydrationWarning
                className="px-6 py-3 bg-gradient-to-r from-primary to-teal-500 hover:scale-102 hover:shadow-lg text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating Audit...
                  </>
                ) : (
                  <>
                    Run SEO Audit <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            
          </form>

          {/* Progress Card */}
          {loading && (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl space-y-4 animate-fade-in mt-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary animate-pulse" />
                  Real-time Audit Progress
                </span>
                <span>{progress}%</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-teal-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-350 font-semibold text-center italic">
                &ldquo;{progressMessage || "Waiting for worker to start..."}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-slate-50 mb-4">
            Recent Website SEO Audits
          </h3>

          {recentAudits.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400">
              No previous runs found. Submit a URL above to start.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAudits.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                >
                  <div className="space-y-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{item.target}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Website SEO • {item.createdAt.split("T")[0]}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-bold uppercase">SEO Score</div>
                      <div className="text-sm font-black text-teal-500">{item.score}/100</div>
                    </div>
                    
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 text-[9px] font-black uppercase">
                      {item.status}
                    </span>
                    
                    <Link
                      href="/client-admin/audit/my-audits"
                      className="p-2 border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
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
