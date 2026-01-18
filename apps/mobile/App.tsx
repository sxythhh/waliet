/**
 * Virality Mobile App
 * React Native app for creators
 */

// Gesture Handler must be imported at the top of the entry file
import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { StatusBar, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { supabase } from './src/lib/supabase';
import { usePushNotifications } from './src/hooks/usePushNotifications';

// Push notifications initializer component
function PushNotificationsInitializer({ children }: { children: React.ReactNode }) {
  usePushNotifications();
  return <>{children}</>;
}

// Deep linking configuration
const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: ['virality://', 'https://virality.so'],
  config: {
    screens: {
      Campaigns: 'campaigns',
      Wallet: 'wallet',
      Profile: 'profile',
    },
  },
};

function App(): React.JSX.Element {
  // Handle OAuth callback deep links
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;

      // Check if this is an auth callback
      if (url.includes('auth/callback') || url.includes('access_token') || url.includes('refresh_token')) {
        try {
          // Extract the fragment (everything after #)
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const fragment = url.substring(hashIndex + 1);
            // Parse fragment manually for React Native compatibility
            const params: Record<string, string> = {};
            fragment.split('&').forEach((pair) => {
              const [key, value] = pair.split('=');
              if (key && value) {
                params[decodeURIComponent(key)] = decodeURIComponent(value);
              }
            });

            const accessToken = params['access_token'];
            const refreshToken = params['refresh_token'];

            if (accessToken && refreshToken) {
              // Set the session in Supabase
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (error) {
                console.error('Error setting session:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error handling auth callback:', error);
        }
      }
    };

    // Handle deep link when app is opened from background
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PushNotificationsInitializer>
            <SafeAreaProvider>
              <NavigationContainer linking={linking}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <AppNavigator />
              </NavigationContainer>
            </SafeAreaProvider>
          </PushNotificationsInitializer>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;
