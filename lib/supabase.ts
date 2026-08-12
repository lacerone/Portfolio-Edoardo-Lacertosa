import { createBrowserClient } from '@supabase/ssr';
// Nota: Se nel tuo progetto non usi @supabase/ssr ma @supabase/supabase-js, sostituisci con:
// import { createClient as createBrowserClient } from '@supabase/supabase-js';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient(supabaseUrl, supabaseKey);
};