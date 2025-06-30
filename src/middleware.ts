import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { JWTExtended } from "./types/Auth";
import { getToken } from "next-auth/jwt";
import environment from "./config/environment";
// test

// Helper function to get dashboard URL based on role
function getDashboardUrl(role?: string): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "guru":
      return "/guru/dashboard";
    case "murid":
      return "/murid/dashboard";
    default:
      return "/auth/login";
  }
}

// Helper function to check if token is expired
function isTokenExpired(token: JWTExtended): boolean {
  if (!token?.iat) return true;
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = token.iat + (60 * 60 * 12); // 12 hours in seconds
  return currentTime >= expirationTime;
}

// Helper function to check if token is valid
function isValidToken(token: JWTExtended | null): token is JWTExtended & { user: NonNullable<JWTExtended['user']> } {
  if (!token) return false;
  if (isTokenExpired(token)) return false;
  if (!token.user?.role) return false;
  if (!token.user?.id) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  try {
    // Skip middleware for API routes and auth session endpoint
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    const token: JWTExtended | null = await getToken({
      req: request,
      secret: environment.AUTH_SECRET,
    });

    const { pathname } = request.nextUrl;

    // Handle root path - ALLOW ACCESS TO HOMEPAGE WITHOUT AUTH
    if (pathname === "/") {
      return NextResponse.next(); // Allow access to homepage without authentication
    }

    // Handle auth pages (login/register)
    if (pathname.startsWith("/auth")) {
      // For register page, redirect if we have a valid token
      if (pathname === "/auth/register" && isValidToken(token)) {
        return NextResponse.redirect(new URL(getDashboardUrl(token.user.role), request.url));
      }

      // Special cases that don't require redirection
      if (pathname === "/auth/register/success" ||
          pathname === "/auth/activation") {
        return NextResponse.next();
      }

      // Handle student-data page
      if (pathname === "/auth/student-data") {
        // Allow access to student-data page without authentication
        // The page itself will validate the email parameter
        return NextResponse.next();
      }

      // For login page, only redirect if we have a valid token
      if (pathname === "/auth/login" && isValidToken(token)) {
        return NextResponse.redirect(new URL(getDashboardUrl(token.user.role), request.url));
      }

      return NextResponse.next();
    }

    // Handle protected routes
    const protectedRoutes = {
      admin: pathname.startsWith("/admin"),
      guru: pathname.startsWith("/guru"),
      murid: pathname.startsWith("/murid"),
    };

    const isProtectedRoute = Object.values(protectedRoutes).some(Boolean);

    if (isProtectedRoute) {
      // Check if token is valid
      if (!isValidToken(token)) {
        const url = new URL("/auth/login", request.url);
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
      }

      // Get the current path section (admin/guru/murid)
      const currentSection = pathname.split('/')[1];  // This will get 'admin' from '/admin/dashboard'
      const userRole = token.user.role;

      // If trying to access a protected section
      if (currentSection === 'admin' || currentSection === 'guru' || currentSection === 'murid') {
        // If user tries to access a section they don't have access to
        if (currentSection !== userRole) {
          return NextResponse.redirect(new URL(getDashboardUrl(userRole), request.url));
        }

        // Handle root paths redirect (e.g., /admin -> /admin/dashboard)
        if (pathname === `/${userRole}`) {
          return NextResponse.redirect(new URL(`/${userRole}/dashboard`, request.url));
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    // On error, redirect to login
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};
