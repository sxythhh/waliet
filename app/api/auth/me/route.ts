import { NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";

export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ user: null, dbUser: null }, { status: 401 });
    }

    return NextResponse.json({
      user: auth.user,
      dbUser: auth.dbUser,
    });
  } catch (error) {
    console.error("[/api/auth/me] Error:", error);
    return NextResponse.json(
      { error: "Failed to get user", user: null, dbUser: null },
      { status: 500 }
    );
  }
}
