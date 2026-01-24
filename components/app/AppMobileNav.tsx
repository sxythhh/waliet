"use client";

import Image from "next/image";
import {
  MdSavings,
  MdRequestPage,
  MdSettings,
  MdSchedule,
  MdBarChart,
  MdAttachMoney,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/hooks/use-tab-store";

// Custom home icon
function WalietHomeIcon({ active, className }: { active?: boolean; className?: string }) {
  return (
    <Image
      src={active ? "/icons/WalietHomeActive.png" : "/icons/WalietHomeInactive.png"}
      alt="Home"
      width={20}
      height={20}
      className={cn(
        className,
        active
          ? "brightness-0 invert dark:brightness-100 dark:invert-0"
          : ""
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

interface AppMobileNavProps {
  currentTab: string;
}

export function AppMobileNav({ currentTab }: AppMobileNavProps) {
  const { mode, setTab } = useTabStore();
  const isSeller = mode === "seller";
  const menuItems = isSeller ? sellerMenuItems : buyerMenuItems;

  // Only show first 5 items to fit in bottom bar
  const visibleItems = menuItems.slice(0, 5);

  const handleTabClick = (tab: string) => {
    setTab(tab);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleItems.map((item) => {
          const isActive = currentTab === item.tab;
          const isHomeIcon = item.icon === HOME_ICON_PLACEHOLDER;
          const Icon = item.icon as IconType;
          return (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={cn(
                "group flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground dark:bg-primary/10 dark:text-primary"
                  : "text-muted-foreground"
              )}
            >
              {isHomeIcon ? (
                <WalietHomeIcon active={isActive} className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium">{item.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
