"use client";

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RootState, UserRole, setMobileSidebarOpen, logout } from "@/store";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Zap,
  BookOpen,
  Calendar,
  BarChart3,
  Building,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bot,
  CreditCard,
  LogOut,
  UserCheck,
  LifeBuoy,
  Search,
  ChevronDown,
  ChevronUp,
  Database,
  MessageCircle,
  Send
} from "lucide-react";

interface SidebarItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  subItems?: {
    label: string;
    href: string;
  }[];
}

const navLinks: SidebarItem[] = [
  // Super Admin
  {
    label: "Platform Metrics",
    href: "/super-admin/dashboard",
    icon: LayoutDashboard,
    roles: ["super-admin"],
  },
  {
    label: "Client Companies",
    href: "/super-admin/companies",
    icon: Building,
    roles: ["super-admin"],
  },
  {
    label: "Subscriptions",
    href: "/super-admin/subscriptions",
    icon: CreditCard,
    roles: ["super-admin"],
  },
  {
    label: "System Settings",
    href: "/super-admin/system",
    icon: Settings,
    roles: ["super-admin"],
  },
  {
    label: "WhatsApp Monitor",
    href: "/super-admin/whatsapp",
    icon: MessageCircle,
    roles: ["super-admin"],
  },

  // Client Admin & Team/Sales shared
  {
    label: "Dashboard",
    href: "/client-admin/dashboard",
    icon: LayoutDashboard,
    roles: ["client-admin"],
  },
  {
    label: "Sales Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["team"],
  },

  // Audit Collapsible Section for client-admin
  {
    label: "Audit",
    icon: Search,
    roles: ["client-admin"],
    subItems: [
      { label: "Website SEO", href: "/client-admin/audit/website-seo" },
      { label: "Social Media", href: "/client-admin/audit/social-media" },
      { label: "Google My Business", href: "/client-admin/audit/google-my-business" },
      { label: "My Audits", href: "/client-admin/audit/my-audits" },
    ],
  },

  // Lead Enrichment Collapsible Section for client-admin
  {
    label: "Lead Enrichment",
    icon: Users,
    roles: ["client-admin"],
    subItems: [
      { label: "Find & Detect", href: "/client-admin/enrichment/find-detect" },
      { label: "Audit", href: "/client-admin/enrichment/audit" },
      { label: "Enrich Contacts", href: "/client-admin/enrichment/enrich-contacts" },
      { label: "Write Outreach", href: "/client-admin/enrichment/write-outreach" },
      { label: "Validate Emails", href: "/client-admin/enrichment/validate-emails" },
      { label: "My Enrichments", href: "/client-admin/enrichment/my-enrichments" },
    ],
  },

  {
    label: "Leads CRM",
    href: "/client-admin/leads",
    icon: Users,
    roles: ["client-admin"],
  },
  {
    label: "Manage Agents",
    href: "/client-admin/agents",
    icon: UserCheck,
    roles: ["client-admin"],
  },
  {
    label: "My Leads",
    href: "/client-admin/leads?assigned=me",
    icon: Users,
    roles: ["team"],
  },
  {
    label: "Live Chat",
    href: "/team/conversations",
    icon: MessageSquare,
    roles: ["client-admin", "team"],
  },
  {
    label: "Automation Rules",
    href: "/client-admin/automation",
    icon: Zap,
    roles: ["client-admin"],
  },
  {
    label: "Knowledge Base",
    href: "/client-admin/knowledge",
    icon: BookOpen,
    roles: ["client-admin"],
  },
  {
    label: "Calendar Bookings",
    href: "/client-admin/appointments",
    icon: Calendar,
    roles: ["client-admin", "team"],
  },
  {
    label: "Credits & Billing",
    href: "/client-admin/billing",
    icon: CreditCard,
    roles: ["client-admin"],
  },
  {
    label: "Reports",
    href: "/client-admin/reports",
    icon: BarChart3,
    roles: ["client-admin"],
  },
  {
    label: "Integrations",
    href: "/client-admin/integrations",
    icon: Settings,
    roles: ["client-admin"],
  },
  // WhatsApp Campaign Collapsible Section for client-admin
  {
    label: "WhatsApp Campaigns",
    icon: MessageCircle,
    roles: ["client-admin"],
    subItems: [
      { label: "Dashboard", href: "/whatsapp/dashboard" },
      { label: "Contacts", href: "/whatsapp/contacts" },
      { label: "Contact Groups", href: "/whatsapp/contact-groups" },
      { label: "Import CSV", href: "/whatsapp/import" },
      { label: "Templates", href: "/whatsapp/templates" },
      { label: "Campaigns", href: "/whatsapp/campaigns" },
      { label: "Scheduled", href: "/whatsapp/scheduled" },
      { label: "Reports", href: "/whatsapp/reports" },
      { label: "Settings", href: "/whatsapp/settings" },
      { label: "Billing", href: "/whatsapp/billing" },
    ],
  },
  {
    label: "Support Tickets",
    href: "/tickets",
    icon: LifeBuoy,
    roles: ["super-admin", "client-admin", "team"],
  },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const user = useSelector((state: RootState) => state.auth.user);
  const isMobileSidebarOpen = useSelector((state: RootState) => state.auth.isMobileSidebarOpen);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    "Audit": true,
    "Lead Enrichment": true
  });

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const currentRole = activeRole || "team";
  const filteredLinks = navLinks.filter((link) => link.roles.includes(currentRole));

  const handleSignOut = () => {
    dispatch(logout());
    router.push("/auth/login");
  };

  return (
    <>
      {/* Mobile Backdrop Mask Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => dispatch(setMobileSidebarOpen(false))}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 flex flex-col h-screen bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-40 shadow-2xl select-none lg:static lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
          isMobileSidebarOpen ? "translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 font-bold tracking-wider hover:opacity-90 transition-opacity">
              <Database className="h-6 w-6 text-teal-500" />
              <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Lead Sangrah</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto flex items-center justify-center">
              <Database className="h-6 w-6 text-teal-500 hover:opacity-90 transition-opacity" />
            </Link>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            suppressHydrationWarning
            className="absolute -right-3 top-5 bg-gradient-to-tr from-primary to-gray-500 hover:scale-105 text-white rounded-full p-1 border border-slate-700 shadow-md transition hidden lg:block"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Role Badge Indicator */}
        {!collapsed && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <Shield className="h-4 w-4 text-emerald-450 dark:text-emerald-450 animate-pulse" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-extrabold tracking-wider">Active Role</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 capitalize truncate">
                {currentRole.replace("-", " ")}
              </span>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
          {filteredLinks.map((link) => {
            const hasSubItems = !!link.subItems;

            if (hasSubItems) {
              const Icon = link.icon || Search;
              const isExpanded = !!openSubMenus[link.label];

              return (
                <div key={link.label} className="space-y-1">
                  <button
                    onClick={() => toggleSubMenu(link.label)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
                      {!collapsed && <span>{link.label}</span>}
                    </div>
                    {!collapsed && (
                      isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>

                  {isExpanded && !collapsed && (
                    <div className="pl-6 space-y-1.5 transition-all">
                      {link.subItems?.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            onClick={() => dispatch(setMobileSidebarOpen(false))}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold hover:text-slate-900 dark:hover:text-slate-100 transition-all",
                              isSubActive
                                ? "text-slate-900 dark:text-slate-50 font-extrabold"
                                : "text-slate-500 dark:text-slate-450"
                            )}
                          >
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
                              isSubActive ? "bg-teal-550 scale-125 shadow shadow-teal-500" : "bg-slate-300 dark:bg-slate-700"
                            )} />
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Flat item
            const Icon = link.icon || LayoutDashboard;
            const linkPath = link.href ? link.href.split("?")[0] : "";
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname === linkPath || (linkPath !== "/client-admin/dashboard" && pathname.startsWith(linkPath));

            return (
              <Link
                key={link.label}
                href={link.href || "#"}
                onClick={() => dispatch(setMobileSidebarOpen(false))}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all group relative",
                  isActive
                    ? "bg-gradient-to-r from-primary to-gray-500 text-white shadow-lg shadow-purple-600/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100")} />
                {!collapsed && <span>{link.label}</span>}
                {collapsed && (
                  <div className="absolute left-14 bg-slate-900 border border-slate-800 text-white px-2 py-1 rounded text-xs opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                    {link.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out & User Info footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 shrink-0">
          <button
            onClick={handleSignOut}
            suppressHydrationWarning
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all w-full",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-400" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-gray-500 flex items-center justify-center font-bold text-white uppercase text-sm shadow-md shrink-0">
              {user?.name?.charAt(0) || "P"}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">{user?.name}</span>
                <span className="text-[10px] text-slate-550 dark:text-slate-400 font-semibold truncate">{user?.email}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

