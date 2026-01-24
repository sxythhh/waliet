import { getDualAuthUser } from "@/lib/dual-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdError, MdLock } from "react-icons/md";
import { SellerProfileView } from "@/components/dashboard/SellerProfileView";
import Link from "next/link";

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ action?: string; experienceId?: string }>;
}

export default async function StandaloneSellerPage({
  params,
  searchParams,
}: PageProps) {
  const { userId } = await params;
  const { action, experienceId } = await searchParams;

  const auth = await getDualAuthUser();

  if (!auth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MdLock className="w-6 h-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Sign In Required
            </h1>
            <p className="text-muted-foreground mb-6">
              Sign in to view seller profiles and purchase hours.
            </p>
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dbUser: user, user: authUser } = auth;

  // Fetch the seller's profile
  const seller = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sellerProfile: true,
      reviewsReceived: {
        where: { reviewType: "BUYER_TO_SELLER" },
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!seller || !seller.sellerProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MdError className="w-6 h-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Seller Not Found
            </h1>
            <p className="text-muted-foreground">
              This seller profile doesn&apos;t exist or is no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if the viewer already has hours with this seller
  const existingBalance = await prisma.walletBalance.findUnique({
    where: {
      holderId_sellerId: {
        holderId: user.id,
        sellerId: userId,
      },
    },
  });

  // If we don't have an experienceId, we need to handle the case where purchases aren't possible
  // For now, we'll use a fallback experienceId or show a message
  const effectiveExperienceId = experienceId || "standalone";

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/browse" className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">Waliet</span>
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {authUser.name || "User"}
            </span>
            {authUser.avatar && (
              <img
                src={authUser.avatar}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            )}
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <SellerProfileView
        experienceId={effectiveExperienceId}
        seller={{
          id: seller.id,
          name: seller.name,
          avatar: seller.avatar,
          sellerProfile: {
            id: seller.sellerProfile.id,
            hourlyRate: seller.sellerProfile.hourlyRate,
            bio: seller.sellerProfile.bio,
            tagline: seller.sellerProfile.tagline,
            averageRating: seller.sellerProfile.averageRating,
            totalSessionsCompleted: seller.sellerProfile.totalSessionsCompleted,
            totalReviews: seller.sellerProfile.totalReviews,
            isVerified: seller.sellerProfile.isVerified,
          },
        }}
        reviews={seller.reviewsReceived.map((r) => ({
          id: r.id,
          rating: r.rating,
          text: r.text,
          createdAt: r.createdAt.toISOString(),
          author: r.isAnonymous
            ? null
            : { id: r.author.id, name: r.author.name, avatar: r.author.avatar },
        }))}
        existingBalance={existingBalance?.balanceUnits || 0}
        isOwnProfile={user.id === userId}
        showBuyModal={action === "buy" && !!experienceId}
        isStandalone={true}
        isAuthenticated={true}
      />
    </div>
  );
}
