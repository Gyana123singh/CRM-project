"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import { Users, Plus, Trash2, X, Tag, Settings, ChevronRight } from "lucide-react";

export default function ContactGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDynamic, setIsDynamic] = useState(false);
  const [dynamicTags, setDynamicTags] = useState("");

  const fetchGroups = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.groups);
      setGroups(res.data);
    } catch {
      setGroups([
        { id: "1", name: "Premium Customers", description: "High-value repeat buyers", isDynamic: false, contactCount: 245, createdAt: new Date().toISOString() },
        { id: "2", name: "Leads", description: "New potential customers", isDynamic: true, dynamicRules: { tags: ["Lead"] }, contactCount: 892, createdAt: new Date().toISOString() },
        { id: "3", name: "Restaurant Customers", description: "Food business clients", isDynamic: false, contactCount: 156, createdAt: new Date().toISOString() },
        { id: "4", name: "Real Estate Leads", description: "Property inquiry contacts", isDynamic: true, dynamicRules: { tags: ["Real Estate"] }, contactCount: 420, createdAt: new Date().toISOString() },
      ]);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      const payload: any = { name, description, isDynamic };
      if (isDynamic && dynamicTags) {
        payload.dynamicRules = { tags: dynamicTags.split(",").map(t => t.trim()).filter(Boolean) };
      }
      if (editGroup) {
        await axiosInstance.patch(ENDPOINTS.whatsapp.groupDetail(editGroup.id), payload);
        toast.success("Group updated!");
      } else {
        await axiosInstance.post(ENDPOINTS.whatsapp.groups, payload);
        toast.success("Group created!");
      }
      setShowModal(false); setEditGroup(null); resetForm(); fetchGroups();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save group");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this group?")) return;
    try {
      await axiosInstance.delete(ENDPOINTS.whatsapp.groupDetail(id));
      toast.success("Group deleted");
      fetchGroups();
    } catch { toast.error("Failed to delete group"); }
  };

  const resetForm = () => { setName(""); setDescription(""); setIsDynamic(false); setDynamicTags(""); };
  const openEdit = (g: any) => {
    setEditGroup(g); setName(g.name); setDescription(g.description || "");
    setIsDynamic(g.isDynamic);
    setDynamicTags(g.dynamicRules?.tags?.join(", ") || "");
    setShowModal(true);
  };

  const groupColors = ["bg-emerald-500/10 text-emerald-600", "bg-violet-500/10 text-violet-600", "bg-amber-500/10 text-amber-600", "bg-rose-500/10 text-rose-600", "bg-blue-500/10 text-blue-600", "bg-teal-500/10 text-teal-600"];

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">Contact Groups <Tag className="h-5 w-5 text-violet-500" /></h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create static or dynamic contact groups for targeted campaigns.</p>
          </div>
          <button onClick={() => { resetForm(); setEditGroup(null); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Create Group
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g, idx) => (
            <div key={g.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group relative">
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${groupColors[idx % groupColors.length]} shrink-0`}>
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition opacity-0 group-hover:opacity-100"><Settings className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{g.name}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{g.description || "No description"}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-slate-900 dark:text-slate-100">{(g.contactCount || g._count?.contacts || 0).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contacts</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${g.isDynamic ? "bg-violet-100 dark:bg-violet-950/40 text-violet-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                  {g.isDynamic ? "Dynamic" : "Static"}
                </span>
              </div>
              {g.isDynamic && g.dynamicRules?.tags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {g.dynamicRules.tags.map((t: string) => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-50 dark:bg-violet-950/20 text-violet-500">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">{editGroup ? "Edit Group" : "Create Group"}</h3>
              <button onClick={() => { setShowModal(false); setEditGroup(null); resetForm(); }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Group Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Premium Customers" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this group..." rows={2} className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Dynamic Group?</label>
                <button type="button" onClick={() => setIsDynamic(!isDynamic)} className={`w-10 h-5 rounded-full transition-all ${isDynamic ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"} relative`}>
                  <span className={`absolute top-0.5 ${isDynamic ? "right-0.5" : "left-0.5"} w-4 h-4 bg-white rounded-full shadow transition-all`} />
                </button>
              </div>
              {isDynamic && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Filter by Tags (comma-separated)</label>
                  <input type="text" value={dynamicTags} onChange={(e) => setDynamicTags(e.target.value)} placeholder="e.g. Premium, VIP" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditGroup(null); resetForm(); }} className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 text-white rounded-xl font-bold shadow-md transition-all">{editGroup ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
}
