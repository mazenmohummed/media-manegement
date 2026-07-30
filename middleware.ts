// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    const isApiRoute = pathname.startsWith("/api");
    const isOnboardingPage = pathname === "/onboarding";

    // 1. Un-boarded users hitting page routes -> redirect to /onboarding
    if (token && !token.agencyId && !isOnboardingPage && !isApiRoute) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // 2. API Routes -> never redirect, let authorization & route helpers manage 401/403
    if (isApiRoute) {
      return NextResponse.next();
    }

    // 3. Fully onboarded users trying to revisit onboarding -> redirect to /dashboard
    if (token?.agencyId && isOnboardingPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protect dashboard, onboarding, and ALL API endpoints except /api/auth/*
     * and static assets.
     */
    "/dashboard/:path*",
    "/onboarding",
    "/api/((?!auth).*)",
  ],
};