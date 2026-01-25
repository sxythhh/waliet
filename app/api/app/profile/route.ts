import { NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Get current user's profile
 */
export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = auth.dbUser;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        bannerUrl: null,
        email: user.email,
        bio: null,
        location: null,
        createdAt: user.createdAt,
        whopUserId: user.whopUserId,
        supabaseUserId: user.supabaseUserId,
        accountType: user.accountType,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("[/api/app/profile] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Update current user's profile
 */
export async function PATCH(request: Request) {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    // Update user
    const updateData: { name?: string } = {};
    if (name !== undefined) updateData.name = name;

    const updatedUser = await db.user.update(auth.dbUser.id, updateData);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        bannerUrl: null,
        email: updatedUser.email,
        bio: null,
        location: null,
        createdAt: updatedUser.createdAt,
        whopUserId: updatedUser.whopUserId,
        supabaseUserId: updatedUser.supabaseUserId,
        accountType: updatedUser.accountType,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("[/api/app/profile] PATCH Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
