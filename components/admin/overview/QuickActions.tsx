"use client";

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminCard } from "../design-system/AdminCard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronRight,
  Loader2,
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  tab?: string;
  action?: () => Promise<void>;
}

export function QuickActions() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
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
      tab: "finance",
    },
    {
      id: "users",
      label: "Manage Users",
      description: "View and manage user accounts",
      tab: "users",
    },
    {
      id: "export",
      label: "Export Report",
      description: "Generate and download daily report",
      action: handleExportReport,
    },
    {
      id: "content",
      label: "Manage Content",
      description: "Manage resources and blog posts",
      tab: "content",
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
    } else if (action.tab) {
      setSearchParams({ tab: action.tab });
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
              "border border-border hover:border-border",
              "bg-muted/30 hover:bg-muted/50",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">
                {action.label}
              </p>
              <p className="text-[11px] text-muted-foreground font-inter tracking-[-0.5px] truncate">
                {action.description}
              </p>
            </div>
            {loadingAction === action.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </AdminCard>
  );
}
