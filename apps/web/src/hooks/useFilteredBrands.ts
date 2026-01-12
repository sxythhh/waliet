import { useMemo } from "react";
import { BrandWithCRM } from "@/hooks/useBrandsWithCRM";
import { BrandFilters } from "@/types/brand-filters";
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

/**
 * Hook to filter brands based on filter criteria.
 * Uses OR logic for multi-select filters (any selected value matches).
 * All filtering is client-side for instant results.
 */
export function useFilteredBrands(
  brands: BrandWithCRM[],
  filters: BrandFilters
): BrandWithCRM[] {
  return useMemo(() => {
    return brands.filter((brand) => {
      // Text Search - case-insensitive search across multiple fields
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        const searchableFields = [
          brand.name,
          brand.slug,
          brand.description,
          brand.close_status_label,
          brand.website_url,
        ]
          .filter(Boolean)
          .map((s) => s?.toLowerCase() || "");

        const matches = searchableFields.some((field) =>
          field.includes(query)
        );
        if (!matches) return false;
      }

      // Close Status (OR logic - any selected status matches)
      if (filters.closeStatusIds.length > 0) {
        if (!brand.close_status_id) return false;
        if (!filters.closeStatusIds.includes(brand.close_status_id)) {
          return false;
        }
      }

      // Pipeline Value Range (inclusive)
      if (filters.pipelineValueMin !== null) {
        if ((brand.weighted_pipeline_value || 0) < filters.pipelineValueMin) {
          return false;
        }
      }
      if (filters.pipelineValueMax !== null) {
        if ((brand.weighted_pipeline_value || 0) > filters.pipelineValueMax) {
          return false;
        }
      }

      // Last Activity Date Range
      if (filters.lastActivityFrom || filters.lastActivityTo) {
        if (!brand.last_activity_at) return false;
        const activityDate = parseISO(brand.last_activity_at);
        if (filters.lastActivityFrom) {
          const fromDate = startOfDay(parseISO(filters.lastActivityFrom));
          if (isBefore(activityDate, fromDate)) return false;
        }
        if (filters.lastActivityTo) {
          const toDate = endOfDay(parseISO(filters.lastActivityTo));
          if (isAfter(activityDate, toDate)) return false;
        }
      }

      // Opportunity Count Range
      if (filters.opportunityCountMin !== null) {
        if ((brand.opportunity_count || 0) < filters.opportunityCountMin) {
          return false;
        }
      }
      if (filters.opportunityCountMax !== null) {
        if ((brand.opportunity_count || 0) > filters.opportunityCountMax) {
          return false;
        }
      }

      // Has Close Lead (Linked/Unlinked)
      if (filters.hasCloseLead !== null) {
        const isLinked = !!brand.close_lead_id;
        if (filters.hasCloseLead !== isLinked) return false;
      }

      // Subscription Status (OR logic)
      if (filters.subscriptionStatuses.length > 0) {
        const status = brand.subscription_status || "";
        if (!filters.subscriptionStatuses.includes(status)) {
          return false;
        }
      }

      // Verified
      if (filters.isVerified !== null) {
        if (brand.is_verified !== filters.isVerified) return false;
      }

      // Brand Types (OR logic)
      if (filters.brandTypes.length > 0) {
        const type = brand.brand_type || "";
        if (!filters.brandTypes.includes(type)) return false;
      }

      // Sources (OR logic)
      if (filters.sources.length > 0) {
        const source = brand.source || "manual";
        if (!filters.sources.includes(source)) return false;
      }

      // Created Date Range
      if (filters.createdFrom || filters.createdTo) {
        const createdDate = parseISO(brand.created_at);
        if (filters.createdFrom) {
          const fromDate = startOfDay(parseISO(filters.createdFrom));
          if (isBefore(createdDate, fromDate)) return false;
        }
        if (filters.createdTo) {
          const toDate = endOfDay(parseISO(filters.createdTo));
          if (isAfter(createdDate, toDate)) return false;
        }
      }

      // Updated Date Range
      if (filters.updatedFrom || filters.updatedTo) {
        const updatedDate = parseISO(brand.updated_at);
        if (filters.updatedFrom) {
          const fromDate = startOfDay(parseISO(filters.updatedFrom));
          if (isBefore(updatedDate, fromDate)) return false;
        }
        if (filters.updatedTo) {
          const toDate = endOfDay(parseISO(filters.updatedTo));
          if (isAfter(updatedDate, toDate)) return false;
        }
      }

      // Synced Date Range
      if (filters.syncedFrom || filters.syncedTo) {
        if (!brand.close_synced_at) return false;
        const syncedDate = parseISO(brand.close_synced_at);
        if (filters.syncedFrom) {
          const fromDate = startOfDay(parseISO(filters.syncedFrom));
          if (isBefore(syncedDate, fromDate)) return false;
        }
        if (filters.syncedTo) {
          const toDate = endOfDay(parseISO(filters.syncedTo));
          if (isAfter(syncedDate, toDate)) return false;
        }
      }

      return true;
    });
  }, [brands, filters]);
}
