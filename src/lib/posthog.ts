import posthog from "posthog-js";

// PostHog configuration
export const POSTHOG_KEY = "phc_G6ikbkcGrPjMMh1IZng78xOD8P6TM1ffvsB392I7rZF";
export const POSTHOG_HOST = "https://us.i.posthog.com";

// Initialize PostHog (for use outside of React)
export function initPostHog() {
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
