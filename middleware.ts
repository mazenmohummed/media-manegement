// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // 1. Define the Onboarding path
    const isOnboardingPage = pathname === "/onboarding";

    // 2. The "Redirect to Onboarding" Logic
    // If they are logged in BUT have no agencyId, and AREN'T already on onboarding...
    if (token && !token.agencyId && !isOnboardingPage) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // 3. The "Already Finished" Logic
    // If they HAVE an agencyId but try to go back to /onboarding, send them to dashboard
    if (token?.agencyId && isOnboardingPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // This ensures the middleware only triggers for authenticated users
      authorized: ({ token }) => !!token,
    },
  }
);

// 2. The Secure Matcher
export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/onboarding",        // <--- Essential: Must be here to check token status
    "/api/finance/:path*",
    "/api/projects/:path*",
    "/api/employees/:path*",
    "/api/attendance/:path*",
  ],
};