import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Parse state parameter to get return_url AND code_verifier
  let returnUrl = "/browse";
  let codeVerifier: string | null = null;

  if (state) {
    try {
      const stateData = JSON.parse(atob(state));
      returnUrl = stateData.return_url || returnUrl;
      codeVerifier = stateData.code_verifier || null;
    } catch (e) {
      console.error("Failed to parse state parameter:", e);
    }
  }

  if (error) {
    const errorReturnUrl = returnUrl.includes("?") ? returnUrl : `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    return NextResponse.redirect(
      `${errorReturnUrl}?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    const errorReturnUrl = returnUrl.includes("?") ? returnUrl : `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    return NextResponse.redirect(
      `${errorReturnUrl}?error=no_code`
    );
  }

  if (!codeVerifier) {
    console.error("Missing code_verifier cookie");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=missing_code_verifier`
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whop/callback`;

    console.log("Token exchange request:", {
      code: code?.substring(0, 20) + "...",
      redirect_uri: redirectUri,
      client_id: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      client_secret_present: !!process.env.WHOP_CLIENT_SECRET,
      client_secret_first5: process.env.WHOP_CLIENT_SECRET?.substring(0, 5),
      code_verifier_length: codeVerifier.length,
      code_verifier_first10: codeVerifier.substring(0, 10),
    });

    // Exchange code for access token - confidential client per docs
    // Uses Authorization header, NO client_id in body
    const tokenResponse = await fetch("https://api.whop.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${process.env.WHOP_CLIENT_SECRET}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      console.error("Request details:", {
        client_id: process.env.NEXT_PUBLIC_WHOP_APP_ID,
        redirect_uri: redirectUri,
        app_url: process.env.NEXT_PUBLIC_APP_URL,
        code_verifier_length: codeVerifier?.length,
        code_verifier_first10: codeVerifier?.substring(0, 10),
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 200))}`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from OAuth userinfo endpoint (includes email with email scope)
    const userResponse = await fetch("https://api.whop.com/oauth/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("Userinfo fetch failed:", errorText);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=user_fetch_failed`
      );
    }

    const userData = await userResponse.json();
    console.log("[Whop OAuth] User data from /oauth/userinfo:", {
      sub: userData.sub,
      email: userData.email,
      name: userData.name,
      username: userData.preferred_username,
    });

    // OAuth userinfo returns:
    // - sub: Whop user ID (user_xxx)
    // - email: user's email (if email scope granted)
    // - name: display name
    // - preferred_username: username
    // - picture: profile picture URL
    const whopUserId = userData.sub;
    const email = userData.email;
    const name = userData.name;
    const username = userData.preferred_username;
    const avatar = userData.picture;

    // Sync user to database with email-based account linking
    await syncWhopOAuthUser({
      whopUserId,
      email,
      name,
      username,
      avatar,
    });

    // Create response with redirect (returnUrl already parsed from state above)
    const response = NextResponse.redirect(
      returnUrl.startsWith("http") ? returnUrl : `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}`
    );

    // Set the Whop token cookie for authentication
    response.cookies.set("whop-dev-user-token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Clear the logged-out flag since user is explicitly logging in via Whop
    response.cookies.delete("waliet-logged-out");

    return response;
  } catch (error) {
    console.error("Whop OAuth error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_error`
    );
  }
}

/**
 * Sync Whop OAuth user to database with email-based account linking
 *
 * Strategy:
 * 1. Check if user exists by whopUserId (already linked)
 * 2. If not, check if user exists by email (Supabase account)
 * 3. If email match found, link Whop ID to existing account
 * 4. If no match, create new user
 */
async function syncWhopOAuthUser(data: {
  whopUserId: string;
  email: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
}) {
  const { whopUserId, email, name, username, avatar } = data;

  // First, check if user already exists by Whop ID
  const existingWhopUser = await prisma.user.findUnique({
    where: { whopUserId },
    include: { sellerProfile: true },
  });

  if (existingWhopUser) {
    // User already linked, just update profile info
    console.log("[Whop OAuth] User already exists with Whop ID:", whopUserId);
    await prisma.user.update({
      where: { id: existingWhopUser.id },
      data: {
        name: name || existingWhopUser.name,
        avatar: avatar || existingWhopUser.avatar,
        email: email || existingWhopUser.email,
      },
    });
    return existingWhopUser;
  }

  // User doesn't exist by Whop ID, check if Supabase account exists with same email
  // Try email-based linking first (most reliable)
  if (email) {
    const existingSupabaseUser = await prisma.user.findFirst({
      where: {
        email,
        supabaseUserId: { not: null },
        whopUserId: null, // Make sure not already linked to another Whop account
      },
      include: { sellerProfile: true },
    });

    if (existingSupabaseUser) {
      // Found existing Supabase account with same email - link accounts!
      console.log("[Whop OAuth] Linking Whop ID to existing Supabase account via email:", {
        email,
        whopUserId,
        existingUserId: existingSupabaseUser.id,
      });

      const linkedUser = await prisma.user.update({
        where: { id: existingSupabaseUser.id },
        data: {
          whopUserId, // Link the Whop ID
          username, // Add Whop username
          name: name || existingSupabaseUser.name,
          avatar: avatar || existingSupabaseUser.avatar,
        },
        include: { sellerProfile: true },
      });

      return linkedUser;
    }
  }

  // Try username-based linking as fallback
  if (username) {
    const existingUsernameUser = await prisma.user.findFirst({
      where: {
        username,
        whopUserId: null,
      },
      include: { sellerProfile: true },
    });

    if (existingUsernameUser) {
      console.log("[Whop OAuth] Linking Whop ID to existing account via username (fallback):", {
        username,
        whopUserId,
        existingUserId: existingUsernameUser.id,
      });

      const linkedUser = await prisma.user.update({
        where: { id: existingUsernameUser.id },
        data: {
          whopUserId,
          email: email || existingUsernameUser.email,
          name: name || existingUsernameUser.name,
          avatar: avatar || existingUsernameUser.avatar,
        },
        include: { sellerProfile: true },
      });

      return linkedUser;
    }
  }

  // No existing account found - create new user
  console.log("[Whop OAuth] Creating new user with Whop ID:", whopUserId);
  const newUser = await prisma.user.create({
    data: {
      whopUserId,
      username,
      email,
      name,
      avatar,
    },
    include: { sellerProfile: true },
  });

  // Create seller profile for new user (everyone is a seller by default)
  await prisma.sellerProfile.create({
    data: {
      userId: newUser.id,
      hourlyRate: 0,
      isActive: true,
    },
  });

  return newUser;
}
