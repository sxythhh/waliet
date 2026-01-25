import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
  let returnUrl = "/dashboard";
  let codeVerifier: string | null = null;

  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
      returnUrl = stateData.r || "/dashboard";
      codeVerifier = stateData.v || null;
    } catch {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
    }
  }

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !codeVerifier) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/whop/callback`;
    const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID!;
    const apiKey = process.env.WHOP_API_KEY;

    // Token exchange
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
      return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info
    const userResponse = await fetch("https://api.whop.com/oauth/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/login?error=userinfo_failed`);
    }

    const userData = await userResponse.json();

    // Sync user to database
    const dbUser = await syncWhopUser({
      whopUserId: userData.sub,
      email: userData.email,
      name: userData.name,
      username: userData.preferred_username,
      avatar: userData.picture,
    });

    // Build redirect response
    const finalUrl = returnUrl.startsWith("http") ? returnUrl : `${baseUrl}${returnUrl}`;
    const response = NextResponse.redirect(finalUrl);

    // Set auth token cookie
    response.cookies.set("whop-dev-user-token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // Set user data cookie for dual-auth
    response.cookies.set("whop_oauth_user", JSON.stringify({
      id: dbUser.id,
      whopUserId: userData.sub,
      name: userData.name,
      email: userData.email,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
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

async function syncWhopUser(data: {
  whopUserId: string;
  email: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
}) {
  const { whopUserId, email, name, username, avatar } = data;

  // Check if user exists by Whop ID
  const existingUser = await db.user.findByWhopUserId(whopUserId);

  if (existingUser) {
    return db.user.update(existingUser.id, {
      name: name || existingUser.name,
      avatar: avatar || existingUser.avatar,
      email: email || existingUser.email,
    });
  }

  // Try to link by email
  if (email) {
    const emailUser = await db.user.findByEmailWithoutWhopId(email);
    if (emailUser) {
      return db.user.update(emailUser.id, {
        whopUserId,
        username: username || emailUser.username,
        name: name || emailUser.name,
        avatar: avatar || emailUser.avatar,
      });
    }
  }

  // Create new user
  return db.user.create({
    whopUserId,
    username,
    email,
    name,
    avatar,
  });
}
