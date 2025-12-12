import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SECRET_KEY) {
  throw new Error('Missing environment variable SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Supabase client with admin privileges using the service role key.
 * This should ONLY be used in server-side code and never exposed to the client.
 * 
 * Import this client in server-side code or server actions:
 * import { supabaseAdmin } from '@/utils/supabase/admin'
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Direct access to Supabase Auth Admin API
 * This allows for admin-level authentication operations
 */
export const supabaseAdminAuth = supabaseAdmin.auth.admin;