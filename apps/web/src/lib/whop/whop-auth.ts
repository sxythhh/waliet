/**
 * Whop Authentication Utilities
 *
 * Handles authentication for users accessing the app via Whop iframe.
 * The Whop iframe passes a JWT token via cookies that we use to authenticate.
 */

import { supabase } from "@/integrations/supabase/client";

export interface WhopUser {
  id: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  whop_user_id?: string;
  account_type?: string;
  onboarding_completed?: boolean;
}

export interface WhopMembership {
  membership_id?: string;
  company_id?: string;
  product_id?: string;
  plan_id?: string;
}

export interface WhopAuthResult {
  success: boolean;
  user?: WhopUser;
  whop?: WhopMembership;
  is_new_user?: boolean;
  error?: string;
}

/**
 * Check if we're running inside a Whop iframe
 */
export function isWhopIframe(): boolean {
  // Check if we're in an iframe
  if (typeof window === "undefined") return false;
  if (window === window.parent) return false;

  // Check for Whop-specific indicators
  // The Whop iframe sets a cookie or passes URL params
  try {
    // Check URL params for Whop context
    const params = new URLSearchParams(window.location.search);
    if (params.has("whop") || params.has("whop_user")) return true;

    // Check referrer for Whop domain
    if (document.referrer.includes("whop.com")) return true;

    // Check for Whop cookie
    if (document.cookie.includes("whop_user_token")) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Get the Whop user token from cookies
 */
export function getWhopToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "whop_user_token") {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Authenticate with Whop token via our Edge Function
 */
export async function authenticateWithWhop(token: string): Promise<WhopAuthResult> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whop-auth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-whop-user-token": token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Authentication failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      user: data.user,
      whop: data.whop,
      is_new_user: data.is_new_user,
    };
  } catch (error) {
    console.error("Whop authentication error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create an authenticated Supabase client for Whop users
 * This uses the service role via Edge Function for authenticated requests
 */
export async function getWhopAuthenticatedUser(token: string) {
  const result = await authenticateWithWhop(token);
  if (!result.success || !result.user) {
    return null;
  }
  return result.user;
}

/**
 * Storage key for persisting Whop auth state
 */
const WHOP_AUTH_STORAGE_KEY = "whop_auth_state";

export interface WhopAuthState {
  token: string;
  user: WhopUser;
  whop?: WhopMembership;
  timestamp: number;
}

/**
 * Save Whop auth state to localStorage
 */
export function saveWhopAuthState(state: WhopAuthState): void {
  try {
    localStorage.setItem(WHOP_AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save Whop auth state:", error);
  }
}

/**
 * Load Whop auth state from localStorage
 */
export function loadWhopAuthState(): WhopAuthState | null {
  try {
    const stored = localStorage.getItem(WHOP_AUTH_STORAGE_KEY);
    if (!stored) return null;

    const state: WhopAuthState = JSON.parse(stored);

    // Check if state is expired (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - state.timestamp > maxAge) {
      clearWhopAuthState();
      return null;
    }

    return state;
  } catch (error) {
    console.error("Failed to load Whop auth state:", error);
    return null;
  }
}

/**
 * Clear Whop auth state from localStorage
 */
export function clearWhopAuthState(): void {
  try {
    localStorage.removeItem(WHOP_AUTH_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear Whop auth state:", error);
  }
}
