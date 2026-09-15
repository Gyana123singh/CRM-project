"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, setLeads, addLead, updateLeadStatus, setFilterStatus, setFilterSource, setSearchQuery } from "@/store";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import { toast } from "react-toastify";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import {
  Plus,
  Download,
  Search,
  Filter,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  Compass,
  TrendingDown,
  Users,
  Calendar,
  ChevronDown,
  Layers
} from "lucide-react";

export default function LeadsPage() {
  const [mounted, setMounted] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    setMounted(true);
    async function fetchLeads() {
      try {
        const response = await axiosInstance.get(ENDPOINTS.leads.base);
        dispatch(setLeads(response.data));
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      }
    }
    fetchLeads();
    // agents are fetched in a separate effect to avoid TDZ for state setters
  }, [dispatch]);

  // agents are fetched after state declarations below

  const leads = useSelector((state: RootState) => state.leads.leads);
  const filterStatus = useSelector((state: RootState) => state.leads.filterStatus);
  const filterSource = useSelector((state: RootState) => state.leads.filterSource);
  const searchQuery = useSelector((state: RootState) => state.leads.searchQuery);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [interest, setInterest] = useState("");
  const [source, setSource] = useState<any>("Manual Entry");
  const [agents, setAgents] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState<any>("Unassigned");
  const [followUpDate, setFollowUpDate] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await axiosInstance.get(ENDPOINTS.clientAdmin.agents);
        setAgents(res.data || []);
      } catch (err) {
        console.warn("Failed to load agents:", err);
      }
    }
    fetchAgents();
  }, []);

  // Filtering Logic
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.serviceInterest.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "All" || lead.status === filterStatus;
    const matchesSource = filterSource === "All" || lead.source === filterSource;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    try {
      const response = await axiosInstance.post(ENDPOINTS.leads.base, {
        name,
        phone,
        email,
        location,
        serviceInterest: interest || "AI Integration Consultation",
        message: message || "Manually registered lead inquiry.",
        source,
        assignedTo,
      });

      dispatch(addLead(response.data));
      toast.success(`Lead ${name} successfully saved!`);

      // If user provided follow-up date or notes, patch them after creation
      try {
        const leadId = response.data.id;
        if (followUpDate) {
          await axiosInstance.patch(ENDPOINTS.leads.followUp(leadId), { date: followUpDate });
        }
        if (notes) {
          await axiosInstance.patch(ENDPOINTS.leads.notes(leadId), { notes });
        }
      } catch (err) {
        console.warn("Failed to apply follow-up/notes:", err);
      }

      setName("");
      setPhone("");
      setEmail("");
      setLocation("");
      setInterest("");
      setAssignedTo("Unassigned");
      setFollowUpDate(null);
      setNotes("");
      setMessage("");
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to add lead:", error);
      toast.error("Failed to save lead to the workspace");
    }
  };

  const handleStatusChange = async (id: string, newStatus: any) => {
    try {
      await axiosInstance.patch(ENDPOINTS.leads.status(id), { status: newStatus });
      dispatch(updateLeadStatus({ id, status: newStatus }));
      toast.success("Lead status updated successfully");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status on server");
    }
  };

  // Mockup Analytics Datasets
  const pipelineData = [
    { month: "Jan", contacted: 25000, opportunity: 30000, notContacted: 5000 },
    { month: "Feb", contacted: 25000, opportunity: 5000, notContacted: 0 },
    { month: "Mar", contacted: 25000, opportunity: 20000, notContacted: 0 },
    { month: "Apr", contacted: 25000, opportunity: 30000, notContacted: 25000 },
    { month: "May", contacted: 25000, opportunity: 30000, notContacted: 30000 },
    { month: "Jun", contacted: 25000, opportunity: 30000, notContacted: 35000 },
    { month: "Jul", contacted: 25000, opportunity: 30000, notContacted: 25000 },
    { month: "Aug", contacted: 25000, opportunity: 30000, notContacted: 25000 },
    { month: "Sep", contacted: 25000, opportunity: 30000, notContacted: 25000 },
    { month: "Oct", contacted: 25000, opportunity: 30000, notContacted: 30000 },
    { month: "Nov", contacted: 20000, opportunity: 0, notContacted: 0 },
    { month: "Dec", contacted: 25000, opportunity: 30000, notContacted: 25000 },
  ];

  const weeklyData = [
    { day: "Mon", segments: [22, 22, 22] },
    { day: "Tue", segments: [29, 29, 29, 20] },
    { day: "Wed", segments: [13, 13, 13, 13, 75], highlight: 75 },
    { day: "Thu", segments: [32, 32, 32, 32] },
    { day: "Fri", segments: [32, 32, 32] },
    { day: "Sat", segments: [32, 32, 32] },
    { day: "Sun", segments: [32, 32, 32, 32] },
  ];

  const pipelineYMarkers = ["100K", "80K", "60K", "40K", "20K", "0K"];
  const weeklyYMarkers = [120, 80, 60, 40, 20, 0];

  if (!mounted) {
    return (
      <DashboardWrapper>
        <div className="space-y-6 animate-pulse p-6">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800/80 rounded-lg w-96" />
          </div>
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full max-w-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
    <>
      <DashboardWrapper>
        <div className="space-y-6">

        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Leads CRM Workspace <Sparkles className="h-5 w-5 text-indigo-500" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage inbound leads, assign representatives, update pipelines, and monitor chat history.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => toast.info("CSV Template download triggered.")}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all"
            >
              <Plus className="h-4 w-4" /> Add New Lead
            </button>
          </div>
        </div>

        {/* 1. Analytics KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* Card 1: Total Leads */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden group hover:border-orange-350 transition duration-300">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-500 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-550">
                  Total No of Leads
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">6000</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-[10px] font-bold">
              <span className="text-rose-505 text-rose-500">~ -4.01% from last week</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-orange-500" style={{ width: "45%" }} />
            </div>
          </div>

          {/* Card 2: New Leads */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden group hover:border-teal-355 transition duration-300">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-full flex items-center justify-center bg-teal-500/10 text-teal-500 shrink-0">
                <Compass className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-550">
                  No of New Leads
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">120</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-[10px] font-bold">
              <span className="text-emerald-500">~ +20.01% from last week</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-teal-500" style={{ width: "65%" }} />
            </div>
          </div>

          {/* Card 3: Lost Leads */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden group hover:border-rose-350 transition duration-300">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-500 shrink-0">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-455 dark:text-slate-555">
                  No of Lost Leads
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">30</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-[10px] font-bold">
              <span className="text-rose-500">~ +55% from last week</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-rose-500" style={{ width: "30%" }} />
            </div>
          </div>

          {/* Card 4: Total Customers */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-xs relative overflow-hidden group hover:border-purple-350 transition duration-300">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-500 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-455 dark:text-slate-555">
                  No of Total Customers
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">9895</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-[10px] font-bold">
              <span className="text-emerald-500">~ +55% from last week</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-purple-500" style={{ width: "85%" }} />
            </div>
          </div>

        </div>

        {/* 2. Charts section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pipeline Stages stacked chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[460px]">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" /> Pipeline Stages
              </h3>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350 transition">
                <Calendar className="h-3.5 w-3.5" /> 2023 - 2024 <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>

            {/* Stage Info Category Badges */}
            <div className="grid grid-cols-3 gap-3 py-4 text-xs select-none">
              <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" /> Contacted
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">50000</p>
              </div>
              <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-850 dark:bg-slate-600 shrink-0" /> Opportunity
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">25985</p>
              </div>
              <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                <span className="flex items-center gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" /> Not Contacted
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-1">12566</p>
              </div>
            </div>

            {/* Stacked Chart Pillar */}
            <div className="relative flex-1 flex mt-4 h-64">
              <div className="absolute inset-y-0 left-0 w-10 flex flex-col justify-between text-[9px] font-extrabold text-slate-450 pb-7 pr-2 text-right">
                {pipelineYMarkers.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="flex-1 ml-10 relative flex items-end justify-between h-full pb-7">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="w-full border-t border-slate-100 dark:border-slate-800/80" />
                  ))}
                </div>

                {pipelineData.map((data, idx) => {
                  const total = data.contacted + data.opportunity + data.notContacted;
                  const heightPercent = Math.min((total / 100000) * 100, 100);
                  const cPercent = (data.contacted / total) * 100;
                  const oPercent = (data.opportunity / total) * 100;
                  const ncPercent = (data.notContacted / total) * 100;

                  return (
                    <div key={idx} className="flex flex-col items-center z-10 w-[7%] h-full justify-end group cursor-pointer">

                      <div className="absolute bottom-20 bg-slate-900 text-white p-2.5 rounded-xl text-[9px] pointer-events-none opacity-0 group-hover:opacity-100 transition duration-200 z-30 shadow-2xl flex flex-col gap-0.5 border border-slate-800">
                        <span className="font-extrabold uppercase mb-0.5 border-b border-slate-800 pb-0.5">{data.month} Leads</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 bg-orange-500 rounded-full" /> Contacted: {data.contacted.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 bg-slate-400 rounded-full" /> Opportunity: {data.opportunity.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 bg-blue-500 rounded-full" /> Not Contacted: {data.notContacted.toLocaleString()}</span>
                      </div>

                      <div
                        className="w-4 sm:w-6 bg-slate-100 dark:bg-slate-850 rounded-t-sm flex flex-col-reverse overflow-hidden transition-all duration-500 hover:scale-105"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="bg-orange-500" style={{ height: `${cPercent}%` }} />
                        <div className="bg-slate-800 dark:bg-slate-700" style={{ height: `${oPercent}%` }} />
                        <div className="bg-blue-505 bg-blue-500" style={{ height: `${ncPercent}%` }} />
                      </div>

                      <span className="absolute bottom-0 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase mt-2">
                        {data.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* New Leads Weekly Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[460px]">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50 tracking-wide">
                New Leads
              </h3>
              <button className="flex items-center gap-1 px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-450 transition">
                This Week <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </div>

            <div className="relative flex-1 flex mt-6 h-64">
              <div className="absolute inset-y-0 left-0 w-8 flex flex-col justify-between text-[9px] font-extrabold text-slate-450 pb-7 pr-2 text-right">
                {weeklyYMarkers.map((val) => (
                  <span key={val}>{val}</span>
                ))}
              </div>

              <div className="flex-1 ml-8 relative flex items-end justify-between h-full pb-7">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="w-full border-t border-slate-100 dark:border-slate-800/80" />
                  ))}
                </div>

                {weeklyData.map((data, idx) => {
                  const total = data.segments.reduce((a, b) => a + b, 0);
                  const heightPercent = Math.min((total / 120) * 100, 100);

                  return (
                    <div key={idx} className="flex flex-col items-center z-10 w-[11%] h-full justify-end group cursor-pointer relative">

                      <div
                        className="w-full flex flex-col-reverse gap-[2px] transition-all duration-300 h-full justify-end"
                        style={{ height: `${heightPercent}%` }}
                      >
                        {data.segments.map((val, segmentIdx) => {
                          const isHighlighted = data.highlight === val && data.day === "Wed";
                          const L = data.segments.length;
                          const segmentHeight = `${(val / total) * 100}%`;

                          let colorClasses = "";
                          if (isHighlighted) {
                            colorClasses = "bg-orange-500 text-white shadow-md shadow-orange-500/20";
                          } else if (segmentIdx === 0) {
                            colorClasses = "bg-[#d8dfe7] dark:bg-slate-850 text-white";
                          } else if (segmentIdx === L - 1) {
                            colorClasses = "bg-[#d8dfe7] dark:bg-slate-850 text-white";
                          } else if (L === 5 && segmentIdx === 3) {
                            colorClasses = "bg-[#d8dfe7] dark:bg-slate-850 text-white";
                          } else {
                            colorClasses = "bg-[#ffd7c2] dark:bg-orange-950/40 text-white";
                          }

                          return (
                            <div
                              key={segmentIdx}
                              className={`w-full rounded-xs text-[8px] sm:text-[9px] font-black flex items-center justify-center transition border border-white/20 select-none ${colorClasses}`}
                              style={{ height: segmentHeight }}
                            >
                              {val}
                            </div>
                          );
                        })}
                      </div>

                      <span className="absolute bottom-0 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase">
                        {data.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* 3. Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          {/* Search */}
          <div className="flex items-center gap-2.5 w-full md:w-80 relative">
            <Search className="absolute left-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads name, contact..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              className="w-full pl-9.5 pr-4 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition"
            />
          </div>

          {/* Dynamic Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="font-bold text-slate-400 uppercase text-[10px]">Filter Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => dispatch(setFilterStatus(e.target.value))}
                className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-primary/10 outline-none"
              >
                <option>All</option>
                <option>New</option>
                <option>Contacted</option>
                <option>Interested</option>
                <option>Follow-up</option>
                <option>Converted</option>
                <option>Lost</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Source:</span>
              <select
                value={filterSource}
                onChange={(e) => dispatch(setFilterSource(e.target.value))}
                className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-primary/10 outline-none"
              >
                <option>All</option>
                <option>Website Forms</option>
                <option>Landing Pages</option>
                <option>Meta Ads</option>
                <option>Google Ads</option>
                <option>WhatsApp</option>
                <option>Manual Entry</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Leads Table Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-2">Lead / Customer</th>
                  <th className="pb-3 pr-2">Service Interest</th>
                  <th className="pb-3 pr-2">Location</th>
                  <th className="pb-3 pr-2">Source</th>
                  <th className="pb-3 pr-2">Pipeline Status</th>
                  <th className="pb-3 text-right">Change Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    {/* Customer */}
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm uppercase">
                          {lead.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{lead.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{lead.phone} • {lead.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Interest */}
                    <td className="py-4 text-slate-700 dark:text-slate-300 font-semibold">
                      {lead.serviceInterest}
                    </td>

                    {/* Location */}
                    <td className="py-4 text-slate-500 dark:text-slate-400 font-medium">
                      {lead.location || "N/A"}
                    </td>

                    {/* Source */}
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {lead.source}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lead.status === "New"
                        ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600"
                        : lead.status === "Interested"
                          ? "bg-purple-100 dark:bg-purple-950/40 text-purple-655 text-purple-600"
                          : lead.status === "Converted"
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600"
                            : lead.status === "Lost"
                              ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600"
                              : "bg-amber-100 dark:bg-amber-950/40 text-amber-600"
                        }`}>
                        {lead.status}
                      </span>
                    </td>

                    {/* Status Switcher */}
                    <td className="py-4 text-right">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as any)}
                        className="px-2 py-1 border rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer"
                      >
                        <option>New</option>
                        <option>Contacted</option>
                        <option>Interested</option>
                        <option>Follow-up</option>
                        <option>Converted</option>
                        <option>Lost</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <ShieldAlert className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold">No matching leads found</p>
              <p className="text-[11px] text-slate-400">Try adjusting your active search or filter selection.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardWrapper>

      {/* Manual Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-fade-in">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">
              Add New Lead Manually
            </h3>
            <p className="text-xs text-slate-400 mt-1">Submit basic customer inquiry details into the active CRM pipeline.</p>

            <form onSubmit={handleAddLeadSubmit} className="mt-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Lead Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyabrata Sen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 99999..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Email Address</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bhubaneswar"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Lead Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option>Manual Entry</option>
                    <option>Website Forms</option>
                    <option>Landing Pages</option>
                    <option>Meta Ads</option>
                    <option>Google Ads</option>
                    <option>WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}{a.email ? ` - ${a.email}` : ""}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDate || ""}
                    onChange={(e) => setFollowUpDate(e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Service Interest</label>
                <input
                  type="text"
                  placeholder="e.g. 2BHK flat / WhatsApp chatbot"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase text-[10px]">Message (optional)</label>
                <textarea
                  placeholder="Short note or initial message to save"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none resize-none h-20"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <div className="flex-1 pr-2">
                  <label className="font-bold text-slate-400 uppercase text-[10px]">Notes (private)</label>
                  <textarea
                    placeholder="Internal notes for this lead"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 outline-none resize-none h-20"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 text-white rounded-xl font-bold shadow-md shadow-primary/10 transition-all"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
