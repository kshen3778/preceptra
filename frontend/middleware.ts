/* eslint-disable @typescript-eslint/no-unused-vars */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAdminPermissions } from '@/app/actions/adminActions'


export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/auth/password-reset', '/auth/verify-email']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(`${route}/`)
  )

  // Check if trying to access admin routes
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // If trying to access admin route, check if user has admin role
  if (isAdminRoute) {
    // If no user, redirect to login
    if (!user) {
      console.log("No authenticated user, redirecting to login")
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('message', 'You must be logged in to access this area')
      return NextResponse.redirect(url)
    }
    
    // Use the imported verifyAdminPermissions function to check admin role
    const { isAdmin, error } = await verifyAdminPermissions();
    if (!isAdmin || error) {
      console.log("Unauthorized access to admin area because user is not an admin or error:", error)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }
  // Regular authentication check for non-admin routes
  else if (!user && !isPublicRoute) {
    console.log("No authenticated user, redirecting to login")
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access login/signup, redirect to dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)'],
}