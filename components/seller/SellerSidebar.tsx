"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Package,
  Calendar,
  DollarSign,
  Building2,
  ChevronRight,
  Menu,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SellerSidebarProps {
  workspace: {
    id: string;
    name: string;
    logoUrl?: string | null;
    color?: string;
  };
}

const navItems = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "services", label: "Services", icon: Package },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "payouts", label: "Payouts", icon: DollarSign },
];

function SidebarContent({
  workspace,
  activeTab,
  onTabChange,
  onBackToDashboard,
}: SellerSidebarProps & {
  activeTab: string;
  onTabChange: (id: string) => void;
  onBackToDashboard: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Back Button */}
      <div className="p-3 border-b border-border/50">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-muted/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Workspace Header */}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-5">
          {workspace.logoUrl ? (
            <img
              src={workspace.logoUrl}
              alt={workspace.name}
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-primary/10"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: workspace.color || "#8B5CF6" }}
            >
              {workspace.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {workspace.name}
            </p>
            <p className="text-[11px] text-muted-foreground/70">Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </button>
          );
        })}
      </nav>

      {/* Settings Link */}
      <div className="px-3 pb-2">
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            activeTab === "settings"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          <Settings className="w-4 h-4" />
          <span className="flex-1 text-left">Settings</span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 mt-auto">
        <div className="px-3 py-3 rounded-xl bg-muted/30">
          <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-1">
            Current Workspace
          </p>
          <p className="text-xs font-medium text-foreground truncate">
            {workspace.name}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SellerSidebar({ workspace }: SellerSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTab = searchParams.get("tab") || "analytics";

  const handleTabChange = (tabId: string) => {
    router.push(`/workspace/${workspace.id}?tab=${tabId}`);
    setMobileOpen(false);
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  // Mobile: Sheet sidebar
  return (
    <>
      {/* Mobile trigger button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-card/80 backdrop-blur-sm shadow-lg"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-card border-0">
            <SidebarContent
              workspace={workspace}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onBackToDashboard={handleBackToDashboard}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed sidebar */}
      <aside className="hidden md:flex w-64 h-screen bg-card/30 backdrop-blur-sm flex-col sticky top-0 shrink-0 border-r border-border/50">
        <SidebarContent
          workspace={workspace}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onBackToDashboard={handleBackToDashboard}
        />
      </aside>
    </>
  );
}
