import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // Sign out of Supabase
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true });

    // Clear all Whop-related cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    for (const cookie of allCookies) {
      if (cookie.name.startsWith("whop-") || cookie.name.startsWith("whop_")) {
        response.cookies.delete(cookie.name);
      }
    }

    // Also clear specific known Whop SDK cookies
    response.cookies.delete("whop-dev-user-token");
    response.cookies.delete("whop-core.ssk");
    response.cookies.delete("whop-core.uid-token");
    response.cookies.delete("whop-core.user-id");

    // Set logged-out flag to bypass DEV_WHOP_USER_ID in development
    response.cookies.set("waliet-logged-out", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
