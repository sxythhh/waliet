import { getDualAuthUser } from "@/lib/dual-auth";
import { db } from "@/lib/db";
import { BrowsePageClient } from "./BrowsePageClient";
import { Card, CardContent } from "@/components/ui/card";
import { MdLock } from "react-icons/md";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";

interface PageProps {
  searchParams: Promise<{ experienceId?: string }>;
}

export default async function BrowsePage({ searchParams }: PageProps) {
  const { experienceId } = await searchParams;

  // Get authenticated user (Whop OR Supabase)
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
              Sign in to browse available sellers and book their time.
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

  // Fetch all users with active seller profiles (excluding current user)
  const allUsers = await db.user.findActiveSellersExcept(user.id);

  // Map to the format expected by the browse component
  const sellers = allUsers
    .filter((u) => u.sellerProfile) // Only users with active seller profiles
    .map((u) => ({
      id: u.sellerProfile!.id,
      userId: u.id,
      hourlyRate: u.sellerProfile!.hourlyRate,
      bio: u.sellerProfile!.bio,
      tagline: u.sellerProfile!.tagline,
      averageRating: u.sellerProfile!.averageRating,
      totalSessionsCompleted: u.sellerProfile!.totalSessionsCompleted,
      isVerified: u.sellerProfile!.isVerified,
      hasSellerProfile: true,
      user: { id: u.id, name: u.name, avatar: u.avatar },
    }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">Waliet</span>
          </Link>
          <UserMenu user={authUser} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">
        <BrowsePageClient
          sellers={sellers}
          experienceId={experienceId}
          currentUserId={user.id}
          authProvider={authUser.provider}
        />
      </main>
    </div>
  );
}
