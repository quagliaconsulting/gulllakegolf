import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware handles route protection (Edge Runtime compatible)
export async function middleware(request: NextRequest) {
  // Define paths that don't require authentication
  const publicPaths = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/me',
    // Add dev endpoints for easier development
    '/api/dev/create-dummy-tournament',
    '/api/dev/cleanup-data',
  ];

  // Skip middleware for public paths and static files
  const path = request.nextUrl.pathname;
  if (
    publicPaths.includes(path) ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Check if the token exists in cookies or headers
  // Look for token in multiple places
  const token = request.cookies.get('token')?.value || 
                request.cookies.get('auth_token')?.value ||
                request.headers.get('authorization')?.split(' ')[1];
  
  console.log('[Middleware] Path:', path);
  console.log('[Middleware] Has token:', !!token);
  
  // Simple existence check - we won't verify the token in middleware since
  // jsonwebtoken uses Node.js crypto which isn't available in Edge Runtime
  if (!token) {
    if (path.startsWith('/api/')) {
      // For API routes, return 401 Unauthorized
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // For page routes, redirect to login
    const url = new URL('/auth/signin', request.url);
    url.searchParams.append('callbackUrl', path);
    return NextResponse.redirect(url);
  }
  
  // Token exists, so we'll trust it and let the API routes validate it properly
  // This is a simplification but necessary given Edge Runtime constraints
  return NextResponse.next();
}

// Configure the matcher for which paths to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};