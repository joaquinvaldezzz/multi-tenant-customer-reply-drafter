import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Better auth stores session token in cookie "better-auth.session_token"
  const sessionCookie =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const hasSession = Boolean(sessionCookie);

  // Protect /dashboard, /workspaces, /knowledge-base
  const isProtectedRoute =
    pathname.startsWith("/workspaces") ||
    pathname.startsWith("/knowledge-base") ||
    pathname.startsWith("/dashboard");

  if (isProtectedRoute && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated user away from /login or /signup
  if ((pathname === "/login" || pathname === "/signup") && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/knowledge-base";
    return NextResponse.redirect(url);
  }

  // Active workspace header propagation
  const response = NextResponse.next();
  const activeWorkspaceId =
    request.cookies.get("active_workspace_id")?.value ?? request.headers.get("x-workspace-id");
  if (activeWorkspaceId) {
    response.headers.set("x-workspace-id", activeWorkspaceId);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
