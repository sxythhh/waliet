import { createContext, useContext, type ReactNode } from "react";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { formatCurrency, formatWithConversion, type CurrencyInfo } from "@/lib/currency";

interface CurrencyContextValue {
  // User's currency
  currency: CurrencyInfo;
  currencyCode: string;
  countryCode: string | null;
  setCurrency: (code: string) => void;

  // Exchange rates
  rates: Record<string, number>;
  getRate: (currency: string) => number;

  // Loading states
  isLoading: boolean;

  // Formatting functions
  format: (usdAmount: number, options?: FormatOptions) => string;
  formatLocal: (usdAmount: number, options?: FormatOptions) => string;
  formatBoth: (usdAmount: number, options?: FormatOptions) => string;
}

interface FormatOptions {
  compact?: boolean;
  showCode?: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const {
    currency,
    currencyCode,
    countryCode,
    isLoading: currencyLoading,
    setCurrency,
  } = useUserCurrency();

  const {
    rates,
    isLoading: ratesLoading,
    getRate,
  } = useExchangeRates();

  const isLoading = currencyLoading || ratesLoading;

  // Format in USD
  const format = (usdAmount: number, options?: FormatOptions): string => {
    return formatCurrency(usdAmount, "USD", options);
  };

  // Format in user's local currency
  const formatLocal = (usdAmount: number, options?: FormatOptions): string => {
    if (currencyCode === "USD") {
      return formatCurrency(usdAmount, "USD", options);
    }
    const rate = getRate(currencyCode);
    return formatWithConversion(usdAmount, currencyCode, rate, { ...options, showUsd: false });
  };

  // Format showing both local currency and USD
  const formatBoth = (usdAmount: number, options?: FormatOptions): string => {
    if (currencyCode === "USD") {
      return formatCurrency(usdAmount, "USD", options);
    }
    const rate = getRate(currencyCode);
    return formatWithConversion(usdAmount, currencyCode, rate, { ...options, showUsd: true });
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyCode,
        countryCode,
        setCurrency,
        rates,
        getRate,
        isLoading,
        format,
        formatLocal,
        formatBoth,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

// Standalone hook for components that just need formatting without context
export function useLocalCurrency() {
  const { currency, currencyCode, formatLocal, formatBoth, isLoading } = useCurrency();
  return { currency, currencyCode, formatLocal, formatBoth, isLoading };
}
