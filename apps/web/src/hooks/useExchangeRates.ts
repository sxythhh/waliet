import { useState, useEffect, useCallback } from "react";
import {
  EXCHANGE_RATES_STORAGE_KEY,
  EXCHANGE_RATES_CACHE_DURATION,
  isCacheValid,
  type StoredExchangeRates,
} from "@/lib/currency";

interface UseExchangeRatesReturn {
  rates: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  getRate: (currency: string) => number;
  convert: (usdAmount: number, toCurrency: string) => number;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

// Free exchange rate API (exchangerate-api.com has a free tier)
// Alternative: use frankfurter.app which is completely free
const EXCHANGE_RATE_API = "https://api.frankfurter.app/latest?from=USD";

export function useExchangeRates(): UseExchangeRatesReturn {
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cachedStr = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
        if (cachedStr) {
          try {
            const cached: StoredExchangeRates = JSON.parse(cachedStr);
            if (isCacheValid(cached.timestamp, EXCHANGE_RATES_CACHE_DURATION)) {
              setRates({ USD: 1, ...cached.rates });
              setLastUpdated(new Date(cached.timestamp));
              setIsLoading(false);
              return;
            }
          } catch {
            // Invalid cache, continue to fetch
          }
        }
      }

      setIsLoading(true);
      setError(null);

      const response = await fetch(EXCHANGE_RATE_API);

      if (!response.ok) {
        throw new Error("Failed to fetch exchange rates");
      }

      const data = await response.json();

      // Frankfurter API returns { amount: 1, base: "USD", date: "...", rates: { EUR: 0.92, ... } }
      const fetchedRates = data.rates || {};

      // Store in cache
      const cacheData: StoredExchangeRates = {
        rates: fetchedRates,
        timestamp: Date.now(),
        base: "USD",
      };
      localStorage.setItem(EXCHANGE_RATES_STORAGE_KEY, JSON.stringify(cacheData));

      setRates({ USD: 1, ...fetchedRates });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch exchange rates:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch exchange rates");
      // Keep existing rates on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Get exchange rate for a specific currency
  const getRate = useCallback(
    (currency: string): number => {
      if (currency === "USD") return 1;
      return rates[currency] || 1;
    },
    [rates]
  );

  // Convert USD amount to another currency
  const convert = useCallback(
    (usdAmount: number, toCurrency: string): number => {
      const rate = getRate(toCurrency);
      return usdAmount * rate;
    },
    [getRate]
  );

  return {
    rates,
    isLoading,
    error,
    getRate,
    convert,
    lastUpdated,
    refetch: () => fetchRates(true),
  };
}
