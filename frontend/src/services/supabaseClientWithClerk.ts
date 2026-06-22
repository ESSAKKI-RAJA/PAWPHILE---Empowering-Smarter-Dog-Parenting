import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Singleton instances
let supabaseInstance: SupabaseClient | null = null;
let currentToken: string | null = null;

/**
 * Returns a Supabase client that uses the provided Clerk JWT for authentication.
 * Automatically injects the token into Supabase's global headers.
 */
export const getSupabaseClient = (clerkToken: string | null): SupabaseClient => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Falling back to local offline mode.');
  }

  // If token hasn't changed and instance exists, return it
  if (supabaseInstance && currentToken === clerkToken) {
    return supabaseInstance;
  }

  currentToken = clerkToken;
  const headers: Record<string, string> = {};
  if (clerkToken) {
    headers['Authorization'] = `Bearer ${clerkToken}`;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers,
    },
  });

  return supabaseInstance;
};
