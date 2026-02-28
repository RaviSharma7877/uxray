"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { useState, useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <div className="pl-64 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}
