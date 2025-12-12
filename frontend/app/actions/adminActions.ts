'use server';

import { createSupabaseAppServerClient } from '@/lib/supabase/server_client';
import { supabaseAdmin } from '@/lib/supabase/admin_client';

/**
 * Helper function to verify admin permissions
 * Checks if the current user has admin role in the Profiles table
 */
export async function verifyAdminPermissions() {
  const supabase = await createSupabaseAppServerClient();

  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { isAdmin: false, error: 'Authentication required' };
  }
  
  // Check if user has admin permissions using admin client
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('UserProfiles')
    .select('permissions')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return { isAdmin: false, error: 'Error checking admin permissions' };
  }

  if (!profile || profile.permissions !== 'admin') {
    return { isAdmin: false, error: 'User is not an admin' };
  }
  
  return { isAdmin: true, userId: user.id, error: null };
}