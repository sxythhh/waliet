import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Generate PKCE code verifier and challenge per RFC 7636
 * - verifier: 32 random bytes, base64url encoded (43 chars)
 * - challenge: SHA256(verifier), base64url encoded (43 chars)
 */
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

/**
 * Generate a random nonce for OpenID Connect
 */
function generateNonce() {
  return crypto.randomBytes(16).toString("base64url");
}

/**
 * Initiate Whop OAuth flow
 * Redirects user to Whop authorization page
 *
 * Query params:
 * - return_url: Where to redirect after auth (default: /browse)
 * - link_user_id: User ID to link Whop account to (for account linking flow)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("return_url") || "/browse";
  const linkUserId = searchParams.get("link_user_id"); // For account linking flow

  const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whop/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "Whop app not configured" }, { status: 500 });
  }

  // Generate PKCE values
  const { verifier, challenge } = generatePKCE();

  // Generate nonce for OpenID Connect (required when using openid scope)
  const nonce = generateNonce();

  // Generate state for CSRF protection
  const stateValue = crypto.randomBytes(16).toString("base64url");

  // Build state object with all values we need to recover in callback
  const stateData: Record<string, string> = {
    s: stateValue,        // CSRF state
    v: verifier,          // PKCE verifier
    n: nonce,             // OpenID nonce
    r: returnUrl,         // Return URL
  };

  // Include link user ID if this is an account linking flow
  if (linkUserId) {
    stateData.l = linkUserId; // Link user ID
  }

  const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

  // Build authorization URL per Whop docs
  // Endpoint: https://api.whop.com/oauth/authorize
  const authUrl = new URL("https://api.whop.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("nonce", nonce);

  console.log("[Whop OAuth] Starting auth flow:", {
    client_id: clientId,
    redirect_uri: redirectUri,
    verifier_first10: verifier.substring(0, 10),
    challenge_first10: challenge.substring(0, 10),
  });

  return NextResponse.redirect(authUrl.toString());
}
