"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { ArrowRight, Loader2, FileText, Upload, AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";
import Link from "next/link";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

interface AuditItem {
  id: string;
  type: string;
  target: string;
  score: number;
  status: string;
  createdAt: string;
}

export default function SocialMediaPage() {
  const [platform, setPlatform] = useState<"instagram" | "facebook" | "linkedin" | "twitter">("instagram");
  const [accountType, setAccountType] = useState<"public" | "my-account">("public");
  const [profileUrl, setProfileUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentAudits, setRecentAudits] = useState<AuditItem[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const activeAuditIdRef = useRef<string | null>(null);

  const fetchRecentAudits = async () => {
    try {
      const response = await axiosInstance.get("/api/client-admin/audits?type=social");
      setRecentAudits(response.data);
    } catch (error) {
      console.error("Failed to fetch recent social audits:", error);
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
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      eventSource = new EventSource(`${apiBaseUrl}/api/realtime?token=${token}`);

      eventSource.addEventListener("audit-progress", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (activeAuditIdRef.current && data.auditId === activeAuditIdRef.current) {
            setProgress(data.progress || 0);
            setProgressMessage(data.message || "");

            if (data.status === "completed") {
              toast.success(data.message || "Social Audit completed successfully!");
              setLoading(false);
              setProfileUrl("");
              activeAuditIdRef.current = null;
              fetchRecentAudits();
              fetchQuotas();
            } else if (data.status === "failed") {
              toast.error(data.message || "Social Audit failed.");
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
    if (!profileUrl) {
      toast.error("Please enter a profile URL or handle");
      return;
    }

    if (credits !== null && credits < 5) {
      toast.error("Insufficient credits. Social Media Audit requires 5 credits.");
      return;
    }

    setLoading(true);
    setProgress(5);
    setProgressMessage("Submitting request to Social audit queue...");

    try {
      const response = await axiosInstance.post("/api/client-admin/audits/social", {
        platform,
        profileUrl,
        accountType
      });
      if (response.data && response.data.id) {
        activeAuditIdRef.current = response.data.id;
      } else {
        throw new Error("Audit ID not returned from queue");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to run social media audit.");
      setLoading(false);
      activeAuditIdRef.current = null;
    }
  };

  const platformMeta = {
    instagram: { name: "Instagram", icon: InstagramIcon, color: "border-pink-500 text-pink-500 bg-pink-500/5" },
    facebook: { name: "Facebook", icon: FacebookIcon, color: "border-blue-600 text-blue-600 bg-blue-600/5" },
    linkedin: { name: "LinkedIn", icon: LinkedinIcon, color: "border-sky-700 text-sky-700 bg-sky-700/5" },
    twitter: { name: "X / Twitter", icon: TwitterIcon, color: "border-slate-900 dark:border-slate-50 text-slate-900 dark:text-slate-50 bg-slate-900/5" }
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Social Media Audit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deep-dive audit of any social media profile — public or your own account with Insights data.
          </p>
        </div>

        {/* Workflow Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">How a Social Media Audit Works</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 text-xs font-black">1</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Platform & mode</span>
              </div>
              <p className="text-[11px] text-slate-400">Pick Instagram / Facebook / LinkedIn / X — a public profile or your own account.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 text-xs font-black">2</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Handle or screenshots</span>
              </div>
              <p className="text-[11px] text-slate-400">Enter the profile, or upload your Insights screenshots for real numbers.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-black">3</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">AI analysis</span>
              </div>
              <p className="text-[11px] text-slate-400">Reads public data via web search, or your uploaded insights via image vision.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-black">4</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Score + 30-day plan</span>
              </div>
              <p className="text-[11px] text-slate-400">A scored report, plus an optional 30-day content plan.</p>
            </div>
            
          </div>
        </div>

        {/* Input Panel Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
          <form onSubmit={handleRunAudit} suppressHydrationWarning className="space-y-6">
            
            {/* Platform Selection */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">1. Select Platform</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(platformMeta) as Array<keyof typeof platformMeta>).map((key) => {
                  const meta = platformMeta[key];
                  const Icon = meta.icon;
                  const isSelected = platform === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setPlatform(key)}
                      className={`flex flex-col items-center justify-center p-4 border rounded-xl transition ${
                        isSelected
                          ? `border-primary ring-2 ring-primary/20 ${meta.color}`
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                      }`}
                    >
                      <Icon className="h-6 w-6 mb-2" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">{meta.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account Type Mode */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">2. Account Type</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setAccountType("public")}
                  className={`p-4 border rounded-xl text-left transition select-none ${
                    accountType === "public"
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                  }`}
                >
                  <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-150">Public Account</div>
                  <p className="text-[10px] text-slate-400 mt-1">Analyse publicly visible data and page metadata.</p>
                </button>

                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setAccountType("my-account")}
                  className={`p-4 border rounded-xl text-left transition select-none ${
                    accountType === "my-account"
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850"
                  }`}
                >
                  <div className="text-xs font-black uppercase text-slate-800 dark:text-slate-150">My Account</div>
                  <p className="text-[10px] text-slate-400 mt-1">Upload profile + Insights screenshots for a deeper audit.</p>
                </button>
              </div>
            </div>

            {/* Handle Input & Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="handle-input" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  3. {platformMeta[platform].name} Handle or URL
                </label>
                <input
                  id="handle-input"
                  type="text"
                  suppressHydrationWarning
                  placeholder="@username or profile URL"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
                />
              </div>

              {accountType === "my-account" && (
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400 block">
                    Upload Insights Screenshots
                  </span>
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition min-h-[96px]">
                    <Upload className="h-5 w-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500">Drag files here or select file</span>
                    <span className="text-[8px] text-slate-400 mt-0.5">JPG, PNG up to 5MB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Warning alert if insufficient credits */}
            {credits !== null && credits < 5 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-amber-600 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <span>Insufficient credits. Social Media Audit requires 5 credits (You have: {credits} credits).</span>
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Crawling profile...
                  </>
                ) : (
                  <>
                    Run {platformMeta[platform].name} Audit <ArrowRight className="h-4 w-4" />
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
                  Real-time Social Media Audit Progress
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

              <p className="text-xs text-slate-600 dark:text-slate-355 font-semibold text-center italic">
                &ldquo;{progressMessage || "Waiting for worker to start..."}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-slate-50 mb-4">
            Recent Social Media Audits
          </h3>

          {recentAudits.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400">
              No previous runs found. Specify a profile above to start.
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
                      Social Audit • {item.createdAt.split("T")[0]}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-bold uppercase">Profile Score</div>
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
