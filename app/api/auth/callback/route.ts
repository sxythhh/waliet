import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/browse";

  const supabase = await createClient();

  // Handle PKCE flow (code exchange)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      // Clear the logged-out cookie on successful auth
      response.cookies.set("waliet-logged-out", "", {
        maxAge: 0,
        path: "/",
      });
      return response;
    }
    console.error("Code exchange error:", error);
  }

  // Handle token hash flow (magic link without PKCE)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email" | "magiclink",
    });

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set("waliet-logged-out", "", {
        maxAge: 0,
        path: "/",
      });
      return response;
    }
    console.error("Token hash verification error:", error);
  }

  // Return to login page with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
