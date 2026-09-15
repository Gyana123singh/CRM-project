"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import ConfirmModal from "@/components/shared/ConfirmModal";
import axiosInstance, { ENDPOINTS } from "@/utils/api";
import {
  Users,
  UserPlus,
  Zap,
  TrendingUp,
  Award,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Mail,
  Phone,
  Clock,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Search,
  Filter,
  Check,
  Edit2,
  Upload,
  User as UserIcon,
  MapPin,
  Lock,
  Briefcase,
  Eye
} from "lucide-react";
import { toast } from "react-toastify";

interface Agent {
  id: string;
  name: string;
  fatherName?: string;
  email: string;
  phone: string;
  password?: string;
  address?: string;
  status: "online" | "busy" | "offline";
  leadsCount: number;
  conversionRate: number;
  specialty: string;
  joinedDate: string;
  isActive: boolean;
  profileImage?: string; // Base64 data url for preview
}

export default function AgentsManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    async function loadAgentsAndConfig() {
      try {
        const [agentsRes, policyRes] = await Promise.all([
          axiosInstance.get(ENDPOINTS.clientAdmin.agents),
          axiosInstance.get(ENDPOINTS.clientAdmin.routingPolicy)
        ]);
        setAgents(agentsRes.data);
        const policy = policyRes.data.routingPolicy;
        setRoundRobin(policy === "round-robin");
        setLoadBalancing(policy === "load-balanced");
      } catch (err) {
        console.error("Failed to load agents or routing policy:", err);
      }
    }
    loadAgentsAndConfig();
  }, []);

  // State 1: Mock Agents Data
  const [agents, setAgents] = useState<Agent[]>([]);

  // State 2: Routing Configs
  const [roundRobin, setRoundRobin] = useState(true);
  const [loadBalancing, setLoadBalancing] = useState(false);
  const [notifyAgentWhatsApp, setNotifyAgentWhatsApp] = useState(true);

  // State 3: Modal & CRUD Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [viewingAgentDetails, setViewingAgentDetails] = useState<Agent | null>(null);

  // Form Field States
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [specialty, setSpecialty] = useState("High-Ticket Real Estate");
  const [agentStatus, setAgentStatus] = useState<Agent["status"]>("offline");
  const [profileImage, setProfileImage] = useState("");

  // File Uploader Error
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Notifications
  const triggerToast = (msg: string) => {
    toast.success(msg);
  };

  // Profile Image Upload validation (<4MB)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 4MB limit check
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("Image file size should be below 4 MB.");
      setProfileImage("");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setName("");
    setFatherName("");
    setEmail("");
    setPhoneInput("");
    setPassword("");
    setConfirmPassword("");
    setAddress("");
    setSpecialty("High-Ticket Real Estate");
    setAgentStatus("offline");
    setProfileImage("");
    setUploadError(null);
    setEditingAgentId(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (agent: Agent) => {
    setName(agent.name);
    setFatherName(agent.fatherName || "");
    setEmail(agent.email);
    setPhoneInput(agent.phone);
    setPassword(agent.password || "");
    setConfirmPassword(agent.password || "");
    setAddress(agent.address || "");
    setSpecialty(agent.specialty);
    setAgentStatus(agent.status);
    setProfileImage(agent.profileImage || "");
    setUploadError(null);
    setEditingAgentId(agent.id);
    setShowAddModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phoneInput) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      if (editingAgentId) {
        // Edit mode
        const res = await axiosInstance.patch(`${ENDPOINTS.clientAdmin.agents}/${editingAgentId}`, {
          name,
          fatherName,
          email,
          phone: phoneInput,
          password,
          address,
          specialty,
          status: agentStatus,
          profileImage,
        });
        setAgents(
          agents.map((a) => (a.id === editingAgentId ? res.data : a))
        );
        triggerToast(`Staff profile for ${name} has been successfully updated.`);
      } else {
        // Create mode
        const res = await axiosInstance.post(ENDPOINTS.clientAdmin.agents, {
          name,
          email,
          phone: phoneInput,
          specialty,
          password,
          fatherName,
          address,
          status: agentStatus,
          profileImage,
        });
        setAgents([res.data, ...agents]);
        triggerToast(`Staff Representative ${name} has been successfully onboarded.`);
      }
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Failed to save agent profile.";
      toast.error(errMsg);
    }
  };

  const toggleAgentActive = async (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    const nextActive = !agent.isActive;

    try {
      await axiosInstance.patch(ENDPOINTS.clientAdmin.agentActive(id), { isActive: nextActive });
      setAgents(
        agents.map((a) => (a.id === id ? { ...a, isActive: nextActive } : a))
      );
      triggerToast(
        `Representative ${agent.name} is now ${nextActive ? "active" : "suspended"}.`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle agent active status.");
    }
  };

  const deleteAgent = (id: string, agentName: string) => {
    setConfirmDeleteAgent({ id, name: agentName });
  };

  const handleRoutingChange = async (mode: "roundRobin" | "loadBalancing") => {
    const policy = mode === "roundRobin" ? "round-robin" : "load-balanced";
    try {
      await axiosInstance.patch(ENDPOINTS.clientAdmin.routingPolicy, { routingPolicy: policy });
      if (mode === "roundRobin") {
        setRoundRobin(true);
        setLoadBalancing(false);
        triggerToast("Lead Routing policy updated: Round-Robin Distribution active.");
      } else {
        setRoundRobin(false);
        setLoadBalancing(true);
        triggerToast("Lead Routing policy updated: Workload Load Balancing active.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update routing policy.");
    }
  };

  // Filter Agents List
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.specialty.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && agent.isActive) ||
      (statusFilter === "Suspended" && !agent.isActive) ||
      (statusFilter === "Online" && agent.status === "online") ||
      (statusFilter === "Offline" && agent.status === "offline");

    return matchesSearch && matchesStatus;
  });

  // Calculations for KPI
  const activeSeats = agents.length;
  const maxSeats = 10;
  const onlineCount = agents.filter((a) => a.status === "online" || a.status === "busy").length;
  const bestAgent = [...agents].sort((a, b) => b.conversionRate - a.conversionRate)[0];

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
    <DashboardWrapper>
      <div className="space-y-6 select-none relative pb-12">
        <ConfirmModal
          isOpen={!!confirmDeleteAgent}
          title="Remove Representative"
          message={`Are you sure you want to remove ${confirmDeleteAgent?.name} from the workspace roster?`}
          onConfirm={async () => {
            if (confirmDeleteAgent) {
              try {
                await axiosInstance.delete(ENDPOINTS.clientAdmin.agentDelete(confirmDeleteAgent.id));
                setAgents(agents.filter((a) => a.id !== confirmDeleteAgent.id));
                triggerToast(`Representative ${confirmDeleteAgent.name} was removed from the roster.`);
              } catch (err) {
                console.error(err);
                toast.error("Failed to remove representative from the roster.");
              } finally {
                setConfirmDeleteAgent(null);
              }
            }
          }}
          onCancel={() => setConfirmDeleteAgent(null)}
        />


        {/* Page Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              Workspace Agents & Lead Routing <Users className="h-6 w-6 text-indigo-500" />
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Onboard sales representatives, manage staff details, and configure automated lead assignment cycles.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 hover:shadow-xl text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" /> Onboard Staff/Agent
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Seats Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden group transition hover:shadow-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Agents Seats</span>
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-50 mt-3">
              {activeSeats} <span className="text-sm text-slate-400 font-semibold">/ {maxSeats} Seats</span>
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">Available slots remaining: {maxSeats - activeSeats}</span>
          </div>

          {/* Active Online Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden group transition hover:shadow-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Active Staff Status</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-50 mt-3">
              {onlineCount} <span className="text-sm text-slate-400 font-semibold">Live Now</span>
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">Ready to receive live chat transfers</span>
          </div>

          {/* Lead Assignment Policy Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden group transition hover:shadow-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Lead Routing Plan</span>
              <Zap className="h-5 w-5 text-purple-500 animate-pulse" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-slate-50 mt-4 truncate capitalize">
              {roundRobin ? "Round-Robin" : "Load Balanced"}
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">Auto-allocating leads instantly</span>
          </div>

          {/* Top Performer Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden group transition hover:shadow-lg">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Top Close Ratio</span>
              <Award className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-slate-50 mt-4 truncate">
              {bestAgent ? bestAgent.name : "N/A"}
            </p>
            <span className="text-[10px] text-emerald-500 font-bold block mt-1">
              {bestAgent ? `${bestAgent.conversionRate}% Close Rate` : ""}
            </span>
          </div>
        </div>

        {/* Lead Routing Control Panel & Dynamic Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Block: Lead Routing Configurations */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide flex items-center gap-1.5">
                Lead Distribution Setup <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              </h3>
              <p className="text-xs text-slate-400">
                Configure how newly captured website, WhatsApp, or Facebook leads are assigned to active agents.
              </p>

              {/* Selection Nodes */}
              <div className="space-y-3.5 pt-2">
                {/* Mode 1: Round-Robin */}
                <div
                  onClick={() => handleRoutingChange("roundRobin")}
                  className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${roundRobin
                    ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                    : "border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50"
                    }`}
                >
                  <div className="mt-0.5">
                    {roundRobin ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                    ) : (
                      <div className="h-4.5 w-4.5 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-150 block">Round-Robin Cycling</span>
                    <span className="text-[10px] text-slate-400 leading-normal block">
                      Evenly assigns new leads in circular rotation to all active representatives.
                    </span>
                  </div>
                </div>

                {/* Mode 2: Workload Load Balancing */}
                <div
                  onClick={() => handleRoutingChange("loadBalancing")}
                  className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${loadBalancing
                    ? "border-primary bg-primary/5 ring-1 ring-primary/10"
                    : "border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50"
                    }`}
                >
                  <div className="mt-0.5">
                    {loadBalancing ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                    ) : (
                      <div className="h-4.5 w-4.5 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-150 block">Load-Balanced Allocation</span>
                    <span className="text-[10px] text-slate-400 leading-normal block">
                      Directs leads to the representative currently handling the lowest volume of active deals.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification settings toggle */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs font-semibold">
              <div className="space-y-0.5">
                <span className="text-slate-700 dark:text-slate-200 block">WhatsApp Notifications</span>
                <span className="text-[9px] text-slate-400 font-medium">Ping agents instantly on assigned deals</span>
              </div>
              <button onClick={() => setNotifyAgentWhatsApp(!notifyAgentWhatsApp)} className="text-slate-500 transition">
                {notifyAgentWhatsApp ? (
                  <ToggleRight className="h-7 w-7 text-primary animate-pulse" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-slate-300 dark:text-slate-700" />
                )}
              </button>
            </div>
          </div>

          {/* Right Block: Live Distribution Map Graphic */}
          <div className="lg:col-span-2 bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 border border-slate-850 rounded-3xl p-6 text-xs text-white shadow-2xl flex flex-col justify-between min-h-[340px]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="font-bold text-indigo-400 uppercase tracking-widest text-[9px] flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" /> Live Assignment Pipeline Visualization
              </span>
              <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase">
                Active Routing Engine
              </span>
            </div>

            {/* Visual Pipeline Nodes */}
            <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-6 relative select-none">
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Node 1: Inbound Lead Source */}
              <div className="p-4 bg-slate-900/80 border border-indigo-500/30 rounded-2xl flex flex-col items-center gap-1 shadow-lg text-center w-40 relative z-15">
                <span className="text-[8px] uppercase font-bold text-indigo-400 tracking-wider">Inbound Channel</span>
                <p className="font-extrabold text-slate-200 text-[11px]">Website Form / Ads</p>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 absolute bottom-[-4px] md:bottom-auto md:right-[-4px] animate-ping" />
              </div>

              {/* Action arrow line */}
              <div className="flex flex-col items-center text-slate-600 justify-center">
                <div className="h-6 w-0.5 md:h-0.5 md:w-16 border-l-2 md:border-t-2 border-dashed border-indigo-500/40 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-indigo-400 text-[9px] px-1 py-0.2 rounded border border-slate-850 font-mono font-black scale-90">
                    AI Auto
                  </div>
                </div>
              </div>

              {/* Node 2: Routing Core */}
              <div className="p-4 bg-gradient-to-tr from-indigo-950 to-indigo-900 border border-indigo-500 rounded-2xl flex flex-col items-center gap-1 shadow-2xl text-center w-44 relative z-15">
                <span className="text-[8px] uppercase font-bold text-indigo-300 tracking-wider">Routing Policy Controller</span>
                <p className="font-black text-white text-[11px]">
                  {roundRobin ? "Round-Robin Circular" : "Load-Balanced Cap"}
                </p>
                <span className="text-[8px] bg-slate-900 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/20 font-semibold uppercase mt-0.5">
                  Synced Live
                </span>
              </div>

              {/* Action arrow line */}
              <div className="flex flex-col items-center text-slate-600 justify-center">
                <div className="h-6 w-0.5 md:h-0.5 md:w-12 border-l-2 md:border-t-2 border-dashed border-indigo-500/40 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
              </div>

              {/* Node 3: Active Roster */}
              <div className="space-y-2 w-44 relative z-15">
                {agents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className={`px-3 py-1.5 rounded-xl border flex items-center justify-between text-[10px] ${agent.isActive && agent.status === "online"
                      ? "bg-slate-900/90 border-emerald-500/40 text-slate-200"
                      : agent.isActive && agent.status === "busy"
                        ? "bg-slate-900/90 border-amber-500/40 text-slate-200"
                        : "bg-slate-900/40 border-slate-800 text-slate-500"
                      }`}
                  >
                    <span className="font-extrabold truncate max-w-[80px]">{agent.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold">{agent.leadsCount} Active</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${agent.status === "online"
                          ? "bg-emerald-500 animate-pulse"
                          : agent.status === "busy"
                            ? "bg-amber-500 animate-pulse"
                            : "bg-slate-500"
                          }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-normal border-t border-slate-850 pt-2.5">
              💡 **Real-time pipeline routing active:** As new sales lead cards are registered on landing pages or Meta campaign channels, they will be distributed instantly based on the active routing policy.
            </p>
          </div>
        </div>

        {/* Agents Directory Roster & Filtering Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          {/* Header & Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-slate-50 tracking-wide">
              Company Representatives Roster
            </h3>

            {/* Roster Controls */}
            <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
              {/* Search input */}
              <div className="flex items-center gap-2 relative w-full sm:w-56">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-primary/10 outline-none transition"
                />
              </div>

              {/* Status filter selection */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase">
                <Filter className="h-3.5 w-3.5" />
                <span>Show:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/10 outline-none font-bold"
                >
                  <option>All</option>
                  <option>Active</option>
                  <option>Suspended</option>
                  <option>Online</option>
                  <option>Offline</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roster Table Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-2">Representative</th>
                  <th className="pb-3 pr-2">Father Name</th>
                  <th className="pb-3 pr-2">Specialty Focus</th>
                  <th className="pb-3 pr-2">Active Workload</th>
                  <th className="pb-3 pr-2">Deal Close Rate</th>
                  <th className="pb-3 pr-2">Account State</th>
                  <th className="pb-3 text-right">Roster Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10 transition group">
                    {/* Representative Name & details */}
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center font-bold text-white uppercase text-sm shadow-md shrink-0 relative overflow-hidden">
                          {agent.profileImage ? (
                            <img src={agent.profileImage} alt={agent.name} className="h-full w-full object-cover" />
                          ) : (
                            agent.name.charAt(0)
                          )}
                          <span
                            className={`h-2.5 w-2.5 rounded-full absolute bottom-[-2px] right-[-2px] border-2 border-white dark:border-slate-900 ${agent.status === "online"
                              ? "bg-emerald-500 animate-pulse"
                              : agent.status === "busy"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                              }`}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                            {agent.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" /> {agent.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Father Name */}
                    <td className="py-4 font-semibold text-slate-600 dark:text-slate-400">
                      {agent.fatherName || "—"}
                    </td>

                    {/* Specialty */}
                    <td className="py-4">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">{agent.specialty}</span>
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Joined: {agent.joinedDate}</span>
                    </td>

                    {/* Active Workload */}
                    <td className="py-4">
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold block text-sm">
                        {agent.leadsCount} deals
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Currently assigned</span>
                    </td>

                    {/* Close rate conversion */}
                    <td className="py-4 w-36">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-bold text-[10px]">
                          <span className="text-slate-600 dark:text-slate-300">{agent.conversionRate}% Ratio</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${agent.conversionRate >= 45
                              ? "bg-emerald-500"
                              : agent.conversionRate >= 30
                                ? "bg-indigo-500"
                                : "bg-amber-500"
                              }`}
                            style={{ width: `${agent.conversionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Account state status badge */}
                    <td className="py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${agent.isActive
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600"
                          : "bg-rose-100 dark:bg-rose-950/40 text-rose-600"
                          }`}
                      >
                        {agent.isActive ? "active" : "suspended"}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details button */}
                        <button
                          onClick={() => setViewingAgentDetails(agent)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 hover:bg-indigo-500/10 hover:text-indigo-500 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => handleOpenEditModal(agent)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 hover:bg-indigo-500/10 hover:text-indigo-500 rounded-lg transition"
                          title="Edit Profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {/* Toggle active / suspend */}
                        <button
                          onClick={() => toggleAgentActive(agent.id)}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition ${agent.isActive
                            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-500 border-amber-200/50 hover:bg-amber-105"
                            : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 border-emerald-200/50 hover:bg-emerald-105"
                            }`}
                        >
                          {agent.isActive ? "Suspend" : "Activate"}
                        </button>

                        {/* Delete agent */}
                        <button
                          onClick={() => deleteAgent(agent.id, agent.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                          title="Delete Agent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAgents.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <AlertTriangle className="h-8 w-8 text-slate-350" />
              <p className="text-sm font-semibold">No matching representatives found</p>
              <p className="text-[11px] text-slate-400">Try adjusting your active search query or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Onboard / Edit Agent Modal Popup */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl w-full max-w-4xl shadow-2xl relative animate-fade-in text-xs flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto md:overflow-visible">

            {/* Left Column: Live Profile Preview Card */}
            <div className="w-full md:w-80 shrink-0 flex flex-col justify-center items-center p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 shadow-inner relative overflow-hidden">
              <div className="absolute right-[-40px] top-[-40px] h-32 w-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 mb-4.5 block">
                ID Profile Card Preview
              </span>

              {/* Preview card visual mockup */}
              <div className="w-full bg-slate-900 border border-slate-850 p-5 rounded-2xl relative overflow-hidden text-center flex flex-col items-center gap-3 shadow-xl">
                {/* Glow ring around avatar */}
                <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-indigo-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-indigo-500/10">
                  {profileImage ? (
                    <img src={profileImage} alt="Avatar Preview" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <UserIcon className="h-10 w-10 text-slate-600" />
                  )}
                </div>

                {/* Status dot in preview */}
                <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agentStatus === "online" ? "bg-emerald-400" : agentStatus === "busy" ? "bg-amber-400" : "bg-slate-400"
                    }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${agentStatus === "online" ? "bg-emerald-500" : agentStatus === "busy" ? "bg-amber-500" : "bg-slate-500"
                    }`}></span>
                </span>

                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-white truncate max-w-52">{name || "Representative Name"}</h4>
                  <span className="text-[8px] uppercase font-bold text-indigo-400 tracking-wider block">{specialty}</span>
                </div>

                <div className="border-t border-slate-800/80 w-full pt-3 space-y-2 text-[10px] text-left text-slate-300 font-medium select-text">
                  {fatherName && (
                    <p className="truncate"><strong className="text-slate-450 font-bold">Father:</strong> {fatherName}</p>
                  )}
                  <p className="truncate flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-450 shrink-0" /> {email || "email@company.com"}</p>
                  <p className="truncate flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-450 shrink-0" /> {phoneInput || "+91 00000 00000"}</p>
                  {address && (
                    <p className="truncate flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-450 shrink-0" /> {address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Form Inputs */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide flex items-center gap-1.5">
                    {editingAgentId ? "Modify Staff Representative" : "Onboard Staff Representative"}
                    <UserPlus className="h-5 w-5 text-primary" />
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5">
                  {/* Photo Uploader */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block">Upload Profile Image</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 rounded-xl font-bold flex items-center gap-1.5 transition text-slate-650 dark:text-slate-350"
                      >
                        <Upload className="h-4 w-4" /> Select Image
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Image should be below 4 mb
                      </span>
                    </div>
                    {uploadError && (
                      <p className="text-rose-500 font-bold text-[10px] flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> {uploadError}
                      </p>
                    )}
                  </div>

                  {/* Name & Father Name */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block">Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-primary/25 outline-none font-bold placeholder:font-medium placeholder:text-slate-450"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block">Father Name</label>
                      <input
                        type="text"
                        placeholder="Father's full name"
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-primary/25 outline-none font-bold placeholder:font-medium placeholder:text-slate-450"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="agent@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-955 focus:ring-2 focus:ring-primary/25 outline-none font-bold placeholder:font-medium placeholder:text-slate-450"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block">Phone Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="+91..."
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-955 focus:ring-2 focus:ring-primary/25 outline-none font-bold placeholder:font-medium placeholder:text-slate-450"
                      />
                    </div>
                  </div>

                  {/* Password fields */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Password *
                      </label>
                      <input
                        type="password"
                        required={!editingAgentId}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-955 focus:ring-2 focus:ring-primary/25 outline-none font-bold placeholder:font-medium placeholder:text-slate-450"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Confirm Password *
                      </label>
                      <input
                        type="password"
                        required={!editingAgentId}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-955 focus:ring-2 focus:ring-primary/25 outline-none font-bold placeholder:font-medium placeholder:text-slate-450"
                      />
                    </div>
                  </div>

                  {/* Specialty Focus & Status dropdowns */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> Specialty Focus
                      </label>
                      <select
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-905 focus:ring-2 focus:ring-primary/25 outline-none font-bold"
                      >
                        <option>High-Ticket Real Estate</option>
                        <option>AI & Tech Integration</option>
                        <option>SaaS & Retail Solutions</option>
                        <option>General Support Desk</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block">Status</label>
                      <select
                        value={agentStatus}
                        onChange={(e) => setAgentStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-905 focus:ring-2 focus:ring-primary/25 outline-none font-bold"
                      >
                        <option value="online">Online (Active Routing)</option>
                        <option value="busy">Busy (In Call)</option>
                        <option value="offline">Offline (Routing Paused)</option>
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-450 uppercase text-[9px] tracking-wider block">Address</label>
                    <input
                      type="text"
                      placeholder="Enter full physical address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-primary/25 outline-none font-bold placeholder:font-medium placeholder:text-slate-450"
                    />
                  </div>

                  {/* Form buttons */}
                  <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-primary to-gray-500 hover:scale-102 hover:shadow-lg text-white rounded-xl font-bold shadow-md shadow-primary/10 transition-all"
                    >
                      {editingAgentId ? "Save Modifications" : "Onboard Agent"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* View Agent Details Modal */}
      {viewingAgentDetails && (
        <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative animate-fade-in text-xs flex flex-col items-center gap-4">
            <div className="w-full flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-850">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wide">
                Representative Profile Details
              </h3>
              <button
                onClick={() => setViewingAgentDetails(null)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Profile badge mockup */}
            <div className="w-full bg-slate-900 border border-slate-850 p-6 rounded-2xl relative overflow-hidden text-center flex flex-col items-center gap-3.5 shadow-xl">
              <div className="absolute right-[-40px] top-[-40px] h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="h-24 w-24 rounded-full bg-slate-800 border-2 border-indigo-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-indigo-500/10">
                {viewingAgentDetails.profileImage ? (
                  <img src={viewingAgentDetails.profileImage} alt={viewingAgentDetails.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <UserIcon className="h-12 w-12 text-slate-650" />
                )}
              </div>

              <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${viewingAgentDetails.status === "online" ? "bg-emerald-400" : viewingAgentDetails.status === "busy" ? "bg-amber-400" : "bg-slate-400"
                  }`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${viewingAgentDetails.status === "online" ? "bg-emerald-500" : viewingAgentDetails.status === "busy" ? "bg-amber-500" : "bg-slate-500"
                  }`}></span>
              </span>

              <div className="space-y-0.5">
                <h4 className="text-base font-black text-white">{viewingAgentDetails.name}</h4>
                <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider block">{viewingAgentDetails.specialty}</span>
              </div>

              <div className="border-t border-slate-800 w-full pt-4 space-y-2.5 text-[11px] text-left text-slate-300 font-medium select-text">
                {viewingAgentDetails.fatherName && (
                  <p className="truncate"><strong className="text-slate-450 font-bold">Father's Name:</strong> {viewingAgentDetails.fatherName}</p>
                )}
                <p className="truncate flex items-center gap-2"><Mail className="h-4 w-4 text-slate-450 shrink-0" /> {viewingAgentDetails.email}</p>
                <p className="truncate flex items-center gap-2"><Phone className="h-4 w-4 text-slate-450 shrink-0" /> {viewingAgentDetails.phone}</p>
                {viewingAgentDetails.address && (
                  <p className="truncate flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-450 shrink-0" /> {viewingAgentDetails.address}</p>
                )}
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-450 shrink-0" /> <span className="text-slate-450 font-bold uppercase text-[9px] tracking-wider">Joined:</span> {viewingAgentDetails.joinedDate}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                  <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 text-center">
                    <span className="text-[8px] uppercase text-slate-400 font-extrabold block">Close Ratio</span>
                    <strong className="text-xs text-emerald-400 font-black">{viewingAgentDetails.conversionRate}%</strong>
                  </div>
                  <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 text-center">
                    <span className="text-[8px] uppercase text-slate-400 font-extrabold block">Assigned Leads</span>
                    <strong className="text-xs text-slate-100 font-black">{viewingAgentDetails.leadsCount} Deals</strong>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewingAgentDetails(null)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition text-slate-650 dark:text-slate-300"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </DashboardWrapper>
  );
}
