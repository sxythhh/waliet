import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// Generate PKCE code verifier and challenge
function generatePKCE() {
  // Generate random code verifier (43-128 characters)
  const verifier = crypto.randomBytes(32).toString("base64url");

  // Generate code challenge (SHA256 hash of verifier, base64url encoded)
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}

// Initiate Whop OAuth flow
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("return_url");

  const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whop/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "Whop app not configured" }, { status: 500 });
  }

  // Generate PKCE values
  const { verifier, challenge } = generatePKCE();

  // Use state parameter to pass return_url through OAuth flow
  const state = returnUrl ? btoa(JSON.stringify({ return_url: returnUrl })) : "";

  // Redirect to Whop OAuth authorization page
  const authUrl = new URL("https://whop.com/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  if (state) {
    authUrl.searchParams.set("state", state);
  }

  // Create response with redirect
  const response = NextResponse.redirect(authUrl.toString());

  // Store code verifier in cookie for use in callback
  response.cookies.set("whop_code_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return response;
}
