import { NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";

export const dynamic = "force-dynamic";

/**
 * Get current authenticated user
 * Used by dashboard to fetch user info
 */
export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: auth.user,
      dbUser: auth.dbUser,
    });
  } catch (error) {
    console.error("[/api/auth/me] Error:", error);
    return NextResponse.json({ user: null, error: "Internal error" }, { status: 500 });
  }
}
