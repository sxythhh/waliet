import posthog from "posthog-js";

// PostHog configuration - requires env var (no hardcoded fallbacks for security)
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

// Check if PostHog is configured
export const isPostHogConfigured = (): boolean => {
  return !!POSTHOG_KEY;
};

// Initialize PostHog (for use outside of React)
export function initPostHog() {
  if (!POSTHOG_KEY) {
    console.warn('PostHog not configured: VITE_POSTHOG_KEY is missing');
    return posthog;
  }
  if (typeof window !== "undefined" && !posthog.__loaded) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    });
  }
  return posthog;
}

// Identify user (call after login)
export function identifyUser(userId: string, properties?: Record<string, any>) {
  posthog.identify(userId, properties);
}

// Reset user (call on logout)
export function resetUser() {
  posthog.reset();
}

// Track custom event
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  posthog.capture(eventName, properties);
}

// Set user properties
export function setUserProperties(properties: Record<string, any>) {
  posthog.people.set(properties);
}

// Get distinct ID
export function getDistinctId(): string {
  return posthog.get_distinct_id();
}

export { posthog };
