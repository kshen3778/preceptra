import { createAuthClient } from '@neondatabase/neon-js/auth';

export const authClient = createAuthClient(
  process.env.NEXT_PUBLIC_NEON_AUTH_URL!
);

// Server-side auth client for API routes
export function getAuthClient() {
  return createAuthClient(process.env.NEXT_PUBLIC_NEON_AUTH_URL!);
}
