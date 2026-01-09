import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@virality/shared-types';

export interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export function createSupabaseClient(
  url: string,
  anonKey: string,
  storage: StorageAdapter
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
    },
  });
}
