"use client";

import React, { useState, useEffect } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import { toast } from "react-toastify";
import {
  Users, Plus, Search, Filter, Trash2, Tag, Download,
  Upload, MoreVertical, X, ChevronLeft, ChevronRight,
  Phone, Mail, MessageCircle, Edit
} from "lucide-react";

export default function WhatsAppContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("All");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("91");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const fetchContacts = async (page = 1) => {
    try {
      const params: any = { page, limit: pagination.limit };
      if (search) params.search = search;
      if (tagFilter !== "All") params.tag = tagFilter;
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.contacts, { params });
      setContacts(res.data.contacts);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
      // Fallback mock data
      setContacts([
        { id: "1", firstName: "Rahul", lastName: "Sharma", mobile: "9876543210", email: "rahul@example.com", countryCode: "91", tags: ["Premium", "VIP"], status: "active", createdAt: new Date().toISOString() },
        { id: "2", firstName: "Priya", lastName: "Patel", mobile: "9876543211", email: "priya@example.com", countryCode: "91", tags: ["Lead"], status: "active", createdAt: new Date().toISOString() },
        { id: "3", firstName: "Amit", lastName: "Kumar", mobile: "9876543212", email: "amit@example.com", countryCode: "91", tags: ["Premium"], status: "active", createdAt: new Date().toISOString() },
        { id: "4", firstName: "Sneha", lastName: "Gupta", mobile: "9876543213", email: "", countryCode: "91", tags: ["Restaurant"], status: "active", createdAt: new Date().toISOString() },
        { id: "5", firstName: "Vikram", lastName: "Singh", mobile: "9876543214", email: "vikram@example.com", countryCode: "91", tags: ["Real Estate", "Lead"], status: "active", createdAt: new Date().toISOString() },
      ]);
      setPagination({ total: 5, page: 1, limit: 10, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.contactTags);
      setAllTags(res.data);
    } catch (err) {
      setAllTags(["Premium", "VIP", "Lead", "Restaurant", "Real Estate"]);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchTags();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchContacts(1), 300);
    return () => clearTimeout(timer);
  }, [search, tagFilter]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !mobile) return;
    try {
      const payload = {
        firstName, lastName, mobile, email, countryCode,
        tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        notes,
      };
      if (editContact) {
        await axiosInstance.patch(ENDPOINTS.whatsapp.contactDetail(editContact.id), payload);
        toast.success("Contact updated!");
      } else {
        await axiosInstance.post(ENDPOINTS.whatsapp.contacts, payload);
        toast.success("Contact added!");
      }
      resetForm();
      setShowAddModal(false);
      setEditContact(null);
      fetchContacts(pagination.page);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save contact");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    try {
      await axiosInstance.delete(ENDPOINTS.whatsapp.contactDetail(id));
      toast.success("Contact deleted");
      fetchContacts(pagination.page);
    } catch (err) {
      toast.error("Failed to delete contact");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected contacts?`)) return;
    try {
      await axiosInstance.post(ENDPOINTS.whatsapp.contactBulkDelete, { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} contacts deleted`);
      setSelectedIds(new Set());
      fetchContacts(pagination.page);
    } catch (err) {
      toast.error("Failed to bulk delete");
    }
  };

  const handleExport = async () => {
    try {
      const res = await axiosInstance.get(ENDPOINTS.whatsapp.contactExport);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "whatsapp_contacts_export.json";
      a.click();
      toast.success("Contacts exported!");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const resetForm = () => {
    setFirstName(""); setLastName(""); setMobile(""); setEmail("");
    setCountryCode("91"); setTags(""); setNotes("");
  };

  const openEdit = (c: any) => {
    setEditContact(c);
    setFirstName(c.firstName);
    setLastName(c.lastName || "");
    setMobile(c.mobile);
    setEmail(c.email || "");
    setCountryCode(c.countryCode || "91");
    setTags(c.tags?.join(", ") || "");
    setNotes(c.notes || "");
    setShowAddModal(true);
  };

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              WhatsApp Contacts <Users className="h-5 w-5 text-emerald-500" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your WhatsApp contact database for campaign messaging.</p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Download className="h-4 w-4" /> Export
            </button>
            <a href="/whatsapp/import" className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Upload className="h-4 w-4" /> Import CSV
            </a>
            <button onClick={() => { resetForm(); setEditContact(null); setShowAddModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md transition-all">
              <Plus className="h-4 w-4" /> Add Contact
            </button>
          </div>
        </div>

        {/* Filters & Bulk Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2.5 w-full md:w-80 relative">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text" placeholder="Search contacts..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="font-bold text-slate-400 uppercase text-[10px]">Tag:</span>
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-emerald-500/10 outline-none">
                <option>All</option>
                {allTags.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[10px] font-bold hover:bg-rose-600 transition">
                <Trash2 className="h-3 w-3" /> Delete {selectedIds.size}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-2 w-8">
                    <input type="checkbox" checked={selectedIds.size === contacts.length && contacts.length > 0} onChange={toggleSelectAll} className="rounded" />
                  </th>
                  <th className="pb-3 pr-2">Contact</th>
                  <th className="pb-3 pr-2">Mobile</th>
                  <th className="pb-3 pr-2">Email</th>
                  <th className="pb-3 pr-2">Tags</th>
                  <th className="pb-3 pr-2">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="py-3 pr-2">
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs uppercase">{c.firstName.charAt(0)}</div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{c.firstName} {c.lastName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-2 text-slate-600 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> +{c.countryCode} {c.mobile}</span>
                    </td>
                    <td className="py-3 pr-2 text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                      {c.email || "—"}
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex flex-wrap gap-1">
                        {(c.tags || []).map((t: string) => (
                          <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === "active" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"><Edit className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {contacts.length === 0 && !loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold">No contacts found</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400">Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
              <div className="flex items-center gap-1">
                <button onClick={() => fetchContacts(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => fetchContacts(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">{editContact ? "Edit Contact" : "Add New Contact"}</h3>
              <button onClick={() => { setShowAddModal(false); setEditContact(null); resetForm(); }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">First Name *</label>
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Code</label>
                  <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="91" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Mobile *</label>
                  <input type="text" required value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Tags (comma-separated)</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Premium, VIP, Lead" className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." rows={2} className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold resize-none" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setEditContact(null); resetForm(); }} className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-102 text-white rounded-xl font-bold shadow-md transition-all">{editContact ? "Save Changes" : "Add Contact"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
}
