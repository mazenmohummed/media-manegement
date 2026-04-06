import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// middleware.ts

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    const isApiRoute = pathname.startsWith("/api");
    const isOnboardingPage = pathname === "/onboarding";

    // 1. Redirect to Onboarding: ONLY for Pages, NEVER for API
    if (token && !token.agencyId && !isOnboardingPage && !isApiRoute) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // 2. STOP: If it's an API route, do not allow any redirects to happen here.
    // If the token is missing, withAuth's 'authorized' callback handles the 401.
    if (isApiRoute) {
      return NextResponse.next(); 
    }

    // 3. Prevent Re-onboarding for Pages
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
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth internal routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/dashboard/:path*", 
    "/onboarding",
    "/api/finance/:path*",
    "/api/projects/:path*",
    "/api/employees/:path*",
    "/api/attendance/:path*",
  ],
};
