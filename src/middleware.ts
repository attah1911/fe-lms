import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { JWTExtended } from "./types/Auth";
import { getToken } from "next-auth/jwt";
import environment from "./config/environment";

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

function isTokenExpired(token: JWTExtended): boolean {
  if (!token?.iat) return true;
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = token.iat + (60 * 60 * 12);
  return currentTime >= expirationTime;
}

function isValidToken(token: JWTExtended | null): token is JWTExtended & { user: NonNullable<JWTExtended['user']> } {
  if (!token) return false;
  if (isTokenExpired(token)) return false;
  if (!token.user?.role) return false;
  if (!token.user?.id) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  try {
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    const token: JWTExtended | null = await getToken({
      req: request,
      secret: environment.AUTH_SECRET,
    });

    const { pathname } = request.nextUrl;

    if (pathname === "/") {
      return NextResponse.next();
    }

    if (pathname.startsWith("/auth")) {
      if (pathname === "/auth/register" && isValidToken(token)) {
        return NextResponse.redirect(new URL(getDashboardUrl(token.user.role), request.url));
      }

      if (pathname === "/auth/register/success" ||
          pathname === "/auth/activation") {
        return NextResponse.next();
      }

      if (pathname === "/auth/student-data") {
        return NextResponse.next();
      }

      if (pathname === "/auth/login" && isValidToken(token)) {
        return NextResponse.redirect(new URL(getDashboardUrl(token.user.role), request.url));
      }

      return NextResponse.next();
    }

    const protectedRoutes = {
      admin: pathname.startsWith("/admin"),
      guru: pathname.startsWith("/guru"),
      murid: pathname.startsWith("/murid"),
    };

    const isProtectedRoute = Object.values(protectedRoutes).some(Boolean);

    if (isProtectedRoute) {
      if (!isValidToken(token)) {
        const url = new URL("/auth/login", request.url);
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
      }

      const currentSection = pathname.split('/')[1];
      const userRole = token.user.role;

      if (currentSection === 'admin' || currentSection === 'guru' || currentSection === 'murid') {
        if (currentSection !== userRole) {
          return NextResponse.redirect(new URL(getDashboardUrl(userRole), request.url));
        }

        if (pathname === `/${userRole}`) {
          return NextResponse.redirect(new URL(`/${userRole}/dashboard`, request.url));
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};
