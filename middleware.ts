import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify, JWTPayload } from "jose";

// 1. Strongly typed payload matching standard JWT / NextAuth session shapes
interface AuthUserPayload extends JWTPayload {
  userId?: string;
  agencyId?: string;
  role?: string;
}

// 2. Custom public routes outside the NextAuth namespace (if any)
const PUBLIC_API_ROUTES = [
  "/api/public",
  "/api/webhooks",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 🟢 CRITICAL FIX: Allow NextAuth sub-routes (/api/auth/*) and designated public endpoints
  // to bypass middleware auth gating so NextAuth can manage internal authentication requests.
  const isPublicApiRoute =
    pathname.startsWith("/api/auth/") ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api");
  const authHeader = req.headers.get("authorization");

  let userPayload: AuthUserPayload | null = null;

  // 3. Check for Bearer Token (Custom JWT / Mobile / API Clients)
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

  // 4. Fallback to NextAuth Session Cookie (Web Application)
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

  // 5. Unauthenticated Redirect / Error Block
  if (!userPayload) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 6. Onboarding Flow Redirect Guards
  const isOnboardingPage = pathname === "/onboarding";

  if (!userPayload.agencyId && !isOnboardingPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (userPayload.agencyId && isOnboardingPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 7. Context Injection into Request Headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", userPayload.userId || "");
  requestHeaders.set("x-agency-id", userPayload.agencyId || "");
  requestHeaders.set("x-user-role", userPayload.role || "");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// 8. Explicit Route Matcher Scope
export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/api/:path*"],
};