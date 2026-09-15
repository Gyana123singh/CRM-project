"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import { FileText, Plus, Eye, Edit, Trash2, X, MessageCircle } from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTpl, setEditTpl] = useState<any>(null);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("marketing");
  const [language, setLanguage] = useState("en_US");
  const [bodyText, setBodyText] = useState("");

  const fetchTemplates = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.knowledge.whatsappTemplates);
      setTemplates(res.data);
    } catch {
      setTemplates([
        { id: "1", name: "welcome_message", category: "marketing", language: "en_US", status: "approved", bodyText: "Hello {{name}},\n\nWelcome to our platform! We're thrilled to have you. Get started now and enjoy 20% off your first order.\n\nBest regards,\nTeam" },
        { id: "2", name: "order_confirmation", category: "utility", language: "en_US", status: "approved", bodyText: "Hi {{name}},\n\nYour order #{{order_id}} has been confirmed. Expected delivery: {{date}}.\n\nThank you for shopping with us!" },
        { id: "3", name: "promotional_offer", category: "marketing", language: "en_US", status: "pending", bodyText: "Dear {{name}},\n\n🎉 Exclusive Offer! Get 20% discount today only.\n\nUse code: SPECIAL20\n\nShop now at our store!" },
      ]);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bodyText) return;
    try {
      if (editTpl) {
        toast.success("Template updated!");
      } else {
        await axiosInstance.post(ENDPOINTS.knowledge.whatsappTemplates, { name, category, language, bodyText });
        toast.success("Template created!");
      }
      setShowModal(false); setEditTpl(null); resetForm(); fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await axiosInstance.delete(ENDPOINTS.knowledge.templateDelete(id));
      toast.success("Template deleted");
      fetchTemplates();
    } catch { toast.error("Failed to delete"); }
  };

  const resetForm = () => { setName(""); setCategory("marketing"); setLanguage("en_US"); setBodyText(""); };
  const openEdit = (t: any) => { setEditTpl(t); setName(t.name); setCategory(t.category); setLanguage(t.language); setBodyText(t.bodyText); setShowModal(true); };

  const renderPreview = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, '<span class="px-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded font-bold">{{$1}}</span>');
  };

  const statusColors: Record<string, string> = {
    approved: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
    pending: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
    rejected: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
  };

  const categoryColors: Record<string, string> = {
    marketing: "bg-violet-100 dark:bg-violet-950/40 text-violet-600",
    utility: "bg-blue-100 dark:bg-blue-950/40 text-blue-600",
    authentication: "bg-slate-100 dark:bg-slate-800 text-slate-500",
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">WhatsApp Templates <FileText className="h-5 w-5 text-blue-500" /></h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage message templates with variable placeholders.</p>
          </div>
          <button onClick={() => { resetForm(); setEditTpl(null); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Create Template
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group">
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{t.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${categoryColors[t.category] || categoryColors.utility}`}>{t.category}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColors[t.status] || statusColors.pending}`}>{t.status}</span>
                      <span className="text-[9px] font-bold text-slate-400">{t.language}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body - Message Preview */}
              <div className="p-4">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 relative">
                  <div className="absolute -top-1.5 left-3 w-3 h-3 bg-emerald-50/50 dark:bg-emerald-950/10 border-l border-t border-emerald-100 dark:border-emerald-900/30 transform rotate-45" />
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderPreview(t.bodyText) }} />
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-4 pb-4 flex items-center justify-between">
                <button onClick={() => setShowPreview(t)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition">
                  <Eye className="h-3 w-3" /> Preview
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"><Edit className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-emerald-600">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-white" />
                <span className="text-xs font-bold text-white">WhatsApp Preview</span>
              </div>
              <button onClick={() => setShowPreview(null)} className="p-1 rounded-full hover:bg-white/20 text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 bg-[#e5ddd5] dark:bg-slate-950 min-h-[200px]">
              <div className="bg-white dark:bg-slate-800 rounded-xl rounded-tl-sm p-3 max-w-[85%] shadow-sm">
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed" dangerouslySetInnerHTML={{ __html: renderPreview(showPreview.bodyText) }} />
                <span className="block text-right text-[9px] text-slate-400 mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button onClick={() => setShowPreview(null)} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">{editTpl ? "Edit Template" : "Create Template"}</h3>
              <button onClick={() => { setShowModal(false); setEditTpl(null); resetForm(); }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Template Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. welcome_message" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold">
                    <option value="marketing">Marketing</option>
                    <option value="utility">Utility</option>
                    <option value="authentication">Authentication</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold">
                    <option value="en_US">English (US)</option>
                    <option value="hi_IN">Hindi</option>
                    <option value="es_ES">Spanish</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Message Body * <span className="text-slate-300 normal-case">(Use {"{{name}}"}, {"{{email}}"}, {"{{phone}}"} for variables)</span></label>
                <textarea required value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder={"Hello {{name}},\n\nGet 20% discount today!\n\nBest regards"} rows={6} className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold resize-none font-mono text-[11px]" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditTpl(null); resetForm(); }} className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 text-white rounded-xl font-bold shadow-md transition-all">{editTpl ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
}
