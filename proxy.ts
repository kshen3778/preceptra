import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isVerifyPage = request.nextUrl.pathname.startsWith('/verify-email');
  
  // Get session token from cookie (Better Auth uses this cookie name)
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  
  let session = null;
  if (sessionToken && authUrl) {
    try {
      // Verify session with Neon Auth
      const response = await fetch(`${authUrl}/api/get-session`, {
        headers: {
          'Cookie': `better-auth.session_token=${sessionToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        session = data?.user ? data : null;
      }
    } catch (error) {
      // If auth service is unavailable, allow request to proceed
      // but log the error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Session verification error:', error);
      }
    }
  }

  // If user is on login/verify page and already authenticated, redirect to home
  if ((isLoginPage || isVerifyPage) && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!session && !isLoginPage && !isVerifyPage) {
    // Allow public routes and API routes (API routes handle their own authentication)
    const publicPaths = ['/api', '/_next', '/favicon.ico', '/tos'];
    const isPublicPath = publicPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );
    
    if (!isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Neon Auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
