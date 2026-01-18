import { createContext, useContext, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEMO_BRAND,
  DEMO_CAMPAIGNS,
  DEMO_BOOSTS,
  DEMO_CREATORS,
  DEMO_CONTRACTS,
  DEMO_WALLET,
  DEMO_TRANSACTIONS,
  DEMO_LEADERBOARD,
  DEMO_BLUEPRINTS,
} from "./demo-data";

interface DemoDataContextValue {
  isDemoMode: boolean;
  demoBrand: typeof DEMO_BRAND;
  demoCampaigns: typeof DEMO_CAMPAIGNS;
  demoBoosts: typeof DEMO_BOOSTS;
  demoCreators: typeof DEMO_CREATORS;
  demoContracts: typeof DEMO_CONTRACTS;
  demoWallet: typeof DEMO_WALLET;
  demoTransactions: typeof DEMO_TRANSACTIONS;
  demoLeaderboard: typeof DEMO_LEADERBOARD;
  demoBlueprints: typeof DEMO_BLUEPRINTS;
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null);

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "active";

  const value: DemoDataContextValue = {
    isDemoMode,
    demoBrand: DEMO_BRAND,
    demoCampaigns: DEMO_CAMPAIGNS,
    demoBoosts: DEMO_BOOSTS,
    demoCreators: DEMO_CREATORS,
    demoContracts: DEMO_CONTRACTS,
    demoWallet: DEMO_WALLET,
    demoTransactions: DEMO_TRANSACTIONS,
    demoLeaderboard: DEMO_LEADERBOARD,
    demoBlueprints: DEMO_BLUEPRINTS,
  };

  return (
    <DemoDataContext.Provider value={value}>
      {children}
    </DemoDataContext.Provider>
  );
}

export function useDemoData() {
  const context = useContext(DemoDataContext);
  if (!context) {
    throw new Error("useDemoData must be used within a DemoDataProvider");
  }
  return context;
}

// Helper hook to get data with demo fallback
export function useDataWithDemoFallback<T>(realData: T | null | undefined, demoData: T): T {
  const { isDemoMode } = useDemoData();
  if (isDemoMode) {
    return demoData;
  }
  return realData ?? demoData;
}
