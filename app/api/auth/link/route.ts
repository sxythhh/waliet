import { NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Initiate account linking flow
 * GET /api/auth/link?provider=google|whop
 *
 * Stores current user ID in a cookie, then redirects to OAuth provider
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Validate provider
  if (!provider || !["google", "whop"].includes(provider)) {
    return NextResponse.json(
      { error: "Invalid provider. Use 'google' or 'whop'" },
      { status: 400 }
    );
  }

  // Get current user - must be authenticated
  const auth = await getDualAuthUser();
  if (!auth) {
    return NextResponse.redirect(`${baseUrl}/login?error=not_authenticated`);
  }

  // Check if already linked
  if (provider === "google" && auth.dbUser.supabaseUserId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=settings&error=already_linked&provider=google`
    );
  }
  if (provider === "whop" && auth.dbUser.whopUserId) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard?tab=settings&error=already_linked&provider=whop`
    );
  }

  if (provider === "whop") {
    // For Whop, pass the link user ID directly through OAuth state
    return NextResponse.redirect(
      `${baseUrl}/api/auth/whop?return_url=/dashboard?tab=settings&link_user_id=${auth.dbUser.id}`
    );
  }

  // For Google/Supabase, store current user ID in a cookie for the callback to use
  const response = NextResponse.redirect(await getGoogleOAuthUrl(baseUrl!));

  response.cookies.set("waliet-link-user-id", auth.dbUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes - short-lived for security
    path: "/",
  });

  return response;
}

/**
 * Generate Google OAuth URL for account linking
 */
async function getGoogleOAuthUrl(baseUrl: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl}/api/auth/link/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw new Error("Failed to generate OAuth URL");
  }

  return data.url;
}
