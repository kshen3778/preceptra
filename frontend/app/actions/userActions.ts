'use server';

import { createSupabaseAppServerClient } from '@/lib/supabase/server_client';
import { supabaseAdmin } from '@/lib/supabase/admin_client';

/**
 * Helper function to verify if a user is authenticated
 * Returns user data if authenticated, or error if not
 */
export async function verifyAuthentication() {
  const supabase = await createSupabaseAppServerClient();
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { 
      authenticated: false, 
      error: 'Authentication required' 
    };
  }
  
  return { 
    authenticated: true, 
    userId: user.id
  };
}

/**
 * Get current logged in user profile data
 * This can be called from client components to retrieve just the profile data
 */
export async function getProfile() {
  const { authenticated, userId, error } = await verifyAuthentication();
  
  if (!authenticated) {
    return { authenticated, error };
  }
    
  // Get the user's profile with name and email details
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('Profiles')
    .select('id, external_id, first_name, last_name, credits, selected_organization_id')
    .eq('id', userId)
    .single();

  if (profileError) {
    return { profile: null, error: profileError};
  }
  
  return { profile };
}

/**
 * Get user profile data by specific user ID
 * This can be called from admin components to retrieve a user's profile data
 * @param userId - The ID of the user whose profile to retrieve
 */
export async function getUserProfileById(userId: string) {
  if (!userId) {
    return { profile: null, error: 'User ID is required' };
  }
  
  // Get the user's complete profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('Profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    return { profile: null, error: profileError};
  }
  
  return { profile };
}


/**
 * Check if the current user has access to a specific agent
 * @param agentId - The ID of the agent to check access for
 * @returns Object with hasAccess boolean and optional error
 */
export async function checkAgentAccess(agentId: string) {
  const { authenticated, userId, error: authError } = await verifyAuthentication();
  
  if (!authenticated || !userId) {
    return { hasAccess: false, error: authError || 'Authentication required' };
  }
  
  if (!agentId) {
    return { hasAccess: false, error: 'Agent ID is required' };
  }
  
  try {
    // Check if user has access to the agent in User_Agent table
    const { data, error } = await supabaseAdmin
      .from('User_Agent')
      .select('id')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking agent access:', error);
      return { hasAccess: false, error: error.message };
    }
    
    return { hasAccess: !!data };
    
  } catch (err: any) {
    console.error('Exception checking agent access:', err);
    return { hasAccess: false, error: err.message };
  }
}

/**
 * Get all organizations that the current user belongs to
 * @returns Object with organizations array and optional error
 */
export async function getUserOrganizations() {
  const { authenticated, userId, error: authError } = await verifyAuthentication();
  
  if (!authenticated || !userId) {
    return { organizations: [], error: authError || 'Authentication required' };
  }
  
  try {
    // Get organizations the user belongs to via Organization_User table
    const { data, error } = await supabaseAdmin
      .from('Organization_User')
      .select(`
        id,
        organization_id,
        role,
        created_at,
        Organizations:organization_id (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching user organizations:', error);
      return { organizations: [], error: error.message };
    }
    
    // Extract organization data from the joined query
    const organizations = (data || [])
      .map(item => {
        const org = item.Organizations as any;
        if (!org) return null;
        return {
          id: org.id,
          name: org.name,
          created_at: org.created_at,
          role: item.role,
          membership_id: item.id,
        };
      })
      .filter(org => org !== null);
    
    return { organizations };
    
  } catch (err: any) {
    console.error('Exception fetching user organizations:', err);
    return { organizations: [], error: err.message };
  }
}

/**
 * Check if the current user belongs to a specific organization
 * @param organizationId - The ID of the organization to check
 * @returns Object with belongsTo boolean and optional error
 */
export async function checkOrganizationMembership(organizationId: string) {
  const { authenticated, userId, error: authError } = await verifyAuthentication();
  
  if (!authenticated || !userId) {
    return { belongsTo: false, error: authError || 'Authentication required' };
  }
  
  if (!organizationId) {
    return { belongsTo: false, error: 'Organization ID is required' };
  }
  
  try {
    // Check if user belongs to the organization in Organization_User table
    const { data, error } = await supabaseAdmin
      .from('Organization_User')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking organization membership:', error);
      return { belongsTo: false, error: error.message };
    }
    
    return { belongsTo: !!data };
    
  } catch (err: any) {
    console.error('Exception checking organization membership:', err);
    return { belongsTo: false, error: err.message };
  }
}

/**
 * Get the currently selected organization ID for the authenticated user
 * @returns Object with selectedOrganizationId (string | null) and optional error
 */
export async function getSelectedOrganization() {
  const { authenticated, userId, error: authError } = await verifyAuthentication();
  
  if (!authenticated || !userId) {
    return { selectedOrganizationId: null, error: authError || 'Authentication required' };
  }
  
  try {
    // Get the user's selected organization ID from Profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('Profiles')
      .select('selected_organization_id')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching selected organization:', profileError);
      return { selectedOrganizationId: null, error: profileError.message };
    }
    
    return { selectedOrganizationId: profile?.selected_organization_id || null };
    
  } catch (err: any) {
    console.error('Exception fetching selected organization:', err);
    return { selectedOrganizationId: null, error: err.message };
  }
}

/**
 * Change the selected organization ID for the authenticated user
 * Validates that the user belongs to the organization before updating
 * @param organizationId - The ID of the organization to select (null to clear selection)
 * @returns Object with success boolean and optional error
 */
export async function changeSelectedOrganization(organizationId: string | null) {
  const { authenticated, userId, error: authError } = await verifyAuthentication();
  
  if (!authenticated || !userId) {
    return { success: false, error: authError || 'Authentication required' };
  }
  
  // If organizationId is provided, validate that user belongs to it
  if (organizationId) {
    const { belongsTo, error: membershipError } = await checkOrganizationMembership(organizationId);
    
    if (membershipError || !belongsTo) {
      return { success: false, error: membershipError || 'User does not belong to this organization' };
    }
  }
  
  try {
    // Update the selected organization ID in Profiles table
    const { error: updateError } = await supabaseAdmin
      .from('Profiles')
      .update({ selected_organization_id: organizationId })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating selected organization:', updateError);
      return { success: false, error: updateError.message };
    }
    
    return { success: true };
    
  } catch (err: any) {
    console.error('Exception updating selected organization:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get the membership status of the current user in their selected organization
 * Returns the full membership details including role, membership ID, and created date
 * Uses the user's selected_organization_id from their profile
 * @returns Object with membership details (id, role, created_at) or null if not a member or no organization selected, and optional error
 */
export async function getSelectedOrganizationMembershipRole() {
  const { authenticated, userId, error: authError } = await verifyAuthentication();
  
  if (!authenticated || !userId) {
    return { membership: null, error: authError || 'Authentication required' };
  }
  
  try {
    // Get the user's selected organization
    const { selectedOrganizationId, error: orgError } = await getSelectedOrganization();
    
    if (orgError) {
      return { membership: null, error: orgError };
    }
    
    if (!selectedOrganizationId) {
      return { membership: null, error: 'No organization selected' };
    }
    
    // Get the user's membership details from Organization_User table
    const { data, error } = await supabaseAdmin
      .from('Organization_User')
      .select('id, role, created_at, organization_id, user_id')
      .eq('user_id', userId)
      .eq('organization_id', selectedOrganizationId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching organization membership status:', error);
      return { membership: null, error: error.message };
    }
    
    if (!data) {
      return { membership: null, error: 'User is not a member of the selected organization' };
    }
    
    return { 
      membership: {
        id: data.id,
        role: data.role || null,
        created_at: data.created_at,
        organization_id: data.organization_id,
        user_id: data.user_id,
      }
    };
    
  } catch (err: any) {
    console.error('Exception fetching organization membership status:', err);
    return { membership: null, error: err.message };
  }
}
