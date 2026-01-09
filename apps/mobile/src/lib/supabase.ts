import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@virality/shared-types';
import { config } from '../config';

// Custom storage adapter for React Native using AsyncStorage
const asyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.publishableKey,
  {
    auth: {
      storage: asyncStorageAdapter,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // No URL detection in React Native
      flowType: 'pkce',
    },
  }
);
