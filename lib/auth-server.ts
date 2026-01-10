import { cookies } from 'next/headers';
import { createAuthClient } from '@neondatabase/neon-js/auth';

export async function getSession() {
  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
  
  if (!authUrl) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('better-auth.session_token')?.value;
  
  if (!sessionToken) {
    return null;
  }

  try {
    const authClient = createAuthClient(authUrl);
    const session = await authClient.getSession({
      fetchOptions: {
        headers: {
          'Cookie': `better-auth.session_token=${sessionToken}`,
        },
      },
    });
    
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}
