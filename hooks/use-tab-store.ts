import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BuyerTab = "browse" | "wallet" | "offers" | "profile";
export type SellerTab = "dashboard" | "requests" | "offers" | "earnings" | "analytics";
export type TabMode = "buyer" | "seller";

interface TabState {
  activeTab: string;
  mode: TabMode;
  setTab: (tab: string) => void;
  setMode: (mode: TabMode) => void;
  toggleMode: () => void;
}

const defaultBuyerTab: BuyerTab = "browse";
const defaultSellerTab: SellerTab = "dashboard";

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      activeTab: defaultBuyerTab,
      mode: "buyer",

      setTab: (tab) => set({ activeTab: tab }),

      setMode: (mode) =>
        set({
          mode,
          // Reset to default tab for the new mode
          activeTab: mode === "seller" ? defaultSellerTab : defaultBuyerTab,
        }),

      toggleMode: () => {
        const currentMode = get().mode;
        const newMode: TabMode = currentMode === "seller" ? "buyer" : "seller";
        set({
          mode: newMode,
          activeTab: newMode === "seller" ? defaultSellerTab : defaultBuyerTab,
        });
      },
    }),
    {
      name: "waliet-tab-state",
      // Only persist mode preference, not active tab
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);

// Buyer tabs configuration
export const buyerTabs = [
  { id: "browse" as const, title: "Browse", mobileTitle: "Browse" },
  { id: "wallet" as const, title: "Wallet", mobileTitle: "Wallet" },
  { id: "offers" as const, title: "Offers", mobileTitle: "Offers" },
  { id: "profile" as const, title: "Settings", mobileTitle: "Settings" },
] satisfies { id: BuyerTab; title: string; mobileTitle: string }[];

// Seller tabs configuration
export const sellerTabs = [
  { id: "dashboard" as const, title: "Dashboard", mobileTitle: "Home" },
  { id: "requests" as const, title: "Requests", mobileTitle: "Requests" },
  { id: "offers" as const, title: "Offers", mobileTitle: "Offers" },
  { id: "earnings" as const, title: "Earnings", mobileTitle: "Earnings" },
  { id: "analytics" as const, title: "Analytics", mobileTitle: "Analytics" },
] satisfies { id: SellerTab; title: string; mobileTitle: string }[];
