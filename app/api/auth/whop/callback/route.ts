import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Whop OAuth callback handler
 * Exchanges authorization code for tokens and creates/updates user
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Parse state to recover verifier and return URL
  let returnUrl = "/browse";
  let codeVerifier: string | null = null;

  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
      returnUrl = stateData.r || "/browse";
      codeVerifier = stateData.v || null;
    } catch (e) {
      console.error("[Whop OAuth] Failed to parse state:", e);
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
    }
  }

  // Handle OAuth errors
  if (error) {
    console.error("[Whop OAuth] Authorization error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);
  }

  // Validate required params
  if (!code) {
    console.error("[Whop OAuth] Missing authorization code");
    return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
  }

  if (!codeVerifier) {
    console.error("[Whop OAuth] Missing code verifier from state");
    return NextResponse.redirect(`${baseUrl}/login?error=missing_verifier`);
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/whop/callback`;
    const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID!;
    const apiKey = process.env.WHOP_API_KEY;

    console.log("[Whop OAuth] Exchanging code for token:", {
      redirect_uri: redirectUri,
      client_id: clientId,
      code_first20: code.substring(0, 20),
      verifier_first10: codeVerifier.substring(0, 10),
      has_api_key: !!apiKey,
    });

    // Token exchange - use confidential client if API key is available
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // Add Authorization header for confidential clients
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const tokenResponse = await fetch("https://api.whop.com/oauth/token", {
      method: "POST",
      headers,
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[Whop OAuth] Token exchange failed:", errorData);
      return NextResponse.redirect(
        `${baseUrl}/login?error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 100))}`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log("[Whop OAuth] Token exchange successful");

    // Get user info
    const userResponse = await fetch("https://api.whop.com/oauth/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("[Whop OAuth] Userinfo failed:", errorText);
      return NextResponse.redirect(`${baseUrl}/login?error=userinfo_failed`);
    }

    const userData = await userResponse.json();
    console.log("[Whop OAuth] User info received:", {
      sub: userData.sub,
      email: userData.email,
      name: userData.name,
    });

    // Sync user to database
    const dbUser = await syncWhopUser({
      whopUserId: userData.sub,
      email: userData.email,
      name: userData.name,
      username: userData.preferred_username,
      avatar: userData.picture,
    });

    // Build redirect response
    const finalUrl = returnUrl.startsWith("http")
      ? returnUrl
      : `${baseUrl}${returnUrl}`;

    const response = NextResponse.redirect(finalUrl);

    // Set auth token cookie
    response.cookies.set("whop-dev-user-token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Set user data cookie for dual-auth to read
    response.cookies.set("whop_oauth_user", JSON.stringify({
      id: dbUser.id,
      whopUserId: userData.sub,
      name: userData.name,
      email: userData.email,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Clear logged-out flag
    response.cookies.delete("waliet-logged-out");

    return response;

  } catch (error) {
    console.error("[Whop OAuth] Unexpected error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_error`);
  }
}

/**
 * Sync Whop user to database with email-based account linking
 */
async function syncWhopUser(data: {
  whopUserId: string;
  email: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
}) {
  const { whopUserId, email, name, username, avatar } = data;

  // Check if user exists by Whop ID
  const existingUser = await prisma.user.findUnique({
    where: { whopUserId },
    include: { sellerProfile: true },
  });

  if (existingUser) {
    // Update existing user
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: name || existingUser.name,
        avatar: avatar || existingUser.avatar,
        email: email || existingUser.email,
      },
    });
  }

  // Try to link by email
  if (email) {
    const emailUser = await prisma.user.findFirst({
      where: { email, whopUserId: null },
    });

    if (emailUser) {
      return prisma.user.update({
        where: { id: emailUser.id },
        data: {
          whopUserId,
          username: username || emailUser.username,
          name: name || emailUser.name,
          avatar: avatar || emailUser.avatar,
        },
      });
    }
  }

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      whopUserId,
      username,
      email,
      name,
      avatar,
    },
  });

  // Create seller profile
  await prisma.sellerProfile.create({
    data: {
      userId: newUser.id,
      hourlyRate: 0,
      isActive: true,
    },
  });

  return newUser;
}
