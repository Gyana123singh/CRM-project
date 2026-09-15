import React from "react";
import type { Metadata } from "next";
import Providers from "@/components/shared/Providers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Infotattva AI Automation CRM",
  description: "Enterprise AI-powered Lead Management, Customer Communication, & WhatsApp Workflow Automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

