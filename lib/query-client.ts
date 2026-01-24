import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for the staleTime, then refetches in background
        staleTime: 60 * 1000, // 1 minute default
        // Keep data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed requests up to 2 times
        retry: 2,
        // Don't refetch on window focus in development
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
      },
    },
  });
}

// Singleton for browser
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new query client
    return makeQueryClient();
  }
  // Browser: reuse the same query client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

// Query key factories for consistent cache key management
export const queryKeys = {
  // Sellers
  sellers: {
    all: ["sellers"] as const,
    list: () => [...queryKeys.sellers.all, "list"] as const,
  },
  // Wallet
  wallet: {
    all: ["wallet"] as const,
    balances: () => [...queryKeys.wallet.all, "balances"] as const,
  },
  // Sessions
  sessions: {
    all: ["sessions"] as const,
    list: (role?: string) => [...queryKeys.sessions.all, "list", { role }] as const,
    buyerSessions: () => [...queryKeys.sessions.all, "list", { role: "buyer" }] as const,
    sellerSessions: () => [...queryKeys.sessions.all, "list", { role: "seller" }] as const,
  },
  // User profile
  profile: {
    all: ["profile"] as const,
    me: () => [...queryKeys.profile.all, "me"] as const,
  },
  // Seller stats (for dashboard)
  sellerStats: {
    all: ["sellerStats"] as const,
    dashboard: () => [...queryKeys.sellerStats.all, "dashboard"] as const,
    earnings: () => [...queryKeys.sellerStats.all, "earnings"] as const,
    analytics: () => [...queryKeys.sellerStats.all, "analytics"] as const,
  },
} as const;
