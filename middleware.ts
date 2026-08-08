import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify, JWTPayload } from "jose";

interface AuthUserPayload extends JWTPayload {
  userId?: string;
  agencyId?: string;
  role?: string;
}

const PUBLIC_API_ROUTES = [
  "/api/public",
  "/api/webhooks",
  "/api/jobs/register-cron",
  "/api/jobs/heartbeat",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Instantly allow all NextAuth routes (/api/auth/*) and public API endpoints
  if (
    pathname.startsWith("/api/auth") ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api");
  const authHeader = req.headers.get("authorization");

  let userPayload: AuthUserPayload | null = null;

  // 2. Validate Bearer JWT Token (if present)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_ACCESS_SECRET || "fallback-JWT_ACCESS_SECRET-dev-only"
      );
      const { payload } = await jwtVerify(token, secret);
      userPayload = payload as AuthUserPayload;
    } catch {
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Invalid or expired access token" },
          { status: 401 }
        );
      }
    }
  }

  // 3. Fallback to NextAuth Cookie Session
  if (!userPayload) {
    const session = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (session) {
      userPayload = {
        userId: (session.id as string) || (session.sub as string),
        agencyId: session.agencyId as string,
        role: session.role as string,
      };
    }
  }

  // 4. Handle Unauthenticated Requests
  if (!userPayload) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Onboarding & Agency Guard
  const isOnboardingPage = pathname === "/onboarding";

  if (!userPayload.agencyId && !isOnboardingPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (userPayload.agencyId && isOnboardingPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 6. Inject Audit Context Headers for Node.js Runtime
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", userPayload.userId || "");
  requestHeaders.set("x-agency-id", userPayload.agencyId || "");
  requestHeaders.set("x-user-role", userPayload.role || "");

  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  requestHeaders.set("x-ip-address", ipAddress);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all requests EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (e.g., .png, .svg)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};