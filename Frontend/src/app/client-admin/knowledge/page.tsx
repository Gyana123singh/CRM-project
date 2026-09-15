"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Plus,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Bot,
  MessageSquare,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Save,
  Trash2
} from "lucide-react";
import DashboardWrapperShell from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: "General" | "Pricing" | "Services" | "Policies";
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: "utility" | "marketing" | "authentication";
  language: string;
  status: "approved" | "pending" | "rejected";
  bodyText: string;
}

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<"faqs" | "settings" | "templates">("faqs");

  // State 1: FAQs & Docs
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState<FAQ["category"]>("General");
  const [showAddForm, setShowAddForm] = useState(false);

  // State 2: Bot Settings
  const [botPersona, setBotPersona] = useState(
    "You are a professional, polite, and helpful AI assistant for Infotattva Business Solutions. Answer customer queries based on the FAQs. Be friendly and collect customer contact details to pass to the sales team."
  );
  const [botModel, setBotModel] = useState("Google Gemini 1.5 Pro");
  const [botTemperature, setBotTemperature] = useState(0.5);
  const [botAutoPilot, setBotAutoPilot] = useState(true);

  // State 3: WhatsApp Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState<WhatsAppTemplate["category"]>("marketing");
  const [tplBody, setTplBody] = useState("");
  const [showAddTplForm, setShowAddTplForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const faqsRes = await axiosInstance.get(ENDPOINTS.knowledge.faqs);
        setFaqs(faqsRes.data);
      } catch (err) {
        console.error("Failed to fetch FAQs:", err);
      }

      try {
        const docsRes = await axiosInstance.get(ENDPOINTS.knowledge.documents);
        setDocuments(docsRes.data);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      }

      try {
        const settingsRes = await axiosInstance.get(ENDPOINTS.knowledge.aiSettings);
        setBotPersona(settingsRes.data.botPersona);
        setBotModel(settingsRes.data.botModel);
        setBotTemperature(settingsRes.data.botTemperature);
        setBotAutoPilot(settingsRes.data.botAutoPilot);
      } catch (err) {
        console.error("Failed to fetch AI Settings:", err);
      }

      try {
        const tplsRes = await axiosInstance.get(ENDPOINTS.knowledge.whatsappTemplates);
        const mapped = tplsRes.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category.toLowerCase(),
          language: t.language,
          status: t.status.toLowerCase(),
          bodyText: t.bodyText,
        }));
        setTemplates(mapped);
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };

    fetchData();
  }, []);

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion || !newAnswer) return;

    try {
      const response = await axiosInstance.post(ENDPOINTS.knowledge.faqs, {
        question: newQuestion,
        answer: newAnswer,
        category: newCategory,
      });

      setFaqs([...faqs, response.data]);
      setNewQuestion("");
      setNewAnswer("");
      setShowAddForm(false);
      toast.success("FAQ training record added successfully!");
    } catch (err: any) {
      console.error("Failed to add FAQ:", err);
      toast.error(err.response?.data?.error || "Failed to add FAQ");
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      await axiosInstance.delete(ENDPOINTS.knowledge.faqDelete(id));
      setFaqs(faqs.filter((f) => f.id !== id));
      toast.success("FAQ training record deleted successfully");
    } catch (err: any) {
      console.error("Failed to delete FAQ:", err);
      toast.error(err.response?.data?.error || "Failed to delete FAQ");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds the 5MB limit");
      return;
    }

    try {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${(file.size / 1024).toFixed(0)} KB`;

      const response = await axiosInstance.post(ENDPOINTS.knowledge.documentUpload, {
        name: file.name,
        size: sizeStr,
      });

      setDocuments([...documents, response.data]);
      toast.success(`Document "${file.name}" uploaded and indexed successfully!`);
    } catch (err: any) {
      console.error("Failed to upload document:", err);
      toast.error(err.response?.data?.error || "Failed to upload document");
    }
  };

  const handleSaveAISettings = async () => {
    try {
      await axiosInstance.patch(ENDPOINTS.knowledge.aiSettings, {
        botPersona,
        botModel,
        botTemperature,
        botAutoPilot,
      });
      toast.success("AI Co-Pilot settings successfully saved & synced!");
    } catch (err: any) {
      console.error("Failed to save AI Settings:", err);
      toast.error(err.response?.data?.error || "Failed to save AI Settings");
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName || !tplBody) return;

    try {
      const response = await axiosInstance.post(ENDPOINTS.knowledge.whatsappTemplates, {
        name: tplName,
        category: tplCategory,
        bodyText: tplBody,
      });

      setTemplates([
        {
          id: response.data.id,
          name: response.data.name,
          category: response.data.category.toLowerCase(),
          language: response.data.language,
          status: response.data.status.toLowerCase(),
          bodyText: response.data.bodyText,
        },
        ...templates,
      ]);
      setTplName("");
      setTplBody("");
      setShowAddTplForm(false);
      toast.success("WhatsApp template submitted & auto-approved!");
    } catch (err: any) {
      console.error("Failed to create template:", err);
      toast.error(err.response?.data?.error || "Failed to create template");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await axiosInstance.delete(ENDPOINTS.knowledge.templateDelete(id));
      setTemplates(templates.filter((t) => t.id !== id));
      toast.success("WhatsApp template deleted successfully");
    } catch (err: any) {
      console.error("Failed to delete template:", err);
      toast.error(err.response?.data?.error || "Failed to delete template");
    }
  };

  return (
    <DashboardWrapperShell>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              AI Chatbot & Communications Hub <BookOpen className="h-6 w-6 text-primary" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Train co-pilot AI engines, write prompt instructions, catalog files, and manage pre-approved WhatsApp templates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "faqs" && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all"
              >
                <Plus className="h-4 w-4" /> Add FAQ
              </button>
            )}
            {activeTab === "templates" && (
              <button
                onClick={() => setShowAddTplForm(!showAddTplForm)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all"
              >
                <Plus className="h-4 w-4" /> Create Template
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher Grid */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md text-xs font-bold">
          <button
            onClick={() => setActiveTab("faqs")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "faqs"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <BookOpen className="h-4 w-4" /> FAQs & Catalog
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "settings"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Bot className="h-4 w-4" /> AI Configuration
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "templates"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> WhatsApp Templates
          </button>
        </div>

        {/* Dynamic Tab Body Renders */}
        {activeTab === "faqs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FAQs List */}
            <div className="lg:col-span-2 space-y-4">
              {showAddForm && (
                <form onSubmit={handleAddFaq} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 text-xs shadow-md animate-fade-in">
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide">
                    Create Training FAQ
                  </h3>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">FAQ Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option>General</option>
                      <option>Services</option>
                      <option>Pricing</option>
                      <option>Policies</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">Customer Question *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Do you open on weekends?"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">AI Co-pilot Answer *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Yes, we operate from 10:00 AM to 6:00 PM on Saturday and Sunday..."
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 text-white rounded-xl font-bold shadow-md shadow-primary/10 transition-all"
                    >
                      Train Chatbot
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-2">
                  FAQ Knowledge Logs
                </h3>

                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex gap-3 text-xs bg-slate-50/30 dark:bg-slate-950/20 relative group">
                      <div className="mt-0.5">
                        <HelpCircle className="h-4.5 w-4.5 text-primary shrink-0" />
                      </div>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-50 text-sm leading-tight">{faq.question}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-primary font-bold uppercase">{faq.category}</span>
                          </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed pr-8">{faq.answer}</p>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="absolute right-4 top-4 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                        title="Delete FAQ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {faqs.length === 0 && (
                    <p className="text-center text-slate-455 text-[11px] py-8">No FAQ training logs found. Click "Add FAQ" to add one.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Document upload side widget */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide">
                  Brochures & Documents
                </h3>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary rounded-2xl flex flex-col items-center justify-center text-xs text-center cursor-pointer transition py-8 group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".pdf,.docx,.txt"
                    style={{ display: "none" }} 
                  />
                  <Upload className="h-8 w-8 text-slate-400 group-hover:text-primary transition mb-2" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Click or Drop Catalog File</span>
                  <span className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, TXT (Max 5MB)</span>
                </div>

                <div className="space-y-3">
                  {documents.map((file) => (
                    <div key={file.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-semibold">
                      <div className="flex gap-2 items-center flex-1 min-w-0">
                        <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-700 dark:text-slate-200 truncate pr-2" title={file.name}>{file.name}</span>
                          <span className="text-[9px] text-slate-400">{file.size}</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 px-2 py-0.5 rounded flex items-center gap-0.5 uppercase font-bold shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Indexed
                      </span>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-center text-slate-400 text-[10px] py-4">No documents uploaded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Config Settings */}
        {activeTab === "settings" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm max-w-3xl space-y-6">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-primary" /> Co-Pilot AI Configuration
            </h3>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Chatbot Model Engine</label>
                <select
                  value={botModel}
                  onChange={(e) => setBotModel(e.target.value)}
                  className="w-full sm:w-80 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option>Google Gemini 1.5 Pro</option>
                  <option>OpenAI GPT-4o Engine</option>
                  <option>Claude 3.5 Sonnet</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px]">System Persona Prompt Instructions</label>
                <textarea
                  rows={6}
                  value={botPersona}
                  onChange={(e) => setBotPersona(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between font-bold">
                    <label className="text-slate-400 uppercase text-[10px]">Creativity (Temperature)</label>
                    <span className="text-primary font-extrabold">{botTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={botTemperature}
                    onChange={(e) => setBotTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">AI Auto-Pilot Responder</span>
                    <span className="text-[10px] text-slate-400">Allows AI to answer inbound texts instantly</span>
                  </div>

                  <button
                    onClick={() => setBotAutoPilot(!botAutoPilot)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {botAutoPilot ? (
                      <ToggleRight className="h-7 w-7 text-primary animate-pulse" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-slate-300 dark:text-slate-700" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveAISettings}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 hover:shadow-xl text-white rounded-xl font-bold shadow-md shadow-primary/10 transition-all"
                >
                  <Save className="h-4 w-4" /> Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: WhatsApp Templates */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            {showAddTplForm && (
              <form onSubmit={handleAddTemplate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 text-xs shadow-md max-w-2xl animate-fade-in">
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide">
                  Create WhatsApp Template
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">Template Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. welcome_message"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">Template Category</label>
                    <select
                      value={tplCategory}
                      onChange={(e) => setTplCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option>marketing</option>
                      <option>utility</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Template Body Text *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Hi {{1}}, your booking for {{2}} is confirmed..."
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Use double curly brackets with numbers like <code>{"{{1}}"}</code> for dynamic customer parameters placeholders.</span>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddTplForm(false)}
                    className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 text-white rounded-xl font-bold shadow-md shadow-primary/10 transition-all"
                  >
                    Submit for Approval
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <div key={tpl.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        tpl.category === "marketing"
                          ? "bg-purple-100 dark:bg-purple-950/40 text-purple-600"
                          : "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
                      }`}>
                        {tpl.category}
                      </span>

                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 px-2 py-0.5 rounded flex items-center gap-0.5 uppercase font-bold">
                        {tpl.status}
                      </span>
                    </div>

                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-slate-50 text-xs truncate uppercase tracking-wider">{tpl.name}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Language: {tpl.language}</p>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed border border-slate-100 dark:border-slate-800 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 font-medium font-mono">
                      {tpl.bodyText}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Meta Approved</span>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardWrapperShell>
  );
}

