import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whopsdk, createCheckoutConfig } from "@/lib/whop-sdk";
import { getOrCreateUser } from "@/lib/auth";
import { createPurchaseSchema } from "@/lib/validations";
import { calculateFeeFromBps } from "@/lib/utils";
import { getEffectiveCommissionRates } from "@/lib/commissions";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    let buyer = null;
    let isStandaloneUser = false;

    // Check if user explicitly logged out of Whop (wants to use Supabase)
    const loggedOutCookie = request.cookies.get("waliet-logged-out")?.value;
    const skipWhopAuth = loggedOutCookie === "true";

    // Try Whop auth first (unless user explicitly logged out)
    if (!skipWhopAuth) {
      try {
        const { userId: whopUserId } = await whopsdk.verifyUserToken(
          request.headers
        );
        buyer = await getOrCreateUser(whopUserId);
      } catch {
        // Whop auth failed, will try Supabase below
      }
    }

    // If no Whop buyer, try Supabase
    if (!buyer) {
      const supabase = await createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      if (supabaseUser) {
        // Find or create user by supabaseUserId
        buyer = await prisma.user.findUnique({
          where: { supabaseUserId: supabaseUser.id },
          include: { sellerProfile: true },
        });

        if (!buyer) {
          buyer = await prisma.user.create({
            data: {
              supabaseUserId: supabaseUser.id,
              email: supabaseUser.email,
              name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
              avatar: supabaseUser.user_metadata?.avatar_url || null,
            },
            include: { sellerProfile: true },
          });
        }
        isStandaloneUser = true;
      }
    }

    if (!buyer) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sellerId, units, experienceId, companyId } =
      createPurchaseSchema.parse(body);

    // Verify seller exists and has a rate
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!seller || !seller.sellerProfile) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    if (!seller.sellerProfile.isActive) {
      return NextResponse.json(
        { error: "Seller is not accepting bookings" },
        { status: 400 }
      );
    }

    // Can't buy hours from yourself
    if (buyer.id === sellerId) {
      return NextResponse.json(
        { error: "Cannot purchase hours from yourself" },
        { status: 400 }
      );
    }

    // Calculate pricing
    const hourlyRateCents = seller.sellerProfile.hourlyRate;
    const pricePerUnit = Math.round(hourlyRateCents / 2); // 30-min unit price
    const totalAmount = pricePerUnit * units;

    // Get effective commission rates (seller-specific > community-specific > default)
    const commissionRates = await getEffectiveCommissionRates(sellerId, companyId);

    const platformFee = calculateFeeFromBps(totalAmount, commissionRates.platformFeeBps);
    const communityFee = calculateFeeFromBps(totalAmount, commissionRates.communityFeeBps);
    const sellerReceives = totalAmount - platformFee - communityFee;

    // Create pending purchase record
    const purchase = await prisma.purchase.create({
      data: {
        buyerId: buyer.id,
        sellerId,
        units,
        pricePerUnit,
        totalAmount,
        platformFee,
        communityFee,
        sellerReceives,
        status: "PENDING",
        communityId: companyId,
        experienceId,
      },
    });

    // Create Whop checkout config with plan for in-app purchase
    // Truncate name to fit Whop's 40 char limit
    const sellerDisplayName = (seller.name || "Seller").slice(0, 20);
    const hourLabel = units > 2 ? "Hours" : "Hour";

    console.log("[Checkout] Creating checkout config:", {
      buyerId: buyer.id,
      sellerId,
      totalAmount,
      units,
      isStandaloneUser,
    });

    const checkoutConfig = await createCheckoutConfig({
      name: `${units / 2} ${hourLabel} - ${sellerDisplayName}`.slice(0, 40),
      amountCents: totalAmount,
      currency: "usd",
      metadata: {
        type: "hour_purchase",
        purchaseId: purchase.id,
        buyerId: buyer.id,
        sellerId,
        units: String(units),
        pricePerUnit: String(pricePerUnit),
      },
    });

    console.log("[Checkout] Checkout config created:", checkoutConfig);

    // Update purchase with checkout config ID
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { whopCheckoutConfigId: checkoutConfig.id },
    });

    return NextResponse.json(
      {
        purchaseId: purchase.id,
        checkoutConfigId: checkoutConfig.id,
        planId: checkoutConfig.planId,
        purchaseUrl: checkoutConfig.purchaseUrl,
        totalAmount,
        platformFee,
        communityFee,
        sellerReceives,
        isStandaloneUser, // Use purchaseUrl redirect instead of in-app purchase
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating checkout:", error);

    if (error instanceof Error && error.message.includes("Zod")) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Return more detailed error in development
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error details:", errorMessage);

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "development"
          ? `Failed to create checkout: ${errorMessage}`
          : "Failed to create checkout"
      },
      { status: 500 }
    );
  }
}
