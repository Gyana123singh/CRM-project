"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Users, Loader2, Play, FileText, CheckCircle, Database, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";
import { API_URL } from "@/utils/axiosInstance";
import Link from "next/link";

interface BatchItem {
  id: string;
  name: string;
  count: number;
}

interface EnrichmentBatch {
  id: string;
  name: string;
  createdAt: string;
  contacts: { id: string }[];
}

export default function EnrichContactsPage() {
  const [activeTab, setActiveTab] = useState<"batch" | "urls">("batch");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadBatches, setLeadBatches] = useState<BatchItem[]>([]);
  const [enrichmentBatches, setEnrichmentBatches] = useState<EnrichmentBatch[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  // SSE and Progress tracking state
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  const fetchBatchesAndHistory = async () => {
    try {
      const response = await axiosInstance.get("/api/client-admin/enrichments/batches");
      setLeadBatches(response.data.leadBatches || []);
      setEnrichmentBatches(response.data.enrichmentBatches || []);
    } catch (error) {
      console.error("Failed to load enrichment data:", error);
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

  useEffect(() => {
    if (!activeBatchId) return;

    let eventSource: EventSource | null = null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      const url = `${API_URL}/api/realtime?token=${token}`;
      console.log("[EnrichContactsPage] Connecting to SSE at:", url);
      eventSource = new EventSource(url);

      eventSource.addEventListener("enrich-progress", (e: any) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[EnrichContactsPage] SSE Event:", data);
          if (data.type === "enrich-contacts" && data.batchId === activeBatchId) {
            setProgress(data.progress);
            setStatusMsg(data.message);
            if (data.status === "completed") {
              setRunStatus("completed");
              setLoading(false);
              toast.success(data.message || "Contact enrichment complete!");
              fetchBatchesAndHistory();
              fetchQuotas();
            } else if (data.status === "failed") {
              setRunStatus("failed");
              setLoading(false);
              toast.error(data.message || "Contact enrichment failed.");
              fetchQuotas();
            } else {
              setRunStatus("running");
            }
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      });

      eventSource.onerror = (err) => {
        console.error("[EnrichContactsPage] EventSource connection error:", err);
      };
    }

    return () => {
      if (eventSource) {
        console.log("[EnrichContactsPage] Closing EventSource connection for batch:", activeBatchId);
        eventSource.close();
      }
    };
  }, [activeBatchId]);

  const handleEnrich = async (e: React.FormEvent) => {
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
      }
      payload = {
        batchId: selectedBatch
      };
    } else {
      const parsedUrls = urlsText
        .split(/[\n,]+/)
        .map(u => u.trim())
        .filter(u => u.length > 0);

      if (parsedUrls.length === 0) {
        toast.error("Please enter at least one URL to enrich");
        return;
      }
      targetsCount = parsedUrls.length;
      payload = {
        urls: parsedUrls
      };
    }

    const totalCost = targetsCount * 2; // 2 credits per lead
    if (credits !== null && credits < totalCost) {
      toast.error(`Insufficient credits. Required: ${totalCost} credits. Available: ${credits} credits.`);
      return;
    }

    setLoading(true);
    setRunStatus("running");
    setProgress(0);
    setStatusMsg("Initializing contact enrichment batch...");

    try {
      const res = await axiosInstance.post("/api/client-admin/enrichments/enrich", payload);
      const pendingBatch = res.data;
      setActiveBatchId(pendingBatch.id);
      toast.info("Contact enrichment started in background!");
      setSelectedBatch("");
      setUrlsText("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to enrich contacts.");
      setRunStatus("failed");
      setLoading(false);
    }
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Title Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Enrich Contacts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Find decision makers and contact details for each business
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
                    {runStatus === "running" ? "AI Contact Enrichment Processing" : runStatus === "completed" ? "Enrichment Completed" : "Enrichment Failed"}
                  </h4>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {statusMsg || "Processing business homepages..."}
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

            <div className="flex items-center justify-between mt-4 text-[10px] font-bold text-slate-500 uppercase">
              <div>Batch ID: {activeBatchId || "Pending..."}</div>
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

        {/* Stepper info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">How Enrich Contacts Works</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 text-xs font-black">1</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Pick a lead batch</span>
              </div>
              <p className="text-[11px] text-slate-400">Choose the businesses to find contacts for.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 text-xs font-black">2</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">AI hunts contacts</span>
              </div>
              <p className="text-[11px] text-slate-400">Searches the site, Google, social profiles, Google Business & directories.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-black">3</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Extracts decision-maker</span>
              </div>
              <p className="text-[11px] text-slate-400">Name, role, email, phone / WhatsApp and social handles.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-black">4</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Contact cards ready</span>
              </div>
              <p className="text-[11px] text-slate-400">One contact profile per lead — export to CSV or write outreach.</p>
            </div>

          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
          
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab("batch")}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "batch"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              From Previous Batch
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

          <form onSubmit={handleEnrich} className="space-y-5">
            {activeTab === "batch" ? (
              <div className="space-y-2">
                <label htmlFor="batch-select" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Source Batch</label>
                <select
                  id="batch-select"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 appearance-none"
                >
                  <option value="">Select a batch...</option>
                  {leadBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.count} leads)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="urls-textarea" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Paste Website URLs</label>
                <textarea
                  id="urls-textarea"
                  rows={4}
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  placeholder="e.g. https://clinic.example.com&#10;https://lawyers-hub.in"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Cost and Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-850">
              <div className="text-xs font-bold text-slate-400">
                Cost: <span className="text-teal-500 font-extrabold">2 credits per lead enriched</span>
                {credits !== null && <span className="ml-2 font-medium">(You have: {credits} credits)</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-primary to-teal-500 hover:scale-102 hover:shadow-lg text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enriching...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" /> Enrich Contacts
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-slate-50 mb-4">
            Recent Enrich Contacts Runs
          </h3>

          {enrichmentBatches.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400">
              No previous runs yet.
            </div>
          ) : (
            <div className="space-y-3">
              {enrichmentBatches.map((run) => (
                <div
                  key={run.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{run.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Run Date: {run.createdAt.split("T")[0]}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Enriched Leads</span>
                      <span className="text-sm font-black text-teal-500">{(run.contacts || []).length}</span>
                    </div>

                    <Link
                      href="/client-admin/enrichment/my-enrichments"
                      className="p-2.5 border border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                    >
                      <Database className="h-4 w-4" /> View Batch
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
