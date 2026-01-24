/**
 * React hook for Whop authentication
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  WhopUser,
  WhopMembership,
  isWhopIframe,
  getWhopToken,
  authenticateWithWhop,
  saveWhopAuthState,
  loadWhopAuthState,
  clearWhopAuthState,
} from "./whop-auth";

export interface UseWhopAuthResult {
  /** Whether we're running in a Whop iframe */
  isWhopContext: boolean;
  /** Whether authentication is in progress */
  loading: boolean;
  /** The authenticated Whop user (or null if not authenticated) */
  user: WhopUser | null;
  /** Whop membership info */
  membership: WhopMembership | null;
  /** Whether this is a new user */
  isNewUser: boolean;
  /** Error message if authentication failed */
  error: string | null;
  /** Manually trigger re-authentication */
  refresh: () => Promise<void>;
  /** Sign out and clear Whop auth state */
  signOut: () => void;
}

/**
 * Hook to handle Whop iframe authentication
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { isWhopContext, loading, user, error } = useWhopAuth();
 *
 *   if (loading) return <Loading />;
 *   if (isWhopContext && !user) return <Error message={error} />;
 *   if (user) return <AuthenticatedApp user={user} />;
 *   return <StandaloneAuth />;
 * }
 * ```
 */
export function useWhopAuth(): UseWhopAuthResult {
  const [isWhopContext, setIsWhopContext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<WhopUser | null>(null);
  const [membership, setMembership] = useState<WhopMembership | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const authenticate = useCallback(async () => {
    // Check if we're in a Whop iframe
    const inWhopIframe = isWhopIframe();
    setIsWhopContext(inWhopIframe);

    if (!inWhopIframe) {
      // Not in Whop context, skip Whop auth
      setLoading(false);
      return;
    }

    // Try to load cached auth state first
    const cachedState = loadWhopAuthState();
    if (cachedState) {
      setUser(cachedState.user);
      setMembership(cachedState.whop || null);
      setLoading(false);

      // Refresh in background
      const token = getWhopToken();
      if (token && token === cachedState.token) {
        return; // Token unchanged, use cached state
      }
    }

    // Get the Whop token
    const token = getWhopToken();
    if (!token) {
      setError("No Whop token found");
      setLoading(false);
      return;
    }

    // Authenticate with our backend
    const result = await authenticateWithWhop(token);

    if (!result.success) {
      setError(result.error || "Authentication failed");
      clearWhopAuthState();
      setLoading(false);
      return;
    }

    // Set authenticated state
    setUser(result.user || null);
    setMembership(result.whop || null);
    setIsNewUser(result.is_new_user || false);
    setError(null);

    // Cache the auth state
    if (result.user) {
      saveWhopAuthState({
        token,
        user: result.user,
        whop: result.whop,
        timestamp: Date.now(),
      });
    }

    setLoading(false);
  }, []);

  const signOut = useCallback(() => {
    clearWhopAuthState();
    setUser(null);
    setMembership(null);
    setIsNewUser(false);
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    authenticate();
  }, [authenticate]);

  return {
    isWhopContext,
    loading,
    user,
    membership,
    isNewUser,
    error,
    refresh: authenticate,
    signOut,
  };
}
