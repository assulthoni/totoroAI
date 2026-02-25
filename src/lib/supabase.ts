import { createClient } from '@supabase/supabase-js';

type Options = {
  serviceRole?: boolean;
};

export const getSupabase = (opts?: Options) => {
  const isBrowser = typeof window !== 'undefined';
  const supabaseUrl = isBrowser ? process.env.NEXT_PUBLIC_SUPABASE_URL : process.env.SUPABASE_URL;
  const key = isBrowser
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : opts?.serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) {
    throw new Error('Supabase env vars are not set');
  }
  return createClient(supabaseUrl, key);
};
