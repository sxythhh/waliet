import { NextRequest, NextResponse } from "next/server";
import { getDualAuthUser } from "@/lib/dual-auth";
import { db } from "@/lib/db";

/**
 * GET /api/onboarding/progress
 * Load authenticated user's onboarding progress
 */
export async function GET() {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const completedTasks = await db.onboarding.getProgress(auth.dbUser.id);

    return NextResponse.json({ completedTasks, userId: auth.dbUser.id });
  } catch (error) {
    console.error("Error loading progress:", error);
    return NextResponse.json(
      { error: "Failed to load progress" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding/progress
 * Save authenticated user's onboarding progress
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getDualAuthUser();

    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { completedTasks, taskId } = body;

    // If taskId is provided, toggle it
    if (taskId) {
      const newProgress = await db.onboarding.toggleTask(auth.dbUser.id, taskId);
      return NextResponse.json({ success: true, completedTasks: newProgress });
    }

    // Otherwise, save the full list
    if (!Array.isArray(completedTasks)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    await db.onboarding.saveProgress(auth.dbUser.id, completedTasks);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
