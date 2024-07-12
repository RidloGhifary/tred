import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/"]);

export default clerkMiddleware((auth, req: NextRequest) => {
  if (!auth().userId && isProtectedRoute(req)) {
    // Add custom logic to run before redirecting

    return auth().redirectToSignIn();
  }

  if (auth().userId && !isProtectedRoute(req)) {
    if (req.nextUrl.pathname === "/sign-in" && auth().userId) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
