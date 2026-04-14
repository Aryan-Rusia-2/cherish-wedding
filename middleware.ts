import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection is enforced client-side via DashboardShell + Firebase auth,
 * because session cookies are not configured for Firebase in this MVP.
 * This middleware reserves the matcher for future session-based auth.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/wedding/:path*"],
};
