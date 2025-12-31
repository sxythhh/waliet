import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
const trackUserSession = async (userId: string) => {
  try {
    const browserSessionId = getBrowserSessionId();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-user-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
              trackUserSession(currentSession.user.id);
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
        trackUserSession(existingSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [updateAuthState]);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
