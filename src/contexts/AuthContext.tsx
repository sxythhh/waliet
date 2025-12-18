import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
          updateAuthState(null);
          return;
        }

        // For all other events (including TOKEN_REFRESHED, SIGNED_IN, etc.), update state
        if (currentSession) {
          updateAuthState(currentSession);
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
    });

    return () => subscription.unsubscribe();
  }, [updateAuthState]);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
