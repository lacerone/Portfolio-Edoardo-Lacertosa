// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';
// Se usavi @supabase/supabase-js: import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient(supabaseUrl, supabaseKey);
};