import { useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Optional Firebase messaging - graceful fallback if not installed
let messaging: any = null;
let FirebaseAuthorizationStatus: any = null;
try {
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default;
  FirebaseAuthorizationStatus = firebaseMessaging.default?.AuthorizationStatus;
} catch {
  // @react-native-firebase/messaging not available
  console.log('Firebase messaging not available - push notifications disabled');
}

interface PushNotificationData {
  type?: string;
  transaction_id?: string;
  amount?: string;
  [key: string]: string | undefined;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const tokenSavedRef = useRef(false);

  // Request permission and get token
  const requestPermission = useCallback(async (): Promise<string | null> => {
    if (!messaging) {
      console.log('Firebase messaging not available');
      return null;
    }

    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === FirebaseAuthorizationStatus?.AUTHORIZED ||
        authStatus === FirebaseAuthorizationStatus?.PROVISIONAL;

      if (!enabled) {
        console.log('Push notification permission denied');
        return null;
      }

      // Get FCM token
      const token = await messaging().getToken();
      console.log('FCM Token:', token?.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return null;
    }
  }, []);

  // Save token to database
  const saveToken = useCallback(async (token: string) => {
    if (!user?.id || tokenSavedRef.current) return;

    try {
      const platform = Platform.OS as 'ios' | 'android';

      // Upsert token (insert or update if exists)
      // Use 'any' cast as push_tokens table may not be in typed schema
      const { error } = await (supabase as any)
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            token,
            platform,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,token',
          }
        );

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
        tokenSavedRef.current = true;
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }, [user?.id]);

  // Remove token from database (on logout)
  const removeToken = useCallback(async () => {
    if (!user?.id || !messaging) return;

    try {
      const token = await messaging().getToken();
      if (token) {
        // Use 'any' cast as push_tokens table may not be in typed schema
        await (supabase as any)
          .from('push_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('token', token);
        console.log('Push token removed');
      }
      tokenSavedRef.current = false;
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }, [user?.id]);

  // Handle foreground notification
  const handleForegroundNotification = useCallback(
    (remoteMessage: any) => {
      const { notification, data } = remoteMessage;
      const notificationData = data as PushNotificationData;

      console.log('Foreground notification:', notification?.title);

      // Show alert for foreground notifications
      if (notification?.title) {
        Alert.alert(
          notification.title,
          notification.body || '',
          [
            {
              text: 'View',
              onPress: () => handleNotificationPress(notificationData),
            },
            { text: 'Dismiss', style: 'cancel' },
          ]
        );
      }
    },
    []
  );

  // Handle notification press (when app opened from notification)
  const handleNotificationPress = useCallback((data: PushNotificationData) => {
    console.log('Notification pressed:', data);

    // Navigate based on notification type
    if (data?.type === 'wallet_transaction') {
      // TODO: Navigate to wallet screen
      // navigation.navigate('Wallet');
    }
  }, []);

  // Initialize push notifications
  useEffect(() => {
    if (!user?.id || !messaging) return;

    let unsubscribeForeground: (() => void) | undefined;
    let unsubscribeTokenRefresh: (() => void) | undefined;
    let unsubscribeNotificationOpened: (() => void) | undefined;

    const initializePushNotifications = async () => {
      // Request permission and get token
      const token = await requestPermission();
      if (token) {
        await saveToken(token);
      }

      // Listen for foreground messages
      unsubscribeForeground = messaging().onMessage(handleForegroundNotification);

      // Listen for token refresh
      unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken: string) => {
        console.log('FCM token refreshed');
        tokenSavedRef.current = false;
        await saveToken(newToken);
      });

      // Check if app was opened from notification
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('App opened from notification:', initialNotification.data);
        handleNotificationPress(initialNotification.data as PushNotificationData);
      }

      // Handle notification opened app from background
      unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(
        (remoteMessage: any) => {
          console.log('Notification opened app:', remoteMessage.data);
          handleNotificationPress(remoteMessage.data as PushNotificationData);
        }
      );
    };

    initializePushNotifications();

    return () => {
      unsubscribeForeground?.();
      unsubscribeTokenRefresh?.();
      unsubscribeNotificationOpened?.();
    };
  }, [user?.id, requestPermission, saveToken, handleForegroundNotification, handleNotificationPress]);

  return {
    requestPermission,
    removeToken,
  };
}
