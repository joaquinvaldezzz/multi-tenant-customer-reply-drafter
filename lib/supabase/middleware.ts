import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Active workspace / tenant resolution helper
  const activeWorkspaceId =
    request.cookies.get("active_workspace_id")?.value ?? request.headers.get("x-workspace-id");

  if (activeWorkspaceId) {
    supabaseResponse.headers.set("x-workspace-id", activeWorkspaceId);
  }

  if (user) {
    supabaseResponse.headers.set("x-user-id", user.id);
  }

  return { supabaseResponse, user, supabase };
}
