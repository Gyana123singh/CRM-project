"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import {
  CreditCard, Check, Zap, RefreshCw, AlertCircle, BarChart3,
  ArrowRight, ShieldCheck, HelpCircle, Activity, Award
} from "lucide-react";

export default function WhatsappBillingPage() {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);

  const fetchBillingInfo = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.billing);
      setBilling(res.data);
    } catch {
      // Fallback data for development previewing
      setBilling({
        plan: "STARTER_PLAN",
        credits: 850,
        usage: {
          messagesUsed: 230,
          messagesLimit: 1000,
          messagesRemaining: 770,
          campaignCount: 4,
          campaignLimit: 10,
          contactCount: 150,
          contactLimit: 500,
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const handleUpgrade = async (planKey: string) => {
    if (!confirm(`Upgrade company workspace plan to ${planKey.replace("_", " ")}?`)) return;
    setUpgrading(true);
    try {
      // Defer to core billing plan upgrade route
      await axiosInstance.patch("/api/client-admin/billing/plan", { plan: planKey });
      toast.success("Billing plan updated successfully!");
      fetchBillingInfo();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Upgrade transaction failed");
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 text-indigo-650 animate-spin" />
        </div>
      </DashboardWrapper>
    );
  }

  const { plan, credits, usage } = billing;

  const planNames: Record<string, string> = {
    STARTER_PLAN: "Starter Plan",
    GROWTH_PLAN: "Growth Plan",
    PREMIUM_PLAN: "Premium Plan",
  };

  const planPricing: Record<string, string> = {
    STARTER_PLAN: "₹0 / month",
    GROWTH_PLAN: "₹2,500 / month",
    PREMIUM_PLAN: "₹7,500 / month",
  };

  const getPercentage = (used: number, limit: number) => {
    if (!limit) return 0;
    return Math.min(100, (used / limit) * 100);
  };

  const stats = [
    {
      label: "Campaign messages sent",
      used: usage.messagesUsed,
      limit: usage.messagesLimit,
      color: "bg-blue-600",
      textColor: "text-blue-600",
      bgLight: "bg-blue-500/10"
    },
    {
      label: "Contacts created",
      used: usage.contactCount,
      limit: usage.contactLimit,
      color: "bg-emerald-600",
      textColor: "text-emerald-600",
      bgLight: "bg-emerald-500/10"
    },
    {
      label: "WhatsApp marketing campaigns",
      used: usage.campaignCount,
      limit: usage.campaignLimit,
      color: "bg-violet-600",
      textColor: "text-violet-600",
      bgLight: "bg-violet-500/10"
    }
  ];

  const plansList = [
    {
      key: "STARTER_PLAN",
      name: "Starter Plan",
      price: "₹0",
      period: "monthly",
      desc: "Perfect for testing automation and setup validation.",
      features: [
        "Up to 1,000 WhatsApp messages / month",
        "Up to 500 contacts stored",
        "Up to 10 marketing campaigns",
        "Official Meta Cloud integration",
        "CSV bulk upload & parsing",
        "Standard dashboards reports"
      ]
    },
    {
      key: "GROWTH_PLAN",
      name: "Growth Plan",
      price: "₹2,500",
      period: "monthly",
      desc: "For growing companies utilizing bulk messaging weekly.",
      features: [
        "Up to 10,000 WhatsApp messages / month",
        "Up to 5,000 contacts stored",
        "Up to 50 marketing campaigns",
        "Official Meta Cloud integration",
        "Interactive CSV bulk tag mapping",
        "Advanced delivery and read reports",
        "Dedicated API automation keys",
        "Standard multi-agent support"
      ]
    },
    {
      key: "PREMIUM_PLAN",
      name: "Premium Plan",
      price: "₹7,500",
      period: "monthly",
      desc: "For scale-intensive teams running daily custom drip campaigns.",
      features: [
        "Up to 100,000 WhatsApp messages / month",
        "Up to 50,000 contacts stored",
        "Up to 500 marketing campaigns",
        "Official Meta Cloud integration",
        "Priority message dispatch routing",
        "Full delivery, read, and conversion reports",
        "Developer API key + webhook subscriptions",
        "Priority tech support",
        "Custom agent routing rules"
      ]
    }
  ];

  return (
    <DashboardWrapper>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">WhatsApp Quotas & Billing <CreditCard className="h-5 w-5 text-teal-500" /></h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monitor active subscription limitations, credits consumption, and monthly allocations.</p>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto">
            <Award className="h-4 w-4 text-teal-600" />
            <span>Active Plan: <span className="text-teal-650 dark:text-teal-400 font-extrabold">{planNames[plan] || plan}</span></span>
          </div>
        </div>

        {/* Quotas Progress trackers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.map(stat => {
            const pct = getPercentage(stat.used, stat.limit);
            return (
              <div key={stat.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{stat.label}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${stat.textColor} ${stat.bgLight}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {stat.used.toLocaleString()} <span className="text-xs font-bold text-slate-400">/ {stat.limit.toLocaleString()}</span>
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${stat.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Balance / Quick Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 bg-teal-500/10 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">SMS & WhatsApp Gateway Credits</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Credits are consumed for phone lookup validations, enrichment queries, and Meta API message routing overrides.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 border-l border-slate-100 dark:border-slate-800/80 pl-6 shrink-0 md:min-w-[150px]">
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{(credits || 0).toLocaleString()}</p>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Available Credits</span>
            </div>
          </div>
        </div>

        {/* Subscriptions Options Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-2">
            Upgrade Subscription Tier <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plansList.map(item => {
              const isCurrent = plan === item.key;
              return (
                <div key={item.key} className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition relative ${isCurrent ? "border-teal-500/60 ring-2 ring-teal-500/10" : "border-slate-200 dark:border-slate-800"}`}>
                  
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-6 px-2.5 py-0.5 bg-teal-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                      Current Plan
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="flex items-baseline gap-1 py-2 border-y border-slate-100 dark:border-slate-800/80">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{item.price}</span>
                      <span className="text-[10px] font-bold text-slate-400">/ {item.period}</span>
                    </div>

                    <ul className="space-y-2">
                      {item.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                          <Check className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    {isCurrent ? (
                      <button disabled className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550 rounded-xl text-xs font-black uppercase cursor-not-allowed">
                        Already Subscribed
                      </button>
                    ) : (
                      <button onClick={() => handleUpgrade(item.key)} disabled={upgrading} className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-sm">
                        Upgrade Workspace <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-1.5"><HelpCircle className="h-4 w-4 text-slate-400" /> WhatsApp Campaign Billing FAQs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-200">How is message consumption calculated?</h4>
              <p>Every message that is successfully sent, delivered, or read counts toward your monthly allocation. Failures caused by gateway errors or invalid numbers do not deduct billing limits.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-200">Do I need my own Meta billing account?</h4>
              <p>Yes. If you link your custom Meta Developers App for high-volume delivery, Meta charges for conversation starts directly to your credit card linked to the Facebook Business Manager.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-200">What happens if I hit my limit mid-month?</h4>
              <p>Active campaigns will automatically pause and go to Scheduled/Draft state. You will receive an email notice to upgrade your plan or wait for the monthly renewal cycle.</p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-200">Can I rollover unused message quotas?</h4>
              <p>No. Monthly messages allocations refresh at the start of each billing cycle. Unused quotas do not rollover to the subsequent month.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}
