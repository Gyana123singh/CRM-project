"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { RootState, UserRole, setActiveRole, toggleMobileSidebar, logout } from "@/store";
import { Menu, Moon, Sun, Bell, Search, ShieldAlert, MonitorPlay } from "lucide-react";

export default function Header() {
  const dispatch = useDispatch();
  const router = useRouter();
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const user = useSelector((state: RootState) => state.auth.user);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleRoleChange = (role: UserRole) => {
    dispatch(logout());
    router.push("/auth/login");
  };

  return (
    <header className="sticky top-0 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 z-20">
      {/* Mobile Hamburger menu */}
      <button
        onClick={() => dispatch(toggleMobileSidebar())}
        suppressHydrationWarning
        className="p-2 -ml-2 mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 lg:hidden transition"
        title="Toggle Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Left Search */}
      <div className="flex items-center gap-3 w-96 relative max-sm:hidden">
        <Search className="absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          suppressHydrationWarning
          placeholder="Global search leads, rules, analytics..."
          className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        {/* Dynamic Role Quick-Switcher Sandbox Panel */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
            <MonitorPlay className="h-3 w-3 text-primary" /> Switch Role:
          </span>
          {(["super-admin", "client-admin", "team"] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              suppressHydrationWarning
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                activeRole === role
                  ? "bg-gradient-to-r from-primary to-gray-500 text-white shadow-md shadow-purple-600/10"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {role === "super-admin"
                ? "Platform"
                : role === "client-admin"
                ? "Admin"
                : "Sales/Staff"}
            </button>
          ))}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          suppressHydrationWarning
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
          aria-label="Toggle theme"
        >
          {mounted && theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
        </button>

        {/* Notifications */}
        <button 
          suppressHydrationWarning
          className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
        </button>

        {/* Company Title */}
        <div className="flex flex-col text-right">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {activeRole === "super-admin" ? "Infotattva Portal" : user?.companyName}
          </span>
          <span className="text-[10px] text-slate-400 capitalize font-medium">{activeRole}</span>
        </div>
      </div>
    </header>
  );
}

