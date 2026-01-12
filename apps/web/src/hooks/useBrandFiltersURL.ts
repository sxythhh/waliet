import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import {
  BrandFilters,
  DEFAULT_BRAND_FILTERS,
  FILTER_PARAM_KEYS,
} from "@/types/brand-filters";

/**
 * Hook to manage brand filters via URL search params.
 * Filters are persisted in the URL for shareability and bookmarking.
 */
export function useBrandFiltersURL() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse URL params into BrandFilters
  const filters = useMemo((): BrandFilters => {
    const parseArray = (key: string): string[] => {
      const value = searchParams.get(key);
      return value ? value.split(",").filter(Boolean) : [];
    };

    const parseNumber = (key: string): number | null => {
      const value = searchParams.get(key);
      if (!value) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    const parseBoolean = (key: string): boolean | null => {
      const value = searchParams.get(key);
      if (value === "1" || value === "true") return true;
      if (value === "0" || value === "false") return false;
      return null;
    };

    const parseString = (key: string): string | null => {
      return searchParams.get(key) || null;
    };

    return {
      search: searchParams.get(FILTER_PARAM_KEYS.search) || "",
      closeStatusIds: parseArray(FILTER_PARAM_KEYS.closeStatusIds),
      pipelineValueMin: parseNumber(FILTER_PARAM_KEYS.pipelineValueMin),
      pipelineValueMax: parseNumber(FILTER_PARAM_KEYS.pipelineValueMax),
      lastActivityFrom: parseString(FILTER_PARAM_KEYS.lastActivityFrom),
      lastActivityTo: parseString(FILTER_PARAM_KEYS.lastActivityTo),
      opportunityCountMin: parseNumber(FILTER_PARAM_KEYS.opportunityCountMin),
      opportunityCountMax: parseNumber(FILTER_PARAM_KEYS.opportunityCountMax),
      hasCloseLead: parseBoolean(FILTER_PARAM_KEYS.hasCloseLead),
      subscriptionStatuses: parseArray(FILTER_PARAM_KEYS.subscriptionStatuses),
      isVerified: parseBoolean(FILTER_PARAM_KEYS.isVerified),
      brandTypes: parseArray(FILTER_PARAM_KEYS.brandTypes),
      sources: parseArray(FILTER_PARAM_KEYS.sources),
      createdFrom: parseString(FILTER_PARAM_KEYS.createdFrom),
      createdTo: parseString(FILTER_PARAM_KEYS.createdTo),
      updatedFrom: parseString(FILTER_PARAM_KEYS.updatedFrom),
      updatedTo: parseString(FILTER_PARAM_KEYS.updatedTo),
      syncedFrom: parseString(FILTER_PARAM_KEYS.syncedFrom),
      syncedTo: parseString(FILTER_PARAM_KEYS.syncedTo),
    };
  }, [searchParams]);

  // Update filters (partial updates supported)
  const setFilters = useCallback(
    (updates: Partial<BrandFilters>) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          const merged = { ...filters, ...updates };

          // Helper to set or delete param
          const setParam = (key: string, value: string | null | undefined) => {
            if (value) {
              newParams.set(key, value);
            } else {
              newParams.delete(key);
            }
          };

          // Encode each filter type
          setParam(FILTER_PARAM_KEYS.search, merged.search || null);
          setParam(
            FILTER_PARAM_KEYS.closeStatusIds,
            merged.closeStatusIds.length
              ? merged.closeStatusIds.join(",")
              : null
          );
          setParam(
            FILTER_PARAM_KEYS.pipelineValueMin,
            merged.pipelineValueMin?.toString() || null
          );
          setParam(
            FILTER_PARAM_KEYS.pipelineValueMax,
            merged.pipelineValueMax?.toString() || null
          );
          setParam(FILTER_PARAM_KEYS.lastActivityFrom, merged.lastActivityFrom);
          setParam(FILTER_PARAM_KEYS.lastActivityTo, merged.lastActivityTo);
          setParam(
            FILTER_PARAM_KEYS.opportunityCountMin,
            merged.opportunityCountMin?.toString() || null
          );
          setParam(
            FILTER_PARAM_KEYS.opportunityCountMax,
            merged.opportunityCountMax?.toString() || null
          );
          setParam(
            FILTER_PARAM_KEYS.hasCloseLead,
            merged.hasCloseLead === null
              ? null
              : merged.hasCloseLead
                ? "1"
                : "0"
          );
          setParam(
            FILTER_PARAM_KEYS.subscriptionStatuses,
            merged.subscriptionStatuses.length
              ? merged.subscriptionStatuses.join(",")
              : null
          );
          setParam(
            FILTER_PARAM_KEYS.isVerified,
            merged.isVerified === null ? null : merged.isVerified ? "1" : "0"
          );
          setParam(
            FILTER_PARAM_KEYS.brandTypes,
            merged.brandTypes.length ? merged.brandTypes.join(",") : null
          );
          setParam(
            FILTER_PARAM_KEYS.sources,
            merged.sources.length ? merged.sources.join(",") : null
          );
          setParam(FILTER_PARAM_KEYS.createdFrom, merged.createdFrom);
          setParam(FILTER_PARAM_KEYS.createdTo, merged.createdTo);
          setParam(FILTER_PARAM_KEYS.updatedFrom, merged.updatedFrom);
          setParam(FILTER_PARAM_KEYS.updatedTo, merged.updatedTo);
          setParam(FILTER_PARAM_KEYS.syncedFrom, merged.syncedFrom);
          setParam(FILTER_PARAM_KEYS.syncedTo, merged.syncedTo);

          return newParams;
        },
        { replace: true }
      );
    },
    [filters, setSearchParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        Object.values(FILTER_PARAM_KEYS).forEach((key) =>
          newParams.delete(key)
        );
        return newParams;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.closeStatusIds.length > 0 ||
      filters.pipelineValueMin !== null ||
      filters.pipelineValueMax !== null ||
      filters.lastActivityFrom !== null ||
      filters.lastActivityTo !== null ||
      filters.opportunityCountMin !== null ||
      filters.opportunityCountMax !== null ||
      filters.hasCloseLead !== null ||
      filters.subscriptionStatuses.length > 0 ||
      filters.isVerified !== null ||
      filters.brandTypes.length > 0 ||
      filters.sources.length > 0 ||
      filters.createdFrom !== null ||
      filters.createdTo !== null ||
      filters.updatedFrom !== null ||
      filters.updatedTo !== null ||
      filters.syncedFrom !== null ||
      filters.syncedTo !== null
    );
  }, [filters]);

  // Count active filter groups (for badge display)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.closeStatusIds.length) count++;
    if (filters.pipelineValueMin !== null || filters.pipelineValueMax !== null)
      count++;
    if (filters.lastActivityFrom !== null || filters.lastActivityTo !== null)
      count++;
    if (
      filters.opportunityCountMin !== null ||
      filters.opportunityCountMax !== null
    )
      count++;
    if (filters.hasCloseLead !== null) count++;
    if (filters.subscriptionStatuses.length) count++;
    if (filters.isVerified !== null) count++;
    if (filters.brandTypes.length) count++;
    if (filters.sources.length) count++;
    if (filters.createdFrom !== null || filters.createdTo !== null) count++;
    if (filters.updatedFrom !== null || filters.updatedTo !== null) count++;
    if (filters.syncedFrom !== null || filters.syncedTo !== null) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
