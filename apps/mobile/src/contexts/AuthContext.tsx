import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { config } from '../config';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signInWithDiscord: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Get or create a unique device session identifier
const getDeviceSessionId = async (): Promise<string> => {
  const storageKey = 'device_session_id';
  let sessionId = await AsyncStorage.getItem(storageKey);
  if (!sessionId) {
    // Generate a UUID-like string for React Native
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    await AsyncStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
};

// Track user session for security/device tracking
const trackUserSession = async (userId: string, accessToken: string) => {
  try {
    const deviceSessionId = await getDeviceSessionId();

    const response = await fetch(
      `${config.supabase.url}/functions/v1/track-user-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId,
          sessionId: deviceSessionId,
          platform: 'mobile',
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

  const signInWithDiscord = useCallback(async () => {
    try {
      // For React Native, we need to use a different OAuth flow
      // This will be implemented with react-native-url-polyfill and Linking
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          skipBrowserRedirect: true,
          redirectTo: 'virality://auth/callback',
        },
      });

      if (error) {
        console.error('Discord sign in error:', error);
        throw error;
      }

      if (data.url) {
        // Open the OAuth URL in the device browser
        // This requires react-native-inappbrowser-reborn or Linking
        const { Linking } = require('react-native');
        await Linking.openURL(data.url);
      }
    } catch (error) {
      console.error('Error signing in with Discord:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      hasTrackedSession.current = null;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_OUT') {
          hasTrackedSession.current = null;
          updateAuthState(null);
          return;
        }

        if (currentSession) {
          updateAuthState(currentSession);

          // Track session on sign in (only once per device session)
          if (event === 'SIGNED_IN') {
            const deviceSessionId = await getDeviceSessionId();
            if (deviceSessionId !== hasTrackedSession.current) {
              hasTrackedSession.current = deviceSessionId;
              trackUserSession(currentSession.user.id, currentSession.access_token);
            }
          }
        } else if (event === 'INITIAL_SESSION' && !currentSession) {
          updateAuthState(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      updateAuthState(existingSession);

      if (existingSession && !hasTrackedSession.current) {
        const deviceSessionId = await getDeviceSessionId();
        hasTrackedSession.current = deviceSessionId;
        trackUserSession(existingSession.user.id, existingSession.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [updateAuthState]);

  return (
    <AuthContext.Provider value={{ session, user, loading, signInWithDiscord, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
