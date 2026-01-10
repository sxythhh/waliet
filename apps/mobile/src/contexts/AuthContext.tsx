import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { config } from '../config';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithDiscord: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOTP: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signInWithDiscord: async () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ success: false }),
  verifyEmailOTP: async () => ({ success: false }),
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

// Extract tokens from URL hash or query params
const extractTokensFromUrl = (url: string): { accessToken?: string; refreshToken?: string } => {
  try {
    // Try hash fragment first (#access_token=...)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const fragment = url.substring(hashIndex + 1);
      const params: Record<string, string> = {};
      fragment.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
      if (params['access_token'] && params['refresh_token']) {
        return {
          accessToken: params['access_token'],
          refreshToken: params['refresh_token'],
        };
      }
    }

    // Try query params (?access_token=...)
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const query = url.substring(queryIndex + 1);
      const params: Record<string, string> = {};
      query.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
      if (params['access_token'] && params['refresh_token']) {
        return {
          accessToken: params['access_token'],
          refreshToken: params['refresh_token'],
        };
      }
    }
  } catch (error) {
    console.error('Error extracting tokens from URL:', error);
  }
  return {};
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

  // OAuth sign-in with proper mobile handling
  const signInWithOAuth = useCallback(async (provider: 'discord' | 'google') => {
    try {
      // Create the redirect URL for the mobile app
      const redirectUrl = 'virality://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true,
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error(`${provider} sign in error:`, error);
        Alert.alert('Sign In Error', error.message);
        return;
      }

      if (data.url) {
        // Open OAuth URL in the system browser
        // The deep link handler will catch the callback
        const supported = await Linking.canOpenURL(data.url);
        if (supported) {
          await Linking.openURL(data.url);
        } else {
          console.error('Cannot open URL:', data.url);
          Alert.alert('Sign In Error', 'Unable to open browser for authentication.');
        }
      }
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      Alert.alert('Sign In Error', 'An unexpected error occurred. Please try again.');
    }
  }, []);

  const signInWithDiscord = useCallback(async () => {
    await signInWithOAuth('discord');
  }, [signInWithOAuth]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithOAuth('google');
  }, [signInWithOAuth]);

  // Email OTP sign-in
  const signInWithEmail = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send verification code' };
    }
  }, []);

  // Verify email OTP
  const verifyEmailOTP = useCallback(async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        updateAuthState(data.session);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to verify code' };
    }
  }, [updateAuthState]);

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

  // Handle deep links for OAuth callback
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;

      if (url.includes('auth/callback') || url.includes('access_token')) {
        const { accessToken, refreshToken } = extractTokensFromUrl(url);

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session from deep link:', error);
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL (app opened from closed state)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
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
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithDiscord,
        signInWithGoogle,
        signInWithEmail,
        verifyEmailOTP,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
