"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Check, X, ShieldAlert, ShieldCheck, Loader2, Upload, Trash2, Mail } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";
import { API_URL } from "@/utils/axiosInstance";

interface ValidationItem {
  id: string;
  email: string;
  syntaxValid: boolean;
  mxCheck: boolean;
  smtpValid: boolean;
  disposable: boolean;
  catchAll: boolean;
  status: string; // "valid" | "invalid" | "risky" | "catch-all"
  createdAt: string;
}

export default function ValidateEmailsPage() {
  const [emailsText, setEmailsText] = useState("");
  const [recheck, setRecheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ValidationItem[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  // SSE and Progress tracking state
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");

  const fetchHistory = async () => {
    try {
      const response = await axiosInstance.get("/api/client-admin/enrichments/validations");
      setHistory(response.data || []);
    } catch (error) {
      console.error("Failed to load validation history:", error);
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
    fetchHistory();
    fetchQuotas();
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && runStatus === "running") {
      const url = `${API_URL}/api/realtime?token=${token}`;
      console.log("[ValidateEmailsPage] Connecting to SSE at:", url);
      eventSource = new EventSource(url);

      eventSource.addEventListener("enrich-progress", (e: any) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[ValidateEmailsPage] SSE Event:", data);
          if (data.type === "validate-emails") {
            setProgress(data.progress);
            setStatusMsg(data.message);
            if (data.status === "completed") {
              setRunStatus("completed");
              setLoading(false);
              toast.success(data.message || "Email validation complete!");
              fetchHistory();
              fetchQuotas();
            } else if (data.status === "failed") {
              setRunStatus("failed");
              setLoading(false);
              toast.error(data.message || "Email validation failed.");
              fetchQuotas();
            }
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      });

      eventSource.onerror = (err) => {
        console.error("[ValidateEmailsPage] EventSource connection error:", err);
      };
    }

    return () => {
      if (eventSource) {
        console.log("[ValidateEmailsPage] Closing EventSource connection");
        eventSource.close();
      }
    };
  }, [runStatus]);

  // Compute stats on current input text
  const emailList = emailsText
    .split(/[\s,]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes("@"));
  const uniqueCount = Array.from(new Set(emailList)).length;
  const cost = uniqueCount * 1; // 1 credit per unique email

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uniqueCount === 0) {
      toast.error("Please paste at least one valid email address format");
      return;
    }

    if (credits !== null && credits < cost) {
      toast.error(`Insufficient credits. Required: ${cost} credits. Available: ${credits} credits.`);
      return;
    }

    setLoading(true);
    setRunStatus("running");
    setProgress(0);
    setStatusMsg("Initializing email validations...");

    try {
      await axiosInstance.post("/api/client-admin/enrichments/validate-emails", {
        emails: emailList
      });
      toast.info("Email validations started in background!");
      setEmailsText("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to validate email list.");
      setRunStatus("failed");
      setLoading(false);
    }
  };

  // Mock File Upload functionality
  const handleFileUpload = () => {
    toast.info("Select a CSV or TXT file to extract email listings.");
    // In a real environment, trigger standard input. For mock, populate values.
    const mockEmails = "hello@agency.in, support@wix.com, ceo@wordpress.org, admin@shopify.com";
    setEmailsText(mockEmails);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25";
      case "risky":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25";
      case "catch-all":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25";
      default:
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25";
    }
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Email Validation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Paste a list or upload a file (CSV/TXT) of email addresses. Custom/business domains are verified live via the mail server (SMTP); free webmail (Gmail, Yahoo...) is flagged but not probed.
          </p>
        </div>

        {/* Real-time Progress Display */}
        {runStatus !== "idle" && (
          <div className="relative overflow-hidden bg-slate-950 dark:bg-slate-950 border border-teal-500/30 backdrop-blur-xl p-6 rounded-2xl shadow-2xl shadow-teal-500/5 transition-all duration-300">
            {/* Glow effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  {runStatus === "running" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : runStatus === "completed" ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-rose-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                    {runStatus === "running" ? "AI Email Validation Processing" : runStatus === "completed" ? "Validation Completed" : "Validation Failed"}
                  </h4>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {statusMsg || "Processing syntax formats..."}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-teal-400">{progress}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
              <div
                className="bg-gradient-to-r from-teal-400 via-primary to-emerald-500 h-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(20,184,166,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-end mt-4 text-[10px] font-bold text-slate-500 uppercase">
              {runStatus !== "running" && (
                <button
                  onClick={() => setRunStatus("idle")}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input Panel Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4">
          <form onSubmit={handleValidate} className="space-y-4">
            
            <div className="relative">
              <textarea
                rows={6}
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                placeholder="Paste emails — separated by commas, spaces or new lines&#10;e.g. john@acme.com, info@widgets.io"
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 placeholder:text-slate-400 font-mono leading-relaxed"
              />
            </div>

            {/* Bottom Form Action Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              
              {/* Left Side: Upload & Recheck controls */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleFileUpload}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-805 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition inline-flex items-center gap-2 font-bold text-xs uppercase tracking-wider"
                >
                  <Upload className="h-4 w-4 text-slate-400" /> Upload file
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-400">
                  <input
                    type="checkbox"
                    checked={recheck}
                    onChange={(e) => setRecheck(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-200 text-teal-600 focus:ring-teal-500/20"
                  />
                  Re-check (ignore cache)
                </label>
              </div>

              {/* Right Side: Stats & Submission */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 self-end md:self-auto">
                <div className="text-right sm:text-left text-xs font-bold text-slate-400">
                  <span className="text-slate-900 dark:text-slate-250">{uniqueCount} unique</span> • cost <span className="text-teal-500 font-extrabold">{cost} credits</span> <span className="text-[10px] text-slate-400 font-semibold">(1/email, cached free)</span>
                  {credits !== null && <div className="text-[10px] text-slate-400">Available: {credits} credits</div>}
                </div>

                <button
                  type="submit"
                  disabled={loading || uniqueCount === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-teal-500 hover:scale-102 hover:shadow-lg text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Validating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Validate
                    </>
                  )}
                </button>
              </div>

            </div>

          </form>
        </div>

        {/* History Results Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-slate-50 mb-4">
            Recent Email Validations
          </h3>

          {history.length === 0 ? (
            <div className="text-center py-12 text-xs font-bold text-slate-400">
              No validations recorded. Paste some emails above to inspect quality.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                    <th className="py-3 px-2">Email Address</th>
                    <th className="py-3 px-2">Syntax</th>
                    <th className="py-3 px-2">MX Checked</th>
                    <th className="py-3 px-2">SMTP Verified</th>
                    <th className="py-3 px-2">Catch-All</th>
                    <th className="py-3 px-2">Disposable</th>
                    <th className="py-3 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td className="py-3.5 px-2 font-mono font-bold truncate max-w-[200px]">{item.email}</td>
                      <td className="py-3.5 px-2">
                        {item.syntaxValid ? (
                          <span className="text-emerald-500 font-extrabold flex items-center gap-1"><Check className="h-3 w-3" /> Valid</span>
                        ) : (
                          <span className="text-rose-500 font-extrabold flex items-center gap-1"><X className="h-3 w-3" /> Bad</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2">
                        {item.mxCheck ? (
                          <span className="text-emerald-500 font-bold">Passed</span>
                        ) : (
                          <span className="text-rose-500 font-bold">Failed</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2">
                        {item.smtpValid ? (
                          <span className="text-emerald-500 font-bold">Active</span>
                        ) : (
                          <span className="text-rose-500 font-bold">Unreachable</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2">{item.catchAll ? "Yes" : "No"}</td>
                      <td className="py-3.5 px-2">{item.disposable ? "Yes" : "No"}</td>
                      <td className="py-3.5 px-2 text-right">
                        <span className={`px-2 py-0.5 text-[9px] uppercase font-extrabold tracking-wider rounded-md ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardWrapper>
  );
}
