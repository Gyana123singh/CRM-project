"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Search, Loader2, ArrowRight, ShieldCheck, ShieldAlert, Database, FileSpreadsheet, Globe, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";
import { API_URL } from "@/utils/axiosInstance";
import Link from "next/link";

interface BatchItem {
  id: string;
  name: string;
  niche: string;
  region: string;
  platform: string;
  count: number;
  createdAt: string;
  leads?: any[];
}

export default function FindDetectPage() {
  const [niche, setNiche] = useState("");
  const [region, setRegion] = useState("");
  const [platformFilter, setPlatformFilter] = useState("Any Platform");
  const [count, setCount] = useState("10");
  const [loading, setLoading] = useState(false);
  const [recentRuns, setRecentRuns] = useState<BatchItem[]>([]);
  const [credits, setCredits] = useState<number | null>(null);

  // SSE and Progress tracking state
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Autocomplete states
  const [nicheFocused, setNicheFocused] = useState(false);
  const [regionFocused, setRegionFocused] = useState(false);

  // Expandable batch state
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Suggestions state
  const [nicheSuggestions, setNicheSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([]);
  const [loadingRegionSuggestions, setLoadingRegionSuggestions] = useState(false);

  const fetchRecentRuns = async () => {
    try {
      const response = await axiosInstance.get("/api/client-admin/enrichments/batches");
      setRecentRuns(response.data.leadBatches || []);
    } catch (error) {
      console.error("Failed to fetch lead batches:", error);
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
    fetchRecentRuns();
    fetchQuotas();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoadingSuggestions(true);
        const res = await axiosInstance.get(`/api/client-admin/enrichments/niche-suggestions?query=${encodeURIComponent(niche)}`);
        setNicheSuggestions(res.data || []);
      } catch (err) {
        console.error("Failed to fetch niche suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [niche]);

  useEffect(() => {
    const fetchRegionSuggestions = async () => {
      try {
        setLoadingRegionSuggestions(true);
        const res = await axiosInstance.get(`/api/client-admin/enrichments/region-suggestions?query=${encodeURIComponent(region)}`);
        setRegionSuggestions(res.data || []);
      } catch (err) {
        console.error("Failed to fetch region suggestions:", err);
      } finally {
        setLoadingRegionSuggestions(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchRegionSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [region]);

  useEffect(() => {
    if (!activeBatchId) return;

    let eventSource: EventSource | null = null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      const url = `${API_URL}/api/realtime?token=${token}`;
      console.log("[FindDetectPage] Connecting to SSE at:", url);
      eventSource = new EventSource(url);

      eventSource.addEventListener("enrich-progress", (e: any) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[FindDetectPage] SSE Event:", data);
          if (data.type === "find-detect" && data.batchId === activeBatchId) {
            setProgress(data.progress);
            setStatusMsg(data.message);
            if (data.status === "completed") {
              setRunStatus("completed");
              setLoading(false);
              toast.success(data.message || "Lead discovery complete!");
              fetchRecentRuns();
              fetchQuotas();
            } else if (data.status === "failed") {
              setRunStatus("failed");
              setLoading(false);
              toast.error(data.message || "Lead discovery failed.");
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
        console.error("[FindDetectPage] EventSource connection error:", err);
      };
    }

    return () => {
      if (eventSource) {
        console.log("[FindDetectPage] Closing EventSource connection for batch:", activeBatchId);
        eventSource.close();
      }
    };
  }, [activeBatchId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !region) {
      toast.error("Please fill in Niche and Region details");
      return;
    }

    const totalCost = parseInt(count) * 1;
    if (credits !== null && credits < totalCost) {
      toast.error(`Insufficient credits. Required: ${totalCost} credits.`);
      return;
    }

    setLoading(true);
    setRunStatus("running");
    setProgress(0);
    setStatusMsg("Initializing Find & Detect batch...");
    
    try {
      const res = await axiosInstance.post("/api/client-admin/enrichments/find-detect", {
        niche,
        region,
        platformFilter,
        count
      });
      const pendingBatch = res.data;
      setActiveBatchId(pendingBatch.id);
      toast.info("Lead discovery started in background!");
      setNiche("");
      setRegion("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to find leads.");
      setRunStatus("failed");
      setLoading(false);
    }
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Find & Detect
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Discover businesses and detect their website platform
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
                    {runStatus === "running" ? "AI Lead Discovery Processing" : runStatus === "completed" ? "Discovery Completed" : "Discovery Failed"}
                  </h4>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {statusMsg || "Processing search parameters..."}
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

        {/* Workflow steps */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">How Find & Detect Works</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 text-xs font-black">1</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Define the search</span>
              </div>
              <p className="text-[11px] text-slate-400">Enter a niche, region, platform filter and how many leads.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 text-xs font-black">2</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">AI finds businesses</span>
              </div>
              <p className="text-[11px] text-slate-400">Web search surfaces real businesses in that niche & area that have websites.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-black">3</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Detects the platform</span>
              </div>
              <p className="text-[11px] text-slate-400">Identifies each site's CMS — WordPress, Shopify, Wix, GoDaddy, custom...</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-black">4</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Lead list ready</span>
              </div>
              <p className="text-[11px] text-slate-400">Name, website, platform & city per lead — ready to audit or enrich.</p>
            </div>
            
          </div>
        </div>

        {/* Input Form Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
          <form onSubmit={handleSearch} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <label htmlFor="niche-input" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Business Niche</label>
                <input
                  id="niche-input"
                  type="text"
                  placeholder="e.g. Dental clinics, Law firms, Restaurants"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  onFocus={() => setNicheFocused(true)}
                  onBlur={() => setTimeout(() => setNicheFocused(false), 200)}
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
                  autoComplete="off"
                />
                {nicheFocused && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {loadingSuggestions && nicheSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        Fetching suggestions...
                      </div>
                    ) : nicheSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        No suggestions found
                      </div>
                    ) : (
                      nicheSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={() => {
                            setNiche(suggestion);
                            setNicheFocused(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-705 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          {suggestion}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 relative">
                <label htmlFor="region-input" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Region</label>
                <input
                  id="region-input"
                  type="text"
                  placeholder="e.g. Mumbai, Delhi NCR, Bangalore"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  onFocus={() => setRegionFocused(true)}
                  onBlur={() => setTimeout(() => setRegionFocused(false), 200)}
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
                  autoComplete="off"
                />
                {regionFocused && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {loadingRegionSuggestions && regionSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        Fetching suggestions...
                      </div>
                    ) : regionSuggestions.length === 0 ? (
                      <div className="px-4 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        No suggestions found
                      </div>
                    ) : (
                      regionSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={() => {
                            setRegion(suggestion);
                            setRegionFocused(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-705 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          {suggestion}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="platform-select" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Platform Filter</label>
                <select
                  id="platform-select"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 appearance-none"
                >
                  <option>Any Platform</option>
                  <option>Shopify</option>
                  <option>WordPress</option>
                  <option>Wix</option>
                  <option>GoDaddy</option>
                  <option>Google Sites</option>
                  <option>Custom CMS</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="count-select" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Number of Businesses</label>
                <select
                  id="count-select"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 appearance-none"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {/* Trigger actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-850">
              <div className="text-xs font-bold text-slate-400">
                Cost: <span className="text-teal-500 font-extrabold">1 credit per lead</span>
                {credits !== null && <span className="ml-2 font-medium">(You have: {credits} credits)</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-primary to-teal-500 hover:scale-102 hover:shadow-lg text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching Web...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Find Businesses
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>

        {/* History Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-slate-50 mb-4">
            Recent Find & Detect Runs
          </h3>

          {recentRuns.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400">
              No previous runs yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div key={run.id} className="border border-slate-100 dark:border-slate-850 rounded-2xl p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{run.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        CMS: {run.platform} • Region: {run.region} • {run.createdAt.split("T")[0]}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Leads Found</span>
                        <span className="text-sm font-black text-teal-555">{run.count}</span>
                      </div>

                      <button
                        onClick={() => setExpandedBatchId(expandedBatchId === run.id ? null : run.id)}
                        className="p-2.5 border border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                      >
                        {expandedBatchId === run.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>

                      <Link
                        href="/client-admin/enrichment/my-enrichments"
                        className="p-2.5 border border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-100 rounded-xl transition inline-flex items-center gap-1 font-bold text-xs"
                      >
                        <Database className="h-4 w-4" /> View Batch
                      </Link>
                    </div>
                  </div>

                  {/* Expanded list of businesses */}
                  {expandedBatchId === run.id && (
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 animate-fadeIn">
                      {(!run.leads || run.leads.length === 0) ? (
                        <div className="text-[11px] font-bold text-slate-450 py-2">
                          No business leads found in database.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-105 dark:border-slate-800 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                                <th className="py-2 px-2">Business Name</th>
                                <th className="py-2 px-2">Website URL</th>
                                <th className="py-2 px-2">Detected CMS</th>
                                <th className="py-2 px-2">Contact Info</th>
                                <th className="py-2 px-2 text-right">Location</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-slate-350 font-medium">
                              {run.leads.map((lead: any) => (
                                <tr key={lead.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
                                  <td className="py-2.5 px-2 font-bold text-slate-900 dark:text-slate-100">{lead.name}</td>
                                  <td className="py-2.5 px-2">
                                    {lead.email ? (
                                      <a
                                        href={`https://www.${lead.email.split("@")[1]}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 inline-flex"
                                      >
                                        <Globe className="h-3 w-3" />
                                        {`www.${lead.email.split("@")[1]}`}
                                      </a>
                                    ) : (
                                      <span className="text-slate-400">N/A</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2">
                                    <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                      {lead.cms || "Custom"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-500 text-[10px]">
                                    <div>Email: {lead.email || "N/A"}</div>
                                    <div>Phone: {lead.phone || "N/A"}</div>
                                  </td>
                                  <td className="py-2.5 px-2 text-right text-slate-500">{lead.location}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </DashboardWrapper>
  );
}
