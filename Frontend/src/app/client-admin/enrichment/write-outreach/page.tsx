"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { MessageSquare, Loader2, Copy, FileText, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "@/utils/api";

interface ContactItem {
  id: string;
  name: string;
  role: string;
  businessName: string;
  email: string;
}

interface EnrichmentBatch {
  id: string;
  name: string;
  contacts: ContactItem[];
}

interface DraftItem {
  id: string;
  mode: string;
  channel: string;
  content: string;
  createdAt: string;
}

export default function WriteOutreachPage() {
  const [activeTab, setActiveTab] = useState<"batch" | "social">("batch");
  
  // Batch Mode
  const [enrichmentBatches, setEnrichmentBatches] = useState<EnrichmentBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  
  // Social Mode
  const [postUrl, setPostUrl] = useState("");
  const [postText, setPostText] = useState("");

  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<string>("");
  const [recentDrafts, setRecentDrafts] = useState<DraftItem[]>([]);

  const fetchBatchesAndHistory = async () => {
    try {
      const response = await axiosInstance.get("/api/client-admin/enrichments/batches");
      setEnrichmentBatches(response.data.enrichmentBatches || []);
    } catch (error) {
      console.error("Failed to load enrichment batches:", error);
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

  const selectedBatch = enrichmentBatches.find(b => b.id === selectedBatchId);
  const contactsList = selectedBatch ? selectedBatch.contacts : [];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (credits !== null && credits < 1) {
      toast.error("Insufficient credits. Required: 1 credit.");
      return;
    }

    let payload: any = {};
    if (activeTab === "batch") {
      if (!selectedContactId) {
        toast.error("Please select a contact from the list");
        return;
      }
      payload = {
        mode: "enriched-contacts",
        enrichmentBatchId: selectedBatchId,
        contactId: selectedContactId
      };
    } else {
      if (!postUrl && !postText) {
        toast.error("Please enter a social post URL or text content");
        return;
      }
      payload = {
        mode: "social-reply",
        postUrl,
        postText
      };
    }

    setLoading(true);
    setGeneratedDraft("");
    try {
      const res = await axiosInstance.post("/api/client-admin/enrichments/outreach", payload);
      const draftContent = res.data.content;
      setGeneratedDraft(draftContent);
      toast.success("Outreach draft successfully generated!");
      
      // Reset social forms
      setPostUrl("");
      setPostText("");
      
      // Update history list
      setRecentDrafts(prev => [
        {
          id: res.data.id,
          mode: res.data.mode,
          channel: res.data.channel,
          content: res.data.content,
          createdAt: res.data.createdAt || new Date().toISOString()
        },
        ...prev
      ]);
      fetchQuotas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to generate outreach.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    toast.success("Draft copied to clipboard!");
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        
        {/* Title Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            Write Outreach
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate messages from enriched contacts, or draft replies to social-media posts
          </p>
        </div>

        {/* Stepper block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">How Write Outreach Works</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500 text-xs font-black">1</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Pick an enriched batch</span>
              </div>
              <p className="text-[11px] text-slate-400">Choose a batch with contacts (and audit findings, if run).</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 text-xs font-black">2</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Grounded in real data</span>
              </div>
              <p className="text-[11px] text-slate-400">Uses each lead's actual issues, available channels & your sender info.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 text-xs font-black">3</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">AI drafts per channel</span>
              </div>
              <p className="text-[11px] text-slate-400">Personalised email, WhatsApp, Instagram, LinkedIn, Facebook & X messages.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-black">4</span>
                <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Review & send</span>
              </div>
              <p className="text-[11px] text-slate-400">Copy or export the drafts — you send them manually.</p>
            </div>

          </div>

          <p className="text-[11px] font-bold text-slate-400 mt-4 italic">
            * Results are more personalised when data flows from Audit. Without audit data, messages are generated using web search.
          </p>
        </div>

        {/* Input area */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-6">
          
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <button
              onClick={() => {
                setActiveTab("batch");
                setGeneratedDraft("");
              }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "batch"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              From Previous Batch
            </button>
            <button
              onClick={() => {
                setActiveTab("social");
                setGeneratedDraft("");
              }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "social"
                  ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              Paste URLs (Social Post)
            </button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {activeTab === "batch" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label htmlFor="batch-select" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Source Batch (Enriched Contacts)</label>
                  <select
                    id="batch-select"
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      setSelectedContactId("");
                    }}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 appearance-none"
                  >
                    <option value="">Select an enriched batch...</option>
                    {enrichmentBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({(b.contacts || []).length} profiles)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-select" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Select Contact Profile</label>
                  <select
                    id="contact-select"
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    disabled={!selectedBatchId}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100 appearance-none disabled:opacity-50"
                  >
                    <option value="">Select a contact...</option>
                    {contactsList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.role} ({c.businessName})
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <label htmlFor="post-url" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Social Post URL (Optional)</label>
                  <input
                    id="post-url"
                    type="text"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="e.g. https://linkedin.com/posts/activity-12345"
                    className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="post-text" className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Post Text Content</label>
                  <input
                    id="post-text"
                    type="text"
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Paste the post content or key highlights..."
                    className="w-full pl-4 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-100"
                  />
                </div>

              </div>
            )}

            {/* Cost and Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-850">
              <div className="text-xs font-bold text-slate-400">
                Cost: <span className="text-teal-500 font-extrabold">1 credit per message/reply</span>
                {credits !== null && <span className="ml-2 font-medium">(You have: {credits} credits)</span>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-primary to-teal-500 hover:scale-102 hover:shadow-lg text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Drafting outreach...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" /> Generate Outreach
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

        {/* Output area */}
        {generatedDraft && (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-widest text-slate-450 dark:text-slate-400">Generated AI Draft</span>
              <button
                onClick={copyToClipboard}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 rounded-xl transition inline-flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Draft
              </button>
            </div>
            
            <div className="p-5 border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-950 rounded-2xl font-mono text-sm whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 shadow-inner">
              {generatedDraft}
            </div>
          </div>
        )}

        {/* Historical outreach drafts */}
        {recentDrafts.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-slate-50 mb-4">
              Recent Generated Outreach
            </h3>
            <div className="space-y-4">
              {recentDrafts.map(draft => (
                <div
                  key={draft.id}
                  className="p-4 border border-slate-100 dark:border-slate-850 rounded-2xl bg-slate-50/30 dark:hover:bg-slate-800/10 transition space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-slate-400">
                    <span>Channel: {draft.channel} • Mode: {draft.mode.replace("-", " ")}</span>
                    <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs font-mono line-clamp-3 text-slate-650 dark:text-slate-300 whitespace-pre-wrap">{draft.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardWrapper>
  );
}
