import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  const url = supabaseUrl?.trim();
  const anonKey = supabaseAnonKey?.trim();

  if (!url || !anonKey) {
    throw new Error(
      'Не указаны VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.',
    );
  }

  client ??= createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return client;
}
