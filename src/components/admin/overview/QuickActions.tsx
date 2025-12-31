"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminCard } from "../design-system/AdminCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DollarSign,
  Shield,
  FileText,
  Bell,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof DollarSign;
  color: string;
  bgColor: string;
  route?: string;
  action?: () => Promise<void>;
}

export function QuickActions() {
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleExportReport = async () => {
    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success("Daily report exported successfully");
  };

  const actions: QuickAction[] = [
    {
      id: "payouts",
      label: "Process Payouts",
      description: "Review and process pending payouts",
      icon: DollarSign,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      route: "/admin/payouts",
    },
    {
      id: "fraud",
      label: "Review Flags",
      description: "Review fraud alerts and flagged content",
      icon: Shield,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      route: "/admin/security",
    },
    {
      id: "export",
      label: "Export Report",
      description: "Generate and download daily report",
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      action: handleExportReport,
    },
    {
      id: "announce",
      label: "Announcement",
      description: "Send platform announcement",
      icon: Bell,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      route: "/admin", // Opens announcement dialog in overview
    },
  ];

  const handleAction = async (action: QuickAction) => {
    if (action.action) {
      setLoadingAction(action.id);
      try {
        await action.action();
      } finally {
        setLoadingAction(null);
      }
    } else if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <AdminCard title="Quick Actions" subtitle="Common admin tasks">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={loadingAction === action.id}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl text-left",
              "border border-white/[0.04] hover:border-white/[0.1]",
              "bg-white/[0.02] hover:bg-white/[0.04]",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className={cn("p-2.5 rounded-lg", action.bgColor)}>
              {loadingAction === action.id ? (
                <Loader2 className={cn("h-5 w-5 animate-spin", action.color)} />
              ) : (
                <action.icon className={cn("h-5 w-5", action.color)} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white font-inter tracking-[-0.5px]">
                {action.label}
              </p>
              <p className="text-[11px] text-white/40 font-inter tracking-[-0.5px] truncate">
                {action.description}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/20" />
          </button>
        ))}
      </div>
    </AdminCard>
  );
}
