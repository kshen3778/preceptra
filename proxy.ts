import { neonAuthMiddleware } from "@neondatabase/auth/next/server";
import { neonAuth } from "@neondatabase/auth/next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// First run the Neon Auth middleware
const authMiddleware = neonAuthMiddleware({
  // Redirects unauthenticated users to sign-in page
  loginUrl: "/auth/sign-in",
});

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Before running the Neon Auth middleware, allow verification page to be accessible without authentication
  // (users need to verify before they can authenticate)
  if (pathname === '/auth/verify-email' || pathname.startsWith('/auth/verify-email')) {
    return NextResponse.next();
  }
  
  // Run the Neon Auth middleware first
  const authResponse = await authMiddleware(request);
  
  // If auth middleware redirects (unauthenticated), return that response
  if (authResponse && (authResponse.status === 307 || authResponse.status === 308)) {
    return authResponse;
  }

  // Check if user is authenticated and email is verified
  try {
    const { user } = await neonAuth();
    
    // If user exists but email is not verified, redirect to verification
    if (user && !user.emailVerified) {
      // Allow access to auth pages (including verification), account pages, and sign-up page
      if (pathname.startsWith('/auth') || pathname.startsWith('/account')) {
        return authResponse || NextResponse.next();
      }
      
      // Redirect unverified users to sign-in with a message
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('verify', 'required');
      return NextResponse.redirect(signInUrl);
    }
  } catch (error) {
    // If there's an error checking auth, let the request proceed
    // (user might not be authenticated, which is handled by authMiddleware)
  }

  return authResponse || NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (all API routes - they handle their own authentication)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
