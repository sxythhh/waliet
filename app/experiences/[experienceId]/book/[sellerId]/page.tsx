import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle } from "lucide-react";
import { BookingForm } from "@/components/booking/BookingForm";

interface PageProps {
  params: Promise<{ experienceId: string; sellerId: string }>;
}

export default async function BookSessionPage({ params }: PageProps) {
  const { experienceId, sellerId } = await params;

  const auth = await getAuthenticatedUser();

  if (!auth) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Authentication Required"
        description="Please access this page through your Whop community."
      />
    );
  }

  // Can't book with yourself
  if (auth.user.id === sellerId) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Cannot Book With Yourself"
        description="You cannot book a session with yourself."
      />
    );
  }

  // Fetch the seller's profile
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    include: {
      sellerProfile: true,
    },
  });

  if (!seller || !seller.sellerProfile) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Seller Not Found"
        description="This seller profile doesn't exist or is no longer available."
      />
    );
  }

  if (!seller.sellerProfile.isActive) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Seller Unavailable"
        description="This seller is not currently accepting bookings."
      />
    );
  }

  // Check if the user has hours with this seller
  const walletBalance = await prisma.walletBalance.findUnique({
    where: {
      holderId_sellerId: {
        holderId: auth.user.id,
        sellerId: sellerId,
      },
    },
  });

  const availableUnits = walletBalance
    ? walletBalance.balanceUnits - walletBalance.reservedUnits
    : 0;

  return (
    <BookingForm
      experienceId={experienceId}
      seller={{
        id: seller.id,
        name: seller.name,
        avatar: seller.avatar,
        sellerProfile: {
          hourlyRate: seller.sellerProfile.hourlyRate,
          averageRating: seller.sellerProfile.averageRating,
          totalSessionsCompleted: seller.sellerProfile.totalSessionsCompleted,
          timezone: seller.sellerProfile.timezone,
          minNoticeHours: seller.sellerProfile.minNoticeHours,
        },
      }}
      availableUnits={availableUnits}
      hasBalance={!!walletBalance && availableUnits > 0}
    />
  );
}
