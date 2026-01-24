// Brand filter types and defaults

export interface BrandFilters {
  // Text Search
  search: string;

  // CRM Filters
  closeStatusIds: string[];
  pipelineValueMin: number | null;
  pipelineValueMax: number | null;
  lastActivityFrom: string | null; // ISO date string (YYYY-MM-DD)
  lastActivityTo: string | null;
  opportunityCountMin: number | null;
  opportunityCountMax: number | null;
  hasCloseLead: boolean | null; // null = all, true = linked, false = unlinked

  // Brand Attributes
  subscriptionStatuses: string[];
  isVerified: boolean | null; // null = all
  brandTypes: string[];
  sources: string[]; // 'manual' | 'close'

  // Date Filters
  createdFrom: string | null;
  createdTo: string | null;
  updatedFrom: string | null;
  updatedTo: string | null;
  syncedFrom: string | null;
  syncedTo: string | null;
}

export const DEFAULT_BRAND_FILTERS: BrandFilters = {
  search: "",
  closeStatusIds: [],
  pipelineValueMin: null,
  pipelineValueMax: null,
  lastActivityFrom: null,
  lastActivityTo: null,
  opportunityCountMin: null,
  opportunityCountMax: null,
  hasCloseLead: null,
  subscriptionStatuses: [],
  isVerified: null,
  brandTypes: [],
  sources: [],
  createdFrom: null,
  createdTo: null,
  updatedFrom: null,
  updatedTo: null,
  syncedFrom: null,
  syncedTo: null,
};

// URL parameter keys (short for cleaner URLs)
export const FILTER_PARAM_KEYS = {
  search: "q",
  closeStatusIds: "status",
  pipelineValueMin: "pv_min",
  pipelineValueMax: "pv_max",
  lastActivityFrom: "la_from",
  lastActivityTo: "la_to",
  opportunityCountMin: "opp_min",
  opportunityCountMax: "opp_max",
  hasCloseLead: "linked",
  subscriptionStatuses: "sub",
  isVerified: "verified",
  brandTypes: "type",
  sources: "src",
  createdFrom: "c_from",
  createdTo: "c_to",
  updatedFrom: "u_from",
  updatedTo: "u_to",
  syncedFrom: "s_from",
  syncedTo: "s_to",
} as const;

// Common subscription statuses
export const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past Due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "trialing", label: "Trialing" },
  { value: "incomplete", label: "Incomplete" },
] as const;

// Common brand types
export const BRAND_TYPE_OPTIONS = [
  { value: "brand", label: "Brand" },
  { value: "agency", label: "Agency" },
  { value: "creator", label: "Creator" },
  { value: "other", label: "Other" },
] as const;

// Source options
export const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "close", label: "Close CRM" },
] as const;
