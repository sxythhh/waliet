import { NextRequest, NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const auth = await getDualAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { email } = updateEmailSchema.parse(body);

    console.log("[Update Email] User requesting email update:", {
      userId: auth.dbUser.id,
      newEmail: email,
      currentEmail: auth.dbUser.email,
    });

    // Check if email is already in use by another account
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: auth.dbUser.id },
      },
    });

    if (existingUser) {
      // Email already exists on another account
      // Check if we should link these accounts
      if (
        (existingUser.whopUserId && !auth.dbUser.whopUserId) ||
        (existingUser.supabaseUserId && !auth.dbUser.supabaseUserId)
      ) {
        // This is a linking scenario - merge accounts
        console.log("[Update Email] Linking accounts:", {
          currentUserId: auth.dbUser.id,
          targetUserId: existingUser.id,
          email,
        });

        // Update the existing user with the current user's auth IDs
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            whopUserId: auth.dbUser.whopUserId || existingUser.whopUserId,
            supabaseUserId: auth.dbUser.supabaseUserId || existingUser.supabaseUserId,
            username: auth.dbUser.username || existingUser.username,
            name: auth.dbUser.name || existingUser.name,
            avatar: auth.dbUser.avatar || existingUser.avatar,
          },
        });

        // Delete the current user record (data is now on the linked account)
        await prisma.user.delete({
          where: { id: auth.dbUser.id },
        });

        return NextResponse.json({
          success: true,
          message: "Accounts linked successfully",
          linkedUserId: existingUser.id,
        });
      }

      return NextResponse.json(
        { error: "Email already in use by another account" },
        { status: 400 }
      );
    }

    // Email is available, update user
    const updatedUser = await prisma.user.update({
      where: { id: auth.dbUser.id },
      data: { email },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
      },
    });

    console.log("[Update Email] Email updated successfully:", {
      userId: updatedUser.id,
      email: updatedUser.email,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("[Update Email] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}
