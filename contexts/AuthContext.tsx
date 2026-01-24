import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  isWhopIframe,
  getWhopToken,
  authenticateWithWhop,
  WhopUser,
  WhopMembership,
  saveWhopAuthState,
  loadWhopAuthState,
  clearWhopAuthState,
} from '@/lib/whop';

// Session timeout disabled - sessions persist until explicit logout or token expiry

/** Authentication source for the current session */
export type AuthSource = 'supabase' | 'whop';

interface AuthContextType {
  /** Supabase session (available only for Supabase auth) */
  session: Session | null;
  /** Supabase user (available only for Supabase auth) */
  user: User | null;
  /** Whether authentication is in progress */
  loading: boolean;
  /** Authentication source */
  authSource: AuthSource | null;
  /** Whether we're in a Whop iframe context */
  isWhopContext: boolean;
  /** Whop user data (available for Whop auth) */
  whopUser: WhopUser | null;
  /** Whop membership info */
  whopMembership: WhopMembership | null;
  /** Whether this is a new user (first Whop auth) */
  isNewUser: boolean;
  /** Unified user ID (works for both auth sources) */
  userId: string | null;
  /** Unified email (works for both auth sources) */
  userEmail: string | null;
  /** Sign out from current auth source */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  authSource: null,
  isWhopContext: false,
  whopUser: null,
  whopMembership: null,
  isNewUser: false,
  userId: null,
  userEmail: null,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Polyfill for crypto.randomUUID (not available on iOS < 15.4 or some WebViews)
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback using crypto.getRandomValues
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === 'x' ? 0 : 3);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// Get or create a unique browser/device session identifier
const getBrowserSessionId = (): string => {
  const storageKey = 'browser_session_id';
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
};

// Track user session for security/device tracking
const trackUserSession = async (userId: string, accessToken: string) => {
  try {
    const browserSessionId = getBrowserSessionId();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-user-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId,
          sessionId: browserSessionId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to track session:', errorData);
    }
  } catch (error) {
    console.error('Error tracking session:', error);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Supabase auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Whop auth state
  const [whopUser, setWhopUser] = useState<WhopUser | null>(null);
  const [whopMembership, setWhopMembership] = useState<WhopMembership | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Unified state
  const [loading, setLoading] = useState(true);
  const [authSource, setAuthSource] = useState<AuthSource | null>(null);
  const [isWhopContext, setIsWhopContext] = useState(false);

  const hasTrackedSession = useRef<string | null>(null);
  const hasInitialized = useRef(false);

  // Detect if we're in a popup window (OAuth callbacks)
  // Popups should not initialize auth to avoid affecting main window's session
  const isPopup = typeof window !== 'undefined' && window.opener !== null;

  // Unified sign out function
  const signOut = useCallback(async () => {
    if (authSource === 'whop') {
      clearWhopAuthState();
      setWhopUser(null);
      setWhopMembership(null);
      setIsNewUser(false);
      setAuthSource(null);
    } else if (authSource === 'supabase') {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setAuthSource(null);
    }
    hasTrackedSession.current = null;
  }, [authSource]);

  // Initialize Whop auth for iframe context
  const initializeWhopAuth = useCallback(async (): Promise<boolean> => {
    const inWhopIframe = isWhopIframe();
    setIsWhopContext(inWhopIframe);

    if (!inWhopIframe) {
      return false; // Not in Whop context
    }

    // Try to load cached auth state first
    const cachedState = loadWhopAuthState();
    const token = getWhopToken();

    if (cachedState && token === cachedState.token) {
      // Use cached state
      setWhopUser(cachedState.user);
      setWhopMembership(cachedState.whop || null);
      setAuthSource('whop');
      return true;
    }

    if (!token) {
      console.warn('In Whop iframe but no token found');
      return false;
    }

    // Authenticate with our backend
    const result = await authenticateWithWhop(token);

    if (!result.success || !result.user) {
      console.error('Whop authentication failed:', result.error);
      clearWhopAuthState();
      return false;
    }

    // Set authenticated state
    setWhopUser(result.user);
    setWhopMembership(result.whop || null);
    setIsNewUser(result.is_new_user || false);
    setAuthSource('whop');

    // Cache the auth state
    saveWhopAuthState({
      token,
      user: result.user,
      whop: result.whop,
      timestamp: Date.now(),
    });

    // Track session for Whop users
    if (result.user.id && !hasTrackedSession.current) {
      const browserSessionId = getBrowserSessionId();
      hasTrackedSession.current = browserSessionId;
      // Note: Whop users don't have an access token, so we use a special tracking call
      // The Edge Function will handle this via service role
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-user-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-whop-user-token': token,
            },
            body: JSON.stringify({
              userId: result.user.id,
              sessionId: browserSessionId,
              platform: 'whop',
            }),
          }
        );
      } catch (error) {
        console.error('Error tracking Whop session:', error);
      }
    }

    return true;
  }, []);

  // Initialize Supabase auth
  const initializeSupabaseAuth = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        setAuthSource('supabase');

        // Track existing session on page load (but only once)
        if (!hasTrackedSession.current) {
          const browserSessionId = getBrowserSessionId();
          hasTrackedSession.current = browserSessionId;
          trackUserSession(initialSession.user.id, initialSession.access_token);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing Supabase auth:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Skip auth initialization in popup windows to prevent cross-tab auth sync issues
    if (isPopup) {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        // Check Whop auth first (iframe context takes priority)
        const hasWhopAuth = await initializeWhopAuth();

        // If not authenticated via Whop, try Supabase
        if (!hasWhopAuth) {
          await initializeSupabaseAuth();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener for SUBSEQUENT Supabase changes
    // This handles sign in, sign out, token refresh AFTER initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Ignore INITIAL_SESSION - we handle that with getSession() above
        if (event === 'INITIAL_SESSION') {
          return;
        }

        // Skip if we're authenticated via Whop
        if (authSource === 'whop') {
          return;
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          hasTrackedSession.current = null;
          setSession(null);
          setUser(null);
          setAuthSource(null);
          return;
        }

        // Handle sign in, token refresh, etc.
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setAuthSource('supabase');

          // Track session on sign in (only once per browser session)
          const browserSessionId = getBrowserSessionId();
          if (event === 'SIGNED_IN' && browserSessionId !== hasTrackedSession.current) {
            hasTrackedSession.current = browserSessionId;
            setTimeout(() => {
              trackUserSession(currentSession.user.id, currentSession.access_token);
            }, 0);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [initializeWhopAuth, initializeSupabaseAuth, authSource]);

  // Compute unified user ID and email
  const userId = whopUser?.id || user?.id || null;
  const userEmail = whopUser?.email || user?.email || null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        authSource,
        isWhopContext,
        whopUser,
        whopMembership,
        isNewUser,
        userId,
        userEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
