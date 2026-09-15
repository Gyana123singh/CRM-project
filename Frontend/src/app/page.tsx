"use client";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import DashboardWrapper from "@/components/shared/DashboardWrapper";
import SuperAdminDashboard from "@/components/dashboard/super-admin/SuperAdminDashboard";
import ClientAdminDashboard from "@/components/dashboard/client-admin/ClientAdminDashboard";
import TeamDashboard from "@/components/dashboard/team/TeamDashboard";
import LoginPage from "./auth/login/page";

export default function HomePage() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderDashboard = () => {
    switch (activeRole) {
      case "super-admin":
        return <SuperAdminDashboard />;
      case "client-admin":
        return <ClientAdminDashboard />;
      case "team":
        return <TeamDashboard />;
      default:
        return <ClientAdminDashboard />;
    }
  };

  return <DashboardWrapper>{renderDashboard()}</DashboardWrapper>;
}

