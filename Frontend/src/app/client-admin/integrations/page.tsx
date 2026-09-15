"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { toast } from "react-toastify";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import {
  Settings,
  MessageSquare,
  Globe,
  Mail,
  Zap,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RotateCcw,
  Copy,
  QrCode,
  Link,
  Sliders,
  Check,
  ShieldCheck,
  Send,
  Loader2,
  ToggleRight,
  ToggleLeft
} from "lucide-react";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

interface MetaForm {
  id: string;
  formName: string;
  pageName: string;
  leadsSynced: number;
  isActive: boolean;
}

export default function IntegrationsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "meta" | "embed" | "smtp">("whatsapp");
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showMetaDisconnectConfirm, setShowMetaDisconnectConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadConfig() {
      try {
        const [configRes, formsRes] = await Promise.all([
          axiosInstance.get("/api/client-admin/company/config"),
          axiosInstance.get(ENDPOINTS.clientAdmin.metaForms)
        ]);

        const config = configRes.data;
        if (config.id) {
          setCompanyId(config.id);
        }
        setWhatsappConnected(config.whatsappConnected);
        setWhatsappPhone(config.whatsappPhone || "");
        setWhatsappName(config.whatsappName || "");

        setSmtpHost(config.smtpHost || "");
        setSmtpPort(config.smtpPort || "");
        setSmtpUser(config.smtpUser || "");
        setSmtpEncryption(config.smtpEncryption || "SSL/TLS");
        setSmtpVerified(config.smtpVerified);

        setMetaForms(formsRes.data);
      } catch (err) {
        console.error("Failed to load integrations configuration:", err);
      }
    }
    loadConfig();
  }, []);

  // State 1: WhatsApp integration simulation
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [showPairingCode, setShowPairingCode] = useState(false);
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappName, setWhatsappName] = useState("");
  const [isGeneratingPairing, setIsGeneratingPairing] = useState(false);

  // State 2: Meta integration simulation
  const [metaConnected, setMetaConnected] = useState(true);
  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
  const [metaForms, setMetaForms] = useState<MetaForm[]>([]);

  // State 3: Embed Form Designer
  const [companyId, setCompanyId] = useState("company-infotattva-id");
  const [formTitle, setFormTitle] = useState("Get Free Project Consultation");
  const [formTheme, setFormTheme] = useState<"light" | "dark" | "glass">("light");
  const [accentColor, setAccentColor] = useState("#6366f1"); // Indigo
  const [showFormFields, setShowFormFields] = useState({
    name: true,
    email: true,
    phone: true,
    service: true,
  });

  // State 4: SMTP Custom Server Configuration
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpEncryption, setSmtpEncryption] = useState("SSL/TLS");
  const [smtpVerified, setSmtpVerified] = useState(false);
  const [isVerifyingSmtp, setIsVerifyingSmtp] = useState(false);

  // Notification Banner
  const triggerToast = (msg: string) => {
    toast.success(msg);
  };

  // WhatsApp coupling actions
  const handleGeneratePairing = async () => {
    if (!whatsappPhone.trim() || !whatsappName.trim()) {
      toast.error("Please enter a phone number and display name first.");
      return;
    }
    setIsGeneratingPairing(true);
    try {
      const res = await axiosInstance.post(ENDPOINTS.clientAdmin.pairingCode);
      setIsGeneratingPairing(false);
      setShowPairingCode(true);
      setPairingCodeInput(res.data.pairingCode || "KV82-9X42");
      triggerToast("Pairing Verification Code generated successfully!");
    } catch (err) {
      console.error(err);
      setIsGeneratingPairing(false);
      toast.error("Failed to generate pairing code.");
    }
  };

  const handleVerifyPairing = async () => {
    try {
      const res = await axiosInstance.post(ENDPOINTS.clientAdmin.verifyWhatsapp, {
        phone: whatsappPhone || "+91 94380 99999",
        name: whatsappName || "Infotattva Business Live Desk",
      });
      setWhatsappConnected(res.data.whatsappConnected);
      setWhatsappPhone(res.data.whatsappPhone);
      setWhatsappName(res.data.whatsappName);
      setShowPairingCode(false);
      triggerToast("WhatsApp Business Channel coupled successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify WhatsApp coupling.");
    }
  };

  const handleDisconnectWhatsapp = () => {
    setShowDisconnectConfirm(true);
  };

  // Meta Campaign Forms actions
  const handleConnectMeta = () => {
    setIsConnectingMeta(true);
    setTimeout(() => {
      setIsConnectingMeta(false);
      setMetaConnected(true);
      triggerToast("Connected with Meta Business Account successfully!");
    }, 2000);
  };

  const handleToggleForm = (id: string) => {
    setMetaForms(
      metaForms.map((f) =>
        f.id === id ? { ...f, isActive: !f.isActive } : f
      )
    );
    const form = metaForms.find((f) => f.id === id);
    if (form) {
      triggerToast(
        `Campaign Form '${form.formName}' is now ${form.isActive ? "disabled" : "enabled"
        } in lead syncing.`
      );
    }
  };

  // SMTP Verification
  const handleVerifySmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingSmtp(true);
    try {
      const res = await axiosInstance.post(ENDPOINTS.clientAdmin.verifySMTP, {
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpEncryption,
      });
      setIsVerifyingSmtp(false);
      setSmtpVerified(res.data.smtpVerified);
      setSmtpHost(res.data.smtpHost);
      setSmtpUser(res.data.smtpUser);
      triggerToast("SMTP Settings verified! Connection check passed successfully.");
    } catch (err) {
      console.error(err);
      setIsVerifyingSmtp(false);
      toast.error("Failed to verify SMTP settings.");
    }
  };

  // Copy code snippet
  const handleCopySnippet = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://crm.infotattva.com";
    const code = `<!-- Infotattva CRM Inbound Embed Form -->
<div id="infotattva-lead-widget" data-company="${companyId}" data-theme="${formTheme}" data-accent="${accentColor}"></div>
<script src="${origin}/widgets/lead-form.js" async defer></script>
<iframe src="${origin}/embed/forms?id=${companyId}&theme=${formTheme}&accent=${encodeURIComponent(
      accentColor
    )}" width="100%" height="450px" style="border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.05)"></iframe>`;

    navigator.clipboard.writeText(code);
    triggerToast("Web Widget copy-paste code copied to clipboard!");
  };

  if (!mounted) {
    return (
      <DashboardWrapper>
        <div className="space-y-6 animate-pulse p-6">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800/80 rounded-lg w-96" />
          </div>
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full max-w-lg" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="space-y-6 select-none relative">
        <ConfirmModal
          isOpen={showDisconnectConfirm}
          title="Disconnect WhatsApp Channel"
          message="Are you sure you want to disconnect this WhatsApp Channel? Auto-responses will stop."
          confirmText="Disconnect"
          onConfirm={async () => {
            try {
              const res = await axiosInstance.post(ENDPOINTS.clientAdmin.verifyWhatsapp, {
                connected: false
              });
              setWhatsappConnected(res.data.whatsappConnected);
              setWhatsappPhone("");
              setWhatsappName("");
              triggerToast("WhatsApp Channel disconnected.");
            } catch (err) {
              console.error(err);
              toast.error("Failed to disconnect WhatsApp Channel.");
            } finally {
              setShowDisconnectConfirm(false);
            }
          }}
          onCancel={() => setShowDisconnectConfirm(false)}
        />
        <ConfirmModal
          isOpen={showMetaDisconnectConfirm}
          title="Decouple Meta Ads Account"
          message="Are you sure you want to decouple the Meta Ads API integration?"
          confirmText="Disconnect"
          onConfirm={() => {
            setMetaConnected(false);
            triggerToast("Facebook Ads account decoupled.");
          }}
          onCancel={() => setShowMetaDisconnectConfirm(false)}
        />


        {/* Page Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Inbound Channels & Integrations <Settings className="h-6 w-6 text-indigo-500" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Link WhatsApp Business channels, bind Meta Lead Ads campaigns, and configure outgoing SMTP notifications.
            </p>
          </div>
        </div>

        {/* Dynamic Tab Switchers */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg text-xs font-bold">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${activeTab === "whatsapp"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
          >
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={() => setActiveTab("meta")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${activeTab === "meta"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
          >
            <FacebookIcon className="h-4 w-4" /> Meta / FB Ads
          </button>
          <button
            onClick={() => setActiveTab("embed")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${activeTab === "embed"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
          >
            <Globe className="h-4 w-4" /> Web Widget
          </button>
          <button
            onClick={() => setActiveTab("smtp")}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${activeTab === "smtp"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
              }`}
          >
            <Mail className="h-4 w-4" /> Custom SMTP
          </button>
        </div>

        {/* WhatsApp Channel Tab */}
        {activeTab === "whatsapp" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* WhatsApp Profile Details Card */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-1.5">
                    WhatsApp Business API Settings <MessageSquare className="h-4.5 w-4.5 text-emerald-500" />
                  </h3>
                  <p className="text-[11px] text-slate-400">Manage Meta Business cloud messaging profile variables.</p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${whatsappConnected
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                >
                  {whatsappConnected ? "operational" : "disconnected"}
                </span>
              </div>

              {whatsappConnected ? (
                <div className="space-y-4.5 text-xs font-semibold">
                  {/* Sync Details */}
                  <div className="p-4 border border-emerald-500/10 bg-emerald-500/5 rounded-2xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 block">WhatsApp API Connected</span>
                      <span className="text-[10px] text-slate-400 font-medium">Auto-responses and inbound lead logs active</span>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-pulse" />
                  </div>

                  {/* Settings form inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 uppercase text-[9px]">Linked Phone Number</label>
                      <input
                        type="text"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 uppercase text-[9px]">Display Profile Name</label>
                      <input
                        type="text"
                        value={whatsappName}
                        onChange={(e) => setWhatsappName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>

                  {/* Profile Status alerts */}
                  <div className="flex gap-2.5 items-start p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] leading-normal text-slate-450 font-medium">
                    <ShieldCheck className="h-4.5 w-4.5 text-primary shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-350 block">Official Business Account Status</span>
                      <span className="mt-0.5 block">Your number is verified by Meta. Rate limit tiers allow up to 10,000 outgoing marketing message campaigns per 24 hours.</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleDisconnectWhatsapp}
                      className="px-4 py-2 border border-rose-200/50 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl hover:bg-rose-100 transition"
                    >
                      Disconnect API
                    </button>
                    <button
                      onClick={() => triggerToast("WhatsApp API Profile Settings saved!")}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-gray-500 text-white rounded-xl font-bold shadow hover:scale-102 transition"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center gap-4.5">
                  <QrCode className="h-16 w-16 text-slate-300" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Couple WhatsApp Cloud API</p>
                    <p className="text-xs text-slate-450 max-w-[280px]">Link a phone number to let AI co-pilots answer customer enquiries instantly.</p>
                  </div>

                  {!showPairingCode ? (
                    <div className="flex flex-col items-center gap-3.5 w-full max-w-xs">
                      <div className="w-full text-left space-y-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-400 uppercase text-[9px] tracking-wide">WhatsApp Phone Number</label>
                          <input
                            type="text"
                            placeholder="e.g. +91 94380 99999"
                            value={whatsappPhone}
                            onChange={(e) => setWhatsappPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none text-xs font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-400 uppercase text-[9px] tracking-wide">Display Profile Name</label>
                          <input
                            type="text"
                            placeholder="e.g. My Business Support Desk"
                            value={whatsappName}
                            onChange={(e) => setWhatsappName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleGeneratePairing}
                        disabled={isGeneratingPairing}
                        className="w-full py-2.5 bg-gradient-to-r from-primary to-gray-500 text-white rounded-xl font-bold text-xs uppercase shadow hover:scale-102 transition flex items-center justify-center gap-2"
                      >
                        {isGeneratingPairing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Generating Code...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" /> Link Phone Number
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm flex flex-col items-center">
                      <span className="text-[9px] uppercase font-bold text-slate-400">WhatsApp Coupling Code</span>
                      <span className="text-2xl font-black font-mono tracking-widest text-primary bg-white dark:bg-slate-900 px-4 py-1.5 rounded-xl border">
                        {pairingCodeInput}
                      </span>
                      <p className="text-[10px] text-slate-450 leading-relaxed max-w-[240px]">
                        Open WhatsApp on your mobile phone &gt; Settings &gt; Linked Devices &gt; Link a Device, then enter this code.
                      </p>
                      <button
                        onClick={handleVerifyPairing}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow"
                      >
                        Confirm Device Coupled
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick API Stats Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-1.5">
                Channel Statistics <Zap className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
              </h3>

              <div className="space-y-3">
                {[
                  { name: "Gemini AI Success Rate", val: "99.8%", color: "text-emerald-500" },
                  { name: "Average Response Time", val: "45s", color: "text-indigo-500" },
                  { name: "Active WhatsApp Templates", val: "3 approved", color: "text-purple-500" },
                  { name: "Meta Retrying Wait Queue", val: "0 delays", color: "text-slate-450" },
                ].map((stat) => (
                  <div key={stat.name} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{stat.name}</span>
                    <span className={`font-black ${stat.color}`}>{stat.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Meta Ads / Facebook Page Binding */}
        {activeTab === "meta" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-1.5">
                  Meta Ads Lead Campaign Forms Bindings <FacebookIcon className="h-5 w-5 text-blue-500" />
                </h3>
                <p className="text-[11px] text-slate-400">Map Facebook page lead ads forms to sync leads instantly into your pipeline.</p>
              </div>

              {!metaConnected ? (
                <button
                  onClick={handleConnectMeta}
                  disabled={isConnectingMeta}
                  className="px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  {isConnectingMeta ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Linking Account...
                    </>
                  ) : (
                    <>
                      <FacebookIcon className="h-4 w-4" /> Link Meta Account
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/40 text-blue-600 rounded">Account Synced</span>
                  <button
                    onClick={() => setShowMetaDisconnectConfirm(true)}
                    className="text-xs text-rose-500 hover:underline font-bold"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {metaConnected ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wide">
                  <span>Available Forms</span>
                  <span>Syncing State</span>
                </div>

                <div className="space-y-3">
                  {metaForms.map((form) => (
                    <div key={form.id} className="p-4 border border-slate-100 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-950/40 rounded-2xl flex items-center justify-between text-xs transition bg-slate-50/20 dark:bg-slate-950/5">
                      <div className="flex gap-3.5 items-start">
                        <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <FacebookIcon className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-slate-900 dark:text-slate-50 text-sm leading-tight block">
                            {form.formName}
                          </span>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            Facebook Page: {form.pageName} • Synced: {form.leadsSynced} Leads
                          </p>
                        </div>
                      </div>

                      <button onClick={() => handleToggleForm(form.id)} className="text-slate-500 transition">
                        {form.isActive ? (
                          <ToggleRight className="h-7 w-7 text-blue-500 animate-pulse" />
                        ) : (
                          <ToggleLeft className="h-7 w-7 text-slate-300 dark:text-slate-700" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <FacebookIcon className="h-14 w-14 text-slate-300" />
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Bind FB Leads Campaigns</p>
                <p className="text-xs text-slate-450 max-w-xs">Connecting your Meta Ads Manager will automatically sync prospects into the CRM within 10 seconds of clicking your ads.</p>
              </div>
            )}
          </div>
        )}

        {/* Website embeddable form widget constructor */}
        {activeTab === "embed" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form Customizer Options */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
              <div className="space-y-4 text-xs font-semibold">
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-1.5">
                  Form Widget Designer <Sliders className="h-4.5 w-4.5 text-indigo-500" />
                </h3>
                <p className="text-[11px] text-slate-400 font-medium leading-normal">
                  Customize the embed widget theme aesthetics and copy the snippet code into your landing page or website.
                </p>

                {/* Form Title Setting */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Form Widget Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  />
                </div>

                {/* Widget Accent Color */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px] block">Widget Styling Accent Color</label>
                  <div className="flex gap-2.5">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-8 w-12 rounded-xl border cursor-pointer bg-slate-50"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 uppercase tracking-widest font-mono font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>

                {/* Widget Styling Theme Selection */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px] block">Widget Theme</label>
                  <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 border rounded-xl">
                    {["light", "dark", "glass"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setFormTheme(t as any)}
                        className={`flex-1 py-1 rounded-lg uppercase text-[9px] font-black transition ${formTheme === t
                            ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow"
                            : "text-slate-400"
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action output script code copy */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 space-y-2">
                <button
                  onClick={handleCopySnippet}
                  className="w-full py-2.5 bg-gradient-to-r from-primary to-gray-500 text-white rounded-xl font-bold text-xs uppercase shadow hover:scale-102 transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="h-4 w-4" /> Copy Snippet Code
                </button>
              </div>
            </div>

            {/* Widget Preview Mockup Panel */}
            <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[360px] relative">
              <span className="absolute top-4 left-4 font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                Live responsive widget preview mockup
              </span>

              {/* Preview form container */}
              <div
                className={`w-full max-w-sm p-6 rounded-2xl shadow-xl border select-none transition-all duration-300 ${formTheme === "dark"
                    ? "bg-slate-900 border-slate-850 text-slate-50"
                    : formTheme === "glass"
                      ? "bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border-white/20 text-slate-900 dark:text-slate-100"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
              >
                <p className="font-extrabold text-sm tracking-tight text-center mb-4">{formTitle}</p>

                <div className="space-y-3 text-[10px] font-bold">
                  {showFormFields.name && (
                    <div className="space-y-1">
                      <label className="text-slate-400 uppercase text-[8px] tracking-wider">Your Name</label>
                      <input
                        type="text"
                        disabled
                        placeholder="Full Name"
                        className="w-full px-3 py-1.8 border rounded-lg bg-transparent text-xs opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  )}

                  {showFormFields.phone && (
                    <div className="space-y-1">
                      <label className="text-slate-400 uppercase text-[8px] tracking-wider">WhatsApp Number</label>
                      <input
                        type="text"
                        disabled
                        placeholder="+91..."
                        className="w-full px-3 py-1.8 border rounded-lg bg-transparent text-xs opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  )}

                  <button
                    disabled
                    className="w-full py-2.5 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider opacity-60 flex items-center justify-center gap-1.5 transition-colors cursor-not-allowed mt-2"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Send className="h-3.5 w-3.5" /> Submit Inquiry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mail SMTP Setup */}
        {activeTab === "smtp" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm max-w-3xl space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-2">
                  Outgoing Custom Mail Server SMTP Setup <Mail className="h-4.5 w-4.5 text-indigo-500" />
                </h3>
                <p className="text-[11px] text-slate-400">Configure email alerts dispatched directly from your company domain.</p>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${smtpVerified
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 animate-pulse"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
              >
                {smtpVerified ? "verified" : "unchecked"}
              </span>
            </div>

            <form onSubmit={handleVerifySmtp} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">SMTP Outgoing Host</label>
                  <input
                    type="text"
                    required
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Server Port</label>
                  <input
                    type="text"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">SMTP Auth User Name</label>
                  <input
                    type="text"
                    required
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">SMTP Auth Password</label>
                  <input
                    type="password"
                    required
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px] block">Encryption Method</label>
                  <select
                    value={smtpEncryption}
                    onChange={(e) => setSmtpEncryption(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                  >
                    <option>SSL/TLS</option>
                    <option>STARTTLS</option>
                    <option>None (Insecure)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isVerifyingSmtp}
                  className="px-5 py-2.5 bg-gradient-to-r from-primary to-gray-500 text-white rounded-xl font-bold shadow hover:scale-102 transition flex items-center gap-1.5"
                >
                  {isVerifyingSmtp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Connection...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4.5 w-4.5" /> Test & Save Settings
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
}
