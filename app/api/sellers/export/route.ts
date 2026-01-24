import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop-sdk";
import { generateExport, ExportType } from "@/lib/export";
import { z } from "zod";

const exportSchema = z.object({
  type: z.enum(["purchases", "sessions", "analytics", "buyers"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * POST /api/sellers/export
 * Generate and download an export file
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: whopUserId } = await whopsdk.verifyUserToken(request.headers);

    const user = await prisma.user.findUnique({
      where: { whopUserId },
      include: { sellerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.sellerProfile) {
      return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, startDate, endDate } = exportSchema.parse(body);

    const dateRange = {
      start: startDate ? new Date(startDate) : undefined,
      end: endDate ? new Date(endDate) : undefined,
    };

    const { data, filename, contentType } = await generateExport(
      user.id,
      type as ExportType,
      dateRange
    );

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating export:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
