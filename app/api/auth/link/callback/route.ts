import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { mergeAccounts, linkProviderToUser } from "@/lib/account-merge";

/**
 * Account linking callback
 * Handles OAuth callback and performs account linking or merge
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  // Get the current user ID from the cookie
  const cookieStore = await cookies();
  const linkUserId = cookieStore.get("waliet-link-user-id")?.value;

  // Clear the linking cookie
  const clearLinkCookieResponse = () => {
    const response = NextResponse.redirect(
      `${baseUrl}/dashboard?tab=settings`
    );
    response.cookies.set("waliet-link-user-id", "", {
      maxAge: 0,
      path: "/",
    });
    return response;
  };

  if (!linkUserId) {
    console.error("[Link Callback] No link user ID in cookie");
    const response = NextResponse.redirect(
      `${baseUrl}/dashboard?tab=settings&error=link_expired`
    );
    return response;
  }

  // Verify the user exists
  const currentUser = await db.user.findById(linkUserId);

  if (!currentUser) {
    console.error("[Link Callback] User not found:", linkUserId);
    return clearLinkCookieResponse();
  }

  // Handle Google/Supabase OAuth
  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.user) {
        console.error("[Link Callback] Code exchange failed:", error);
        const response = NextResponse.redirect(
          `${baseUrl}/dashboard?tab=settings&error=oauth_failed`
        );
        response.cookies.set("waliet-link-user-id", "", {
          maxAge: 0,
          path: "/",
        });
        return response;
      }

      const supabaseUser = data.user;
      const supabaseUserId = supabaseUser.id;
      const email = supabaseUser.email;

      console.log("[Link Callback] Supabase user:", {
        id: supabaseUserId,
        email,
      });

      // Check if this Supabase user is already linked to another account
      const existingLinkedUser = await db.user.findBySupabaseUserId(supabaseUserId);

      if (existingLinkedUser) {
        if (existingLinkedUser.id === linkUserId) {
          // Already linked to this user - no action needed
          console.log("[Link Callback] Already linked to this user");
          const response = NextResponse.redirect(
            `${baseUrl}/dashboard?tab=settings&success=already_linked`
          );
          response.cookies.set("waliet-link-user-id", "", {
            maxAge: 0,
            path: "/",
          });
          return response;
        }

        // Supabase account belongs to a different user - need to merge
        console.log("[Link Callback] Merging accounts:", {
          source: linkUserId,
          target: existingLinkedUser.id,
        });

        try {
          // Merge current user (Whop-only) INTO existing Supabase user
          // This keeps the Supabase user as primary since it has email
          await mergeAccounts(linkUserId, existingLinkedUser.id);

          // Sign out the old session and redirect to login
          // User needs to re-authenticate as the merged account
          await supabase.auth.signOut();

          const response = NextResponse.redirect(
            `${baseUrl}/dashboard?tab=settings&success=accounts_merged`
          );
          response.cookies.set("waliet-link-user-id", "", {
            maxAge: 0,
            path: "/",
          });
          // Clear Whop OAuth cookie too since the old user is gone
          response.cookies.set("whop_oauth_user", "", {
            maxAge: 0,
            path: "/",
          });
          return response;
        } catch (mergeError) {
          console.error("[Link Callback] Merge failed:", mergeError);
          const response = NextResponse.redirect(
            `${baseUrl}/dashboard?tab=settings&error=merge_failed`
          );
          response.cookies.set("waliet-link-user-id", "", {
            maxAge: 0,
            path: "/",
          });
          return response;
        }
      }

      // No existing linked user - just add supabaseUserId to current user
      console.log("[Link Callback] Linking Supabase to user:", linkUserId);
      await linkProviderToUser(linkUserId, "supabase", supabaseUserId, email);

      const response = NextResponse.redirect(
        `${baseUrl}/dashboard?tab=settings&success=account_linked`
      );
      response.cookies.set("waliet-link-user-id", "", {
        maxAge: 0,
        path: "/",
      });
      return response;
    } catch (error) {
      console.error("[Link Callback] Unexpected error:", error);
      const response = NextResponse.redirect(
        `${baseUrl}/dashboard?tab=settings&error=link_failed`
      );
      response.cookies.set("waliet-link-user-id", "", {
        maxAge: 0,
        path: "/",
      });
      return response;
    }
  }

  // No code - might be from Whop OAuth (handled differently)
  // For Whop linking, check if the Whop OAuth callback already set the whop_oauth_user cookie
  const whopOAuthCookie = cookieStore.get("whop_oauth_user");
  if (whopOAuthCookie) {
    try {
      const whopUserData = JSON.parse(whopOAuthCookie.value);
      const whopUserId = whopUserData.whopUserId;

      if (!whopUserId) {
        console.error("[Link Callback] No Whop user ID in cookie");
        return clearLinkCookieResponse();
      }

      // Check if this Whop user is already linked
      const existingWhopUser = await db.user.findByWhopUserId(whopUserId);

      if (existingWhopUser) {
        if (existingWhopUser.id === linkUserId) {
          // Already linked to this user
          const response = NextResponse.redirect(
            `${baseUrl}/dashboard?tab=settings&success=already_linked`
          );
          response.cookies.set("waliet-link-user-id", "", {
            maxAge: 0,
            path: "/",
          });
          return response;
        }

        // Whop account belongs to different user - merge
        // Keep the Whop user since it might have purchases
        await mergeAccounts(linkUserId, existingWhopUser.id);

        const response = NextResponse.redirect(
          `${baseUrl}/dashboard?tab=settings&success=accounts_merged`
        );
        response.cookies.set("waliet-link-user-id", "", {
          maxAge: 0,
          path: "/",
        });
        return response;
      }

      // No existing Whop user - link to current user
      await linkProviderToUser(linkUserId, "whop", whopUserId, whopUserData.email);

      const response = NextResponse.redirect(
        `${baseUrl}/dashboard?tab=settings&success=account_linked`
      );
      response.cookies.set("waliet-link-user-id", "", {
        maxAge: 0,
        path: "/",
      });
      return response;
    } catch (error) {
      console.error("[Link Callback] Whop link error:", error);
      return clearLinkCookieResponse();
    }
  }

  // No OAuth data found
  console.error("[Link Callback] No OAuth data found");
  const response = NextResponse.redirect(
    `${baseUrl}/dashboard?tab=settings&error=no_oauth_data`
  );
  response.cookies.set("waliet-link-user-id", "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}
