import { useState, useEffect, useCallback } from "react";
import {
  getCurrencyInfo,
  formatCurrency,
  formatWithConversion,
  CURRENCY_STORAGE_KEY,
  LOCATION_STORAGE_KEY,
  LOCATION_CACHE_DURATION,
  isCacheValid,
  type CurrencyInfo,
  type StoredLocation,
} from "@/lib/currency";

interface GeolocationResponse {
  country_code: string;
  currency: string;
  country_name?: string;
  city?: string;
  region?: string;
}

interface UseUserCurrencyReturn {
  currency: CurrencyInfo;
  currencyCode: string;
  countryCode: string | null;
  isLoading: boolean;
  error: string | null;
  setCurrency: (code: string) => void;
  formatAmount: (amount: number, options?: { compact?: boolean; showCode?: boolean }) => string;
  formatWithUsd: (usdAmount: number, exchangeRate: number, options?: { showUsd?: boolean; compact?: boolean }) => string;
}

export function useUserCurrency(): UseUserCurrencyReturn {
  const [currencyCode, setCurrencyCode] = useState<string>("USD");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from cache or detect location
  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Check for stored currency preference first
        const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY);
        if (storedCurrency) {
          setCurrencyCode(storedCurrency);
        }

        // Check for cached location
        const storedLocationStr = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (storedLocationStr) {
          try {
            const storedLocation: StoredLocation = JSON.parse(storedLocationStr);
            if (isCacheValid(storedLocation.timestamp, LOCATION_CACHE_DURATION)) {
              setCountryCode(storedLocation.countryCode);
              // Only set currency if user hasn't manually set one
              if (!storedCurrency) {
                setCurrencyCode(storedLocation.currency);
              }
              setIsLoading(false);
              return;
            }
          } catch {
            // Invalid cache, continue to fetch
          }
        }

        // Fetch location from IP
        const response = await fetch("https://ipapi.co/json/", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to detect location");
        }

        const data: GeolocationResponse = await response.json();

        // Store location
        const locationData: StoredLocation = {
          countryCode: data.country_code,
          currency: data.currency || "USD",
          timestamp: Date.now(),
        };
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));

        setCountryCode(data.country_code);

        // Only set currency if user hasn't manually set one
        if (!storedCurrency && data.currency) {
          setCurrencyCode(data.currency);
        }
      } catch (err) {
        console.error("Failed to detect currency:", err);
        setError(err instanceof Error ? err.message : "Failed to detect location");
        // Default to USD on error
        setCurrencyCode("USD");
      } finally {
        setIsLoading(false);
      }
    };

    detectCurrency();
  }, []);

  // Manual currency setter
  const setCurrency = useCallback((code: string) => {
    setCurrencyCode(code);
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  }, []);

  // Format amount in user's currency
  const formatAmount = useCallback(
    (amount: number, options?: { compact?: boolean; showCode?: boolean }) => {
      return formatCurrency(amount, currencyCode, options);
    },
    [currencyCode]
  );

  // Format USD amount with conversion
  const formatWithUsd = useCallback(
    (usdAmount: number, exchangeRate: number, options?: { showUsd?: boolean; compact?: boolean }) => {
      return formatWithConversion(usdAmount, currencyCode, exchangeRate, options);
    },
    [currencyCode]
  );

  return {
    currency: getCurrencyInfo(currencyCode),
    currencyCode,
    countryCode,
    isLoading,
    error,
    setCurrency,
    formatAmount,
    formatWithUsd,
  };
}
