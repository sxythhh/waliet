"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MdSavings,
  MdRequestPage,
  MdSettings,
  MdKeyboardArrowDown,
  MdLogout,
  MdLightMode,
  MdDarkMode,
  MdSchedule,
  MdBarChart,
  MdAttachMoney,
  MdSwapHoriz,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTabStore, buyerTabs, sellerTabs } from "@/hooks/use-tab-store";

// Custom home icon component that switches between active/inactive states
function WalietHomeIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <Image
      src={active ? "/icons/WalietHomeActive.png" : "/icons/WalietHomeInactive.png"}
      alt="Home"
      width={16}
      height={16}
      className={cn(
        className,
        active
          ? "brightness-0 invert dark:brightness-100 dark:invert-0"
          : "dark:group-hover:brightness-0 dark:group-hover:invert"
      )}
    />
  );
}

const HOME_ICON_PLACEHOLDER = "HOME" as const;

interface MenuItem {
  title: string;
  tab: string;
  icon: IconType | typeof HOME_ICON_PLACEHOLDER;
}

// Buyer menu items
const buyerMenuItems: MenuItem[] = [
  { title: "Browse", tab: "browse", icon: MdSavings },
  { title: "Wallet", tab: "wallet", icon: HOME_ICON_PLACEHOLDER },
  { title: "Offers", tab: "offers", icon: MdRequestPage },
  { title: "Settings", tab: "profile", icon: MdSettings },
];

// Seller menu items
const sellerMenuItems: MenuItem[] = [
  { title: "Dashboard", tab: "dashboard", icon: HOME_ICON_PLACEHOLDER },
  { title: "Requests", tab: "requests", icon: MdSchedule },
  { title: "Offers", tab: "offers", icon: MdRequestPage },
  { title: "Earnings", tab: "earnings", icon: MdAttachMoney },
  { title: "Analytics", tab: "analytics", icon: MdBarChart },
];

interface AppTopBarProps {
  user?: {
    id: string;
    name: string | null;
    avatar: string | null;
    sellerProfile?: { id: string } | null;
  } | null;
  isLoading?: boolean;
}

export function AppTopBar({ user, isLoading }: AppTopBarProps) {
  const router = useRouter();
  const { activeTab, mode, setTab, toggleMode } = useTabStore();
  const isSeller = mode === "seller" && user?.sellerProfile;

  const menuItems = isSeller ? sellerMenuItems : buyerMenuItems;

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    // For Supabase users, redirect to signout endpoint
    router.push("/api/auth/signout");
  };

  const handleTabClick = (tab: string) => {
    setTab(tab);
  };

  const handleModeToggle = () => {
    toggleMode();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Spacer for centering */}
        <div className="hidden md:flex w-24" />

        {/* Navigation - Desktop (Centered) */}
        <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.tab;
            const isHomeIcon = item.icon === HOME_ICON_PLACEHOLDER;
            const Icon = item.icon as IconType;
            return (
              <button
                key={item.tab}
                onClick={() => handleTabClick(item.tab)}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground dark:bg-primary/10 dark:text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {isHomeIcon ? (
                  <WalietHomeIcon active={isActive} className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center justify-end gap-2 w-24 md:w-auto">
          {/* Mode Switcher */}
          {user?.sellerProfile && (
            <button
              onClick={handleModeToggle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <MdSwapHoriz className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isSeller ? "Buyer Mode" : "Seller Mode"}
              </span>
            </button>
          )}

          {/* User Menu */}
          <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted transition-colors cursor-pointer">
                {isLoading ? (
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {user?.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <MdKeyboardArrowDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="px-2 py-1.5 mb-2 border-b border-border">
                <p className="font-medium text-sm truncate">
                  {user?.name || "Anonymous"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSeller ? "Seller Mode" : "Buyer Mode"}
                </p>
              </div>
              <div className="space-y-1">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-accent transition-colors cursor-pointer"
                >
                  {isDarkMode ? (
                    <MdLightMode className="h-4 w-4" />
                  ) : (
                    <MdDarkMode className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-accent transition-colors text-destructive cursor-pointer"
                >
                  <MdLogout className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
