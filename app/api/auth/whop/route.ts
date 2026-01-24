import { NextResponse } from "next/server";

// Initiate Whop OAuth flow
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("return_url");

  const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whop/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "Whop app not configured" }, { status: 500 });
  }

  // Use state parameter to pass return_url through OAuth flow
  const state = returnUrl ? btoa(JSON.stringify({ return_url: returnUrl })) : "";

  // Redirect to Whop OAuth authorization page
  const authUrl = new URL("https://whop.com/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  if (state) {
    authUrl.searchParams.set("state", state);
  }

  return NextResponse.redirect(authUrl.toString());
}
