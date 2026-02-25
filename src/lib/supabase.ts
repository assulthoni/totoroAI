import { createClient } from '@supabase/supabase-js';

export const getSupabase = () => {
  const isBrowser = typeof window !== 'undefined';
  const supabaseUrl = isBrowser ? process.env.NEXT_PUBLIC_SUPABASE_URL : process.env.SUPABASE_URL;
  const supabaseAnonKey = isBrowser ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are not set');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};
