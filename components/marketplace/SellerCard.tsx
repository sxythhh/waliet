"use client";

import Link from "next/link";
import { MdVerified, MdStar, MdAccessTime } from "react-icons/md";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface SellerData {
  id: string;
  userId: string;
  hourlyRate: number | null;
  bio: string | null;
  tagline: string | null;
  averageRating: number | null;
  totalSessionsCompleted: number;
  isVerified: boolean;
  hasSellerProfile: boolean;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface SellerCardProps {
  seller: SellerData;
  experienceId?: string;
  variant?: "default" | "compact" | "featured";
  className?: string;
  standalone?: boolean; // When true, uses /sellers paths instead of /experiences
}

export function SellerCard({
  seller,
  experienceId,
  variant = "default",
  className,
  standalone,
}: SellerCardProps) {
  // Generate URLs based on context
  const profileUrl = standalone
    ? `/sellers/${seller.user.id}`
    : `/experiences/${experienceId}/seller/${seller.user.id}`;
  const buyUrl = standalone
    ? `/sellers/${seller.user.id}?action=buy`
    : `/experiences/${experienceId}/seller/${seller.user.id}?action=buy`;
  const hasRate = seller.hourlyRate !== null;
  const rate = hasRate
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(seller.hourlyRate! / 100)
    : null;

  if (variant === "compact") {
    return (
      <Card
        variant="interactive"
        className={cn("overflow-hidden", className)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={seller.user.avatar || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {seller.user.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {seller.isVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
                  <MdVerified className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">
                {seller.user.name || "Anonymous"}
              </p>
              {hasRate && (
                <p className="text-sm text-primary font-semibold">{rate}/hr</p>
              )}
            </div>
            <Link href={profileUrl}>
              <Button variant="ghost" size="sm">
                View
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant={variant === "featured" ? "featured" : "interactive"}
      className={cn("overflow-hidden group", className)}
    >
      {/* Top accent bar for verified sellers */}
      {seller.isVerified && (
        <div className="h-1 bg-primary" />
      )}

      <CardContent className={cn("p-6", seller.isVerified && "pt-5")}>
        <div className="flex items-start gap-4">
          {/* Avatar with verification badge */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-[var(--shadow-sm)]">
              <AvatarImage src={seller.user.avatar || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                {seller.user.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {seller.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-[var(--shadow-sm)]">
                <MdVerified className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name and tagline */}
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate text-lg tracking-tight">
                {seller.user.name || "Anonymous"}
              </h3>
              {seller.tagline && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {seller.tagline}
                </p>
              )}
            </div>

            {/* Rating and sessions */}
            <div className="flex items-center gap-3 mt-2">
              {seller.averageRating ? (
                <Badge variant="warning-subtle" className="gap-1">
                  <MdStar className="h-3.5 w-3.5" />
                  {seller.averageRating.toFixed(1)}
                </Badge>
              ) : null}
              {seller.totalSessionsCompleted > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MdAccessTime className="h-4 w-4" />
                  <span className="text-sm">
                    {seller.totalSessionsCompleted} sessions
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {seller.bio && (
          <p className="text-sm text-muted-foreground mt-4 line-clamp-2 leading-relaxed">
            {seller.bio}
          </p>
        )}

        {/* Footer with rate and actions */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <div>
            {hasRate ? (
              <div>
                <span className="text-2xl font-bold text-primary">{rate}</span>
                <span className="text-muted-foreground text-sm">/hr</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Rate not set</span>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={profileUrl}>
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            {hasRate ? (
              <Link href={buyUrl}>
                <Button size="sm">Buy Hours</Button>
              </Link>
            ) : (
              <Button disabled variant="secondary" size="sm">
                Buy Hours
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
