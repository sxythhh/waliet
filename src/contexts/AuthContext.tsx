import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Session timeout configuration
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 5 * 60 * 1000; // Show warning 5 minutes before timeout
const CHECK_INTERVAL = 60 * 1000; // Check every minute

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

// Get or create a unique browser/device session identifier
const getBrowserSessionId = (): string => {
  const storageKey = 'browser_session_id';
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
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
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  const updateAuthState = useCallback((newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only sign out if the user explicitly signed out or session is truly invalid
        if (event === 'SIGNED_OUT') {
          hasTrackedSession.current = null;
          updateAuthState(null);
          return;
        }

        // For all other events (including TOKEN_REFRESHED, SIGNED_IN, etc.), update state
        if (currentSession) {
          updateAuthState(currentSession);
          
          // Track session on sign in (only once per browser session)
          const browserSessionId = getBrowserSessionId();
          if (event === 'SIGNED_IN' && browserSessionId !== hasTrackedSession.current) {
            hasTrackedSession.current = browserSessionId;
            // Use setTimeout to avoid blocking the auth flow
            setTimeout(() => {
              trackUserSession(currentSession.user.id, currentSession.access_token);
            }, 0);
          }
        } else if (event === 'INITIAL_SESSION' && !currentSession) {
          // No session on initial load - that's fine, user isn't logged in
          updateAuthState(null);
        }
        // Don't sign out on TOKEN_REFRESH_FAILED - let the session persist
        // The next API call will handle re-auth if truly needed
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      updateAuthState(existingSession);
      
      // Track existing session on page load (but only once)
      if (existingSession && !hasTrackedSession.current) {
        const browserSessionId = getBrowserSessionId();
        hasTrackedSession.current = browserSessionId;
        trackUserSession(existingSession.user.id, existingSession.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [updateAuthState]);

  // Session timeout - auto logout after 30 minutes of inactivity
  useEffect(() => {
    if (!session) {
      // Reset tracking when logged out
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
      return;
    }

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
    };

    const checkInactivity = async () => {
      const inactiveTime = Date.now() - lastActivityRef.current;

      if (inactiveTime >= INACTIVITY_TIMEOUT) {
        // Timeout reached - sign out
        await supabase.auth.signOut();
        toast.info('You have been signed out due to inactivity');
      } else if (inactiveTime >= INACTIVITY_TIMEOUT - WARNING_BEFORE && !warningShownRef.current) {
        // Show warning 5 minutes before timeout
        warningShownRef.current = true;
        toast.warning('You will be signed out in 5 minutes due to inactivity', {
          duration: 10000,
        });
      }
    };

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetActivity, { passive: true });
    });

    // Check inactivity periodically
    const intervalId = setInterval(checkInactivity, CHECK_INTERVAL);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetActivity);
      });
      clearInterval(intervalId);
    };
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
