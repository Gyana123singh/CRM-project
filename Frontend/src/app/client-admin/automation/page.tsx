"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, setRules, addRule, toggleRuleStatus, deleteRule } from "@/store";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { Zap, Plus, Play, Pause, Trash2, ArrowRight, Clock, ShieldAlert, Sparkles } from "lucide-react";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";

export default function AutomationPage() {
  const dispatch = useDispatch();
  const rules = useSelector((state: RootState) => state.automation.rules);

  useEffect(() => {
    async function fetchRules() {
      try {
        const response = await axiosInstance.get(ENDPOINTS.clientAdmin.automationRules);
        dispatch(setRules(response.data));
      } catch (error) {
        console.error("Failed to fetch automation rules:", error);
      }
    }
    fetchRules();
  }, [dispatch]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<any>("New Lead Created");
  const [condition, setCondition] = useState("");
  const [delay, setDelay] = useState("Instant");
  const [actions, setActions] = useState<string[]>([]);
  const [actionInput, setActionInput] = useState("");

  const handleAddAction = () => {
    if (actionInput.trim()) {
      setActions([...actions, actionInput.trim()]);
      setActionInput("");
    }
  };

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || actions.length === 0) return;

    try {
      const response = await axiosInstance.post(ENDPOINTS.clientAdmin.automationRules, {
        name,
        trigger,
        condition: condition || "No conditions apply",
        actions,
        delay,
      });

      dispatch(addRule(response.data));
      toast.success(`Rule "${name}" created successfully`);
      setName("");
      setCondition("");
      setDelay("Instant");
      setActions([]);
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to create automation rule:", error);
      toast.error("Failed to create automation rule");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await axiosInstance.patch(ENDPOINTS.clientAdmin.ruleStatus(id));
      dispatch(toggleRuleStatus({ id }));
      toast.success("Rule status updated");
    } catch (error) {
      console.error("Failed to toggle rule status:", error);
      toast.error("Failed to toggle rule status");
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await axiosInstance.delete(ENDPOINTS.clientAdmin.ruleDelete(id));
      dispatch(deleteRule({ id }));
      toast.success("Rule deleted successfully");
    } catch (error) {
      console.error("Failed to delete rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        {/* Page Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Automation Rules Engine <Zap className="h-6 w-6 text-indigo-500" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Configure trigger triggers, delay actions, WhatsApp co-pilot replies, and CRM workflow pipelines.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all"
          >
            <Plus className="h-4 w-4" /> Create Custom Rule
          </button>
        </div>

        {/* Rule Nodes Visual Map Blueprint */}
        <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-slate-800 text-xs shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
            <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" /> Rule Pipeline Logic Nodes Map
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-7 items-center justify-between gap-3.5 pt-2">
            {/* Node 1 */}
            <div className="md:col-span-2 p-4 bg-slate-950/60 border border-indigo-500/20 rounded-2xl flex flex-col gap-1.5 shadow-lg relative group">
              <span className="text-[9px] uppercase font-bold text-indigo-400">Trigger Node</span>
              <p className="font-bold text-slate-200">Customer Fills Website Form</p>
              <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 hidden md:block">
                <ArrowRight className="h-4 w-4 text-indigo-400" />
              </div>
            </div>

            {/* Link 1 */}
            <div className="md:col-span-1 flex justify-center text-slate-500 font-bold">
              <ArrowRight className="h-5 w-5 md:hidden text-indigo-500" />
            </div>

            {/* Node 2 */}
            <div className="md:col-span-2 p-4 bg-slate-950/60 border border-teal-500/20 rounded-2xl flex flex-col gap-1.5 shadow-lg relative">
              <span className="text-[9px] uppercase font-bold text-teal-400">Rules / Condition</span>
              <p className="font-bold text-slate-200">Delay delay: Instant</p>
              <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 hidden md:block">
                <ArrowRight className="h-4 w-4 text-teal-400" />
              </div>
            </div>

            {/* Link 2 */}
            <div className="md:col-span-1 flex justify-center text-slate-500 font-bold">
              <ArrowRight className="h-5 w-5 md:hidden text-indigo-500" />
            </div>

            {/* Node 3 */}
            <div className="md:col-span-1 p-4 bg-gradient-to-tr from-primary to-primary-light rounded-2xl flex flex-col gap-1 text-white shadow-lg font-bold">
              <span className="text-[9px] uppercase font-semibold text-purple-200">Actions</span>
              <p>1. Send WhatsApp</p>
              <p>2. Assign Team</p>
            </div>
          </div>
        </div>

        {/* Rules Configurations Panel */}
        <div className="grid grid-cols-1 gap-4.5">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
              
              <div className="space-y-2 flex-1">
                {/* Rule Title and Status Indicator */}
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded-md ${rule.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>
                    <Zap className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{rule.name}</h3>
                  <span className={`px-2 py-0.2 rounded text-[8px] font-bold uppercase ${
                    rule.status === "active" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}>
                    {rule.status}
                  </span>
                </div>

                {/* Nodes Parameters Details */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] font-bold block">When:</span>
                    <span>{rule.trigger}</span>
                  </div>
                  <div className="hidden sm:block border-r border-slate-200 dark:border-slate-800 h-5" />
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] font-bold block">Condition:</span>
                    <span>{rule.condition || "None"}</span>
                  </div>
                  <div className="hidden sm:block border-r border-slate-200 dark:border-slate-800 h-5" />
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] font-bold block">Delay:</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {rule.delay}</span>
                  </div>
                </div>

                {/* Actions flow */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-bold">
                  <span className="text-slate-400 uppercase text-[9px] font-bold mr-1">Then execute:</span>
                  {rule.actions.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.8 rounded text-slate-600 font-medium">
                      <span>{act}</span>
                      {idx < rule.actions.length - 1 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Switcher & Delete Controls */}
              <div className="flex items-center gap-3 self-end md:self-auto border-t md:border-t-0 pt-3.5 md:pt-0 border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleToggleStatus(rule.id)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1 transition ${
                    rule.status === "active"
                      ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200/50 hover:bg-amber-100"
                      : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200/50 hover:bg-emerald-100"
                  }`}
                >
                  {rule.status === "active" ? (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Pause Rule
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" /> Activate Rule
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition"
                  title="Delete Rule"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Create Custom Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative animate-fade-in">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">
              Construct Custom Automation Rule
            </h3>
            <p className="text-xs text-slate-400 mt-1">Specify custom triggers, filter rules, delayed queues, and action chains.</p>

            <form onSubmit={handleCreateRuleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meta Ads instant lead alert"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Event Trigger *</label>
                  <select
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option>New Lead Created</option>
                    <option>Status Updated</option>
                    <option>No Customer Response</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Execution Delay</label>
                  <select
                    value={delay}
                    onChange={(e) => setDelay(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option>Instant</option>
                    <option>24 Hours</option>
                    <option>3 Days</option>
                    <option>7 Days</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Filter Conditions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Source is Meta Ads and service interest equals '2BHK'"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              {/* Action nodes chain */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Action Chain *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Send Welcome WhatsApp Message"
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 rounded-xl font-bold transition"
                  >
                    Add Action
                  </button>
                </div>
                
                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-2 font-bold">
                    {actions.map((act, i) => (
                      <span key={i} className="px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[10px]">
                        {act}
                        <button type="button" onClick={() => setActions(actions.filter((_, idx) => idx !== i))} className="text-rose-500 font-black">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actions.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 text-white rounded-xl font-bold shadow-md shadow-primary/10 disabled:opacity-50 transition-all"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
}

