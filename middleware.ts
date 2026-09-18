// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";
import { jwtVerify, JWTPayload } from "jose";

interface AuthUserPayload extends JWTPayload {
  userId?: string;
  agencyId?: string;
  role?: string;
}

type AuthToken = JWT & AuthUserPayload;

const PUBLIC_API_ROUTES = [
  "/api/public",
  "/api/webhooks",
  "/api/jobs/register-cron",
  "/api/jobs/heartbeat",
];

const PUBLIC_PAGES = [
  "/",
  "/login",
  "/onboarding",
  "/deploy",
  "/deploy/agency",
  "/deploy/operator",
  "/forgot-password",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Check if user is authenticated first (for redirects)
  // ✅ Cast the token so custom fields (agencyId, role, userId) are typed
  const session = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as AuthToken | null;

  // 2. Handle public paths
  if (
    PUBLIC_PAGES.some(
      (page) => pathname === page || pathname.startsWith(page + "/")
    ) ||
    pathname.startsWith("/api/auth") ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next")
  ) {
    // ✅ If authenticated and on / or /login, redirect to dashboard
    if (session && (pathname === "/" || pathname === "/login")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // ✅ If authenticated and on /onboarding but already has agency, redirect to dashboard
    if (session && session.agencyId && pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // ✅ Allow /deploy/agency even if not authenticated
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api");
  const authHeader = req.headers.get("authorization");

  let userPayload: AuthUserPayload | null = null;

  // 3. Validate Bearer JWT Token (if present)
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

  // 4. Fallback to session (already fetched above)
  // ✅ Use `userId` / `sub` — NextAuth JWTs do not have an `id` field
  if (!userPayload && session) {
    userPayload = {
      userId: (session.userId as string) || (session.sub as string) || undefined,
      agencyId: session.agencyId as string | undefined,
      role: session.role as string | undefined,
    };
  }

  // 5. Handle Unauthenticated Requests
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

  // 6. Onboarding & Agency Guard
  const isOnboardingPage = pathname === "/onboarding";

  if (!userPayload.agencyId && !isOnboardingPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (userPayload.agencyId && isOnboardingPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 7. Inject Audit Context Headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", userPayload.userId || "");
  requestHeaders.set("x-agency-id", userPayload.agencyId || "");
  requestHeaders.set("x-user-role", userPayload.role || "");
  requestHeaders.set("x-ip-address", getClientIp(req));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};