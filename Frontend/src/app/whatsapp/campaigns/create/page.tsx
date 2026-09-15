"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import {
  Send, ArrowLeft, Users, FileText, Clock, Zap,
  MessageCircle, ChevronRight
} from "lucide-react";

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [groups, setGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Campaign form state
  const [name, setName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsRes, templatesRes] = await Promise.all([
          axiosInstance.get(ENDPOINTS.whatsapp.groups),
          axiosInstance.get(ENDPOINTS.knowledge.whatsappTemplates).catch(() => ({ data: [] })),
        ]);
        setGroups(groupsRes.data || []);
        setTemplates(templatesRes.data || []);
      } catch {
        setGroups([
          { id: "1", name: "Premium Customers", contactCount: 245 },
          { id: "2", name: "Leads", contactCount: 892 },
          { id: "3", name: "Restaurant Customers", contactCount: 156 },
        ]);
        setTemplates([
          { id: "1", name: "welcome_message", bodyText: "Hello {{name}}, Welcome to our platform!" },
          { id: "2", name: "promotional_offer", bodyText: "Dear {{name}}, Get 20% off today!" },
        ]);
      }
    };
    fetchData();
  }, []);

  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) setMessageBody(tpl.bodyText);
  };

  const handleSubmit = async () => {
    if (!name || !messageBody) { toast.error("Campaign name and message are required"); return; }
    setSending(true);
    try {
      const payload: any = {
        name,
        messageBody,
        groupId: selectedGroupId || undefined,
        templateId: selectedTemplateId || undefined,
      };

      if (scheduleType === "later" && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }

      const res = await axiosInstance.post(ENDPOINTS.whatsapp.campaigns, payload);

      if (scheduleType === "now") {
        await axiosInstance.post(ENDPOINTS.whatsapp.campaignSend(res.data.id));
        toast.success("Campaign launched!");
      } else {
        toast.success("Campaign scheduled!");
      }

      router.push("/whatsapp/campaigns");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create campaign");
    } finally {
      setSending(false);
    }
  };

  const steps = [
    { num: 1, label: "Details", icon: FileText },
    { num: 2, label: "Audience", icon: Users },
    { num: 3, label: "Message", icon: MessageCircle },
    { num: 4, label: "Schedule", icon: Clock },
  ];

  return (
    <DashboardWrapper>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/whatsapp/campaigns")} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <ArrowLeft className="h-4 w-4 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">Create Campaign</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Build and launch a new WhatsApp campaign.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const active = step === s.num;
              const completed = step > s.num;
              return (
                <React.Fragment key={s.num}>
                  <button onClick={() => setStep(s.num)} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${active ? "bg-emerald-600 text-white" : completed ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600" : "text-slate-400"}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:inline">{s.label}</span>
                  </button>
                  {idx < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">Campaign Details</h3>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Campaign Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Holiday Sale Campaign"
                  className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-xs" />
              </div>
            </div>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">Select Audience</h3>
              <p className="text-[10px] text-slate-400 font-medium">Choose a contact group to receive this campaign, or leave empty to target all contacts.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => setSelectedGroupId("")} className={`p-4 border rounded-xl text-left transition ${!selectedGroupId ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 hover:border-emerald-300"}`}>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">All Contacts</p>
                      <p className="text-[9px] text-slate-400">Send to every contact</p>
                    </div>
                  </div>
                </button>
                {groups.map((g) => (
                  <button key={g.id} onClick={() => setSelectedGroupId(g.id)} className={`p-4 border rounded-xl text-left transition ${selectedGroupId === g.id ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 hover:border-emerald-300"}`}>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-violet-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{g.name}</p>
                        <p className="text-[9px] text-slate-400">{g.contactCount || g._count?.contacts || 0} contacts</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Message */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">Compose Message</h3>
              {templates.length > 0 && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Use a Template (optional)</label>
                  <select value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-xs">
                    <option value="">Select a template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Message Body *</label>
                <textarea required value={messageBody} onChange={(e) => setMessageBody(e.target.value)}
                  placeholder={"Hello {{name}},\n\nYour message here...\n\nBest regards"}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold resize-none font-mono text-[11px]" />
                <p className="text-[9px] text-slate-400">Use {"{{name}}"}, {"{{mobile}}"}, {"{{email}}"} for personalization variables</p>
              </div>

              {/* Live Preview */}
              {messageBody && (
                <div>
                  <label className="font-bold text-slate-400 uppercase text-[10px] mb-2 block">Live Preview</label>
                  <div className="bg-[#e5ddd5] dark:bg-slate-950 rounded-xl p-4 max-w-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl rounded-tl-sm p-3 shadow-sm">
                      <p className="text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed"
                         dangerouslySetInnerHTML={{ __html: messageBody.replace(/\{\{(\w+)\}\}/g, '<span class="px-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded font-bold">{{$1}}</span>') }} />
                      <span className="block text-right text-[9px] text-slate-400 mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Schedule & Launch */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">Schedule & Launch</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => setScheduleType("now")} className={`p-5 border rounded-xl text-center transition ${scheduleType === "now" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 hover:border-emerald-300"}`}>
                  <Zap className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">Send Now</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Launch campaign immediately</p>
                </button>
                <button onClick={() => setScheduleType("later")} className={`p-5 border rounded-xl text-center transition ${scheduleType === "later" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 hover:border-emerald-300"}`}>
                  <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">Schedule</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pick a date & time</p>
                </button>
              </div>
              {scheduleType === "later" && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Schedule Date & Time</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-xs" />
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[10px]">Campaign Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <span className="text-slate-400 font-bold">Name:</span><span className="text-slate-700 dark:text-slate-300 font-bold">{name || "—"}</span>
                  <span className="text-slate-400 font-bold">Audience:</span><span className="text-slate-700 dark:text-slate-300 font-bold">{selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name : "All Contacts"}</span>
                  <span className="text-slate-400 font-bold">Template:</span><span className="text-slate-700 dark:text-slate-300 font-bold">{selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.name : "Custom"}</span>
                  <span className="text-slate-400 font-bold">Schedule:</span><span className="text-slate-700 dark:text-slate-300 font-bold">{scheduleType === "now" ? "Immediately" : scheduledAt || "Not set"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Back</button>
            ) : <div />}
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={sending || !name || !messageBody} className="flex items-center gap-1 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50">
                <Send className="h-4 w-4" /> {scheduleType === "now" ? "Launch Campaign" : "Schedule Campaign"}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}
