"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import {
  Settings, Key, Link as LinkIcon, Link2Off, RefreshCw, CheckCircle,
  Copy, Shield, Smartphone, Globe, Eye, EyeOff, Check, Terminal, ExternalLink
} from "lucide-react";

export default function WhatsappSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<any>(null);

  // Form states for Meta credentials connection
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("Cloud API");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  // API Key states
  const [apiKeyInfo, setApiKeyInfo] = useState<any>({ apiKey: null, hasAccessToken: false });
  const [copiedKey, setCopiedKey] = useState(false);
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const [settingsRes, apiKeyRes] = await Promise.all([
        axiosInstance.get(ENDPOINTS.whatsapp.settings),
        axiosInstance.get(ENDPOINTS.whatsapp.apiKeys),
      ]);
      
      const settings = settingsRes.data;
      setConnected(settings.connected);
      setAccount(settings.account);
      if (settings.account) {
        setPhone(settings.account.phone || "");
        setName(settings.account.name || "");
        setProvider(settings.account.provider || "Cloud API");
        setAccessToken(settings.account.accessToken || "");
      }
      setApiKeyInfo(apiKeyRes.data);
    } catch {
      // Fallback fallback states for development UI previewing
      setConnected(false);
      setAccount(null);
      setApiKeyInfo({ apiKey: "wa_129487...", hasAccessToken: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !name) {
      toast.error("Phone number and Account Name are required");
      return;
    }
    try {
      const res = await axiosInstance.post(ENDPOINTS.whatsapp.settingsConnect, {
        phone,
        name,
        provider,
        accessToken,
      });
      toast.success("WhatsApp Account connection successful!");
      setConnected(true);
      setAccount(res.data);
      fetchSettings();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Connection attempt failed");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this WhatsApp Business Account? This will pause all active campaigns.")) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.settingsDisconnect);
      toast.info("WhatsApp Account disconnected");
      setConnected(false);
      setAccount(null);
      fetchSettings();
    } catch {
      toast.error("Failed to disconnect account");
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm("Regenerating the API Key will immediately revoke the current key. Any external apps using it will break. Continue?")) return;
    try {
      const res = await axiosInstance.post(ENDPOINTS.whatsapp.apiKeysRegenerate);
      setRegeneratedKey(res.data.apiKey);
      toast.success("New API Key generated successfully!");
      fetchSettings();
    } catch {
      toast.error("Failed to regenerate API Key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 text-emerald-650 animate-spin" />
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">WhatsApp Settings <Settings className="h-5 w-5 text-indigo-500" /></h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure Meta Cloud API credentials, webhook endpoints, and authorization keys.</p>
        </div>

        {/* Connection Status Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-500" /> WhatsApp Integration Status
            </h3>

            {connected ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 p-4 rounded-xl flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-slate-900 dark:text-slate-100">WhatsApp Account Active</h4>
                  <p className="text-slate-500 dark:text-slate-400">Linked to: <span className="font-bold text-slate-700 dark:text-slate-200">{account?.name || "Business Core API"}</span></p>
                  <p className="text-slate-500 dark:text-slate-400">Sender Phone: <span className="font-bold text-slate-700 dark:text-slate-200">+{account?.phone}</span></p>
                  <p className="text-slate-500 dark:text-slate-400">Provider: <span className="font-bold text-slate-750 dark:text-slate-200">{account?.provider}</span></p>
                  <div className="pt-2">
                    <button onClick={handleDisconnect} className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition">
                      <Link2Off className="h-3 w-3" /> Disconnect Integration
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">WhatsApp Account Name *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Support Main"
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">WhatsApp Phone Number *</label>
                    <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 919876543210 (with country code)"
                      className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Meta API Provider Type</label>
                  <select value={provider} onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold">
                    <option value="Cloud API">Meta Cloud API (Official Sandbox / Production)</option>
                    <option value="Local Sandbox">Mock / Local Sandbox Simulator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-400 uppercase text-[10px]">Meta Permanent Access Token</label>
                    <span className="text-[9px] text-slate-400">Can be left empty for Local Simulator mode</span>
                  </div>
                  <div className="relative">
                    <input type={showToken ? "text" : "password"} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAGb3Y..."
                      className="w-full pl-3 pr-10 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono" />
                    <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-2.5 text-slate-455 hover:text-slate-700">
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 text-white rounded-xl text-xs font-bold shadow-md transition-all">
                    <LinkIcon className="h-4 w-4" /> Connect Meta Cloud Account
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Guide Card */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-500" /> Meta API Credentials
            </h3>
            <div className="text-[11px] text-slate-500 space-y-2.5 leading-relaxed">
              <p>To integrate your official WhatsApp Business number, you need a Meta Developers configuration:</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Create a Business App on developers.facebook.com</li>
                <li>Set up WhatsApp Business API dashboard on the App config portal.</li>
                <li>Retrieve your permanent Access Token under System Users in Business Manager.</li>
                <li>Setup verification webhook pointing to:</li>
              </ol>
              <div className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-[9px] text-slate-800 dark:text-slate-200 truncate flex items-center justify-between">
                <span>https://crm.leadsangrah.com/api/webhooks/whatsapp</span>
                <button onClick={() => copyToClipboard("https://crm.leadsangrah.com/api/webhooks/whatsapp")} className="text-slate-400 hover:text-slate-600"><Copy className="h-3 w-3" /></button>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 flex items-start gap-1 font-semibold pt-1">
                <Smartphone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Note: Mock Sandbox mode requires no access token configurations to test campaign delivery metrics immediately.
              </p>
            </div>
          </div>
        </div>

        {/* API Keys Credentials Console */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-500" /> Developer Automation API Key
          </h3>
          <p className="text-xs text-slate-500">Generate authorization tokens to trigger campaign dispatches, contacts loading, or triggers via REST API integrations.</p>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[9px]">Active Client API Key Token</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {regeneratedKey || apiKeyInfo.apiKey || "No API key active / click regenerate"}
                  </span>
                  {(regeneratedKey || apiKeyInfo.apiKey) && (
                    <button onClick={() => copyToClipboard(regeneratedKey || apiKeyInfo.apiKey)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500">
                      {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              <button onClick={handleRegenerateKey} className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto text-slate-700 dark:text-slate-200">
                <RefreshCw className="h-3.5 w-3.5" /> {apiKeyInfo.apiKey ? "Regenerate Key" : "Generate Key"}
              </button>
            </div>

            {regeneratedKey && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg text-[10px] font-bold">
                ⚠️ Make sure to copy this new API key. It will not be shown in full text again!
              </div>
            )}
          </div>

          <div className="text-xs space-y-2">
            <span className="font-bold text-slate-400 uppercase text-[9px] flex items-center gap-1"><Terminal className="h-3 w-3 text-blue-500" /> Integration Endpoint Curl Sample</span>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10px] leading-relaxed overflow-x-auto">
              {`curl -X POST "https://crm.leadsangrah.com/api/client-admin/whatsapp/campaigns/trigger-dispatch" \\
  -H "Authorization: Bearer ${regeneratedKey || "YOUR_API_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{ "campaignId": "xxxx-xxxx-xxxx" }'`}
            </div>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}
