import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Session timeout disabled - sessions persist until explicit logout or token expiry

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasTrackedSession = useRef<string | null>(null);

  // Detect if we're in a popup window (OAuth callbacks)
  // Popups should not initialize auth to avoid affecting main window's session
  const isPopup = typeof window !== 'undefined' && window.opener !== null;

  useEffect(() => {
    // Skip auth initialization in popup windows to prevent cross-tab auth sync issues
    if (isPopup) {
      setLoading(false);
      return;
    }

    // Get the initial session FIRST - this is the authoritative source
    // This must complete before we set loading to false
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      // Track existing session on page load (but only once)
      if (initialSession && !hasTrackedSession.current) {
        const browserSessionId = getBrowserSessionId();
        hasTrackedSession.current = browserSessionId;
        trackUserSession(initialSession.user.id, initialSession.access_token);
      }
    });

    // Set up auth state listener for SUBSEQUENT changes only
    // This handles sign in, sign out, token refresh AFTER initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Ignore INITIAL_SESSION - we handle that with getSession() above
        if (event === 'INITIAL_SESSION') {
          return;
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          hasTrackedSession.current = null;
          setSession(null);
          setUser(null);
          return;
        }

        // Handle sign in, token refresh, etc.
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);

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
  }, []);


  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
