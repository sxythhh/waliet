"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MdSearch,
  MdFilterList,
  MdStar,
  MdVerified,
  MdAccessTime,
  MdClose,
  MdStorefront,
} from "react-icons/md";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Seller {
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

interface BrowsePageClientProps {
  sellers: Seller[];
  experienceId?: string;
  currentUserId: string;
  authProvider?: "whop" | "supabase";
}

interface Filters {
  verifiedOnly: boolean;
  hasRateOnly: boolean;
  minRating: number;
  maxPrice: number | null;
}

export function BrowsePageClient({
  sellers,
  experienceId,
  currentUserId,
  authProvider,
}: BrowsePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filters, setFilters] = useState<Filters>({
    verifiedOnly: false,
    hasRateOnly: false,
    minRating: 0,
    maxPrice: null,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get max price for slider
  const maxAvailablePrice = Math.max(
    ...sellers.filter((s) => s.hourlyRate !== null).map((s) => s.hourlyRate!),
    10000 // Default max $100/hr
  );

  const filteredSellers = sellers.filter((seller) => {
    const matchesSearch =
      !searchQuery ||
      seller.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.tagline?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerified = !filters.verifiedOnly || seller.isVerified;
    const matchesHasRate = !filters.hasRateOnly || seller.hourlyRate !== null;
    const matchesMinRating =
      filters.minRating === 0 ||
      (seller.averageRating || 0) >= filters.minRating;
    const matchesMaxPrice =
      !filters.maxPrice ||
      (seller.hourlyRate && seller.hourlyRate <= filters.maxPrice);

    return (
      matchesSearch &&
      matchesVerified &&
      matchesHasRate &&
      matchesMinRating &&
      matchesMaxPrice
    );
  });

  const sortedSellers = [...filteredSellers].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return (b.averageRating || 0) - (a.averageRating || 0);
      case "sessions":
        return b.totalSessionsCompleted - a.totalSessionsCompleted;
      case "price_low":
        if (a.hourlyRate === null) return 1;
        if (b.hourlyRate === null) return -1;
        return a.hourlyRate - b.hourlyRate;
      case "price_high":
        if (a.hourlyRate === null) return 1;
        if (b.hourlyRate === null) return -1;
        return b.hourlyRate - a.hourlyRate;
      case "recent":
      default:
        return 0;
    }
  });

  const formatRate = (cents: number | null) => {
    if (cents === null) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const activeFilterCount = [
    filters.verifiedOnly,
    filters.hasRateOnly,
    filters.minRating > 0,
    filters.maxPrice !== null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      verifiedOnly: false,
      hasRateOnly: false,
      minRating: 0,
      maxPrice: null,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Browse Sellers</h1>
        <p className="text-muted-foreground mt-2">
          Find experts and book their time. Discover talented people ready to help you.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, skill, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <div className="flex gap-2">
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 h-11">
                <MdFilterList className="h-5 w-5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Refine your search to find the perfect match
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Verified Only */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified"
                    checked={filters.verifiedOnly}
                    onCheckedChange={(checked) =>
                      setFilters((f) => ({ ...f, verifiedOnly: checked === true }))
                    }
                  />
                  <Label
                    htmlFor="verified"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <MdVerified className="h-4 w-4 text-primary" />
                    Verified sellers only
                  </Label>
                </div>

                {/* Has Rate */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasRate"
                    checked={filters.hasRateOnly}
                    onCheckedChange={(checked) =>
                      setFilters((f) => ({ ...f, hasRateOnly: checked === true }))
                    }
                  />
                  <Label htmlFor="hasRate" className="cursor-pointer">
                    Only show sellers accepting bookings
                  </Label>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <MdStar className="h-4 w-4 text-yellow-500" />
                    Minimum Rating:{" "}
                    {filters.minRating > 0 ? `${filters.minRating}+` : "Any"}
                  </Label>
                  <Slider
                    value={[filters.minRating]}
                    onValueChange={([value]) =>
                      setFilters((f) => ({ ...f, minRating: value }))
                    }
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Any</span>
                    <span>5 stars</span>
                  </div>
                </div>

                {/* Max Price */}
                <div className="space-y-3">
                  <Label>
                    Max Price:{" "}
                    {filters.maxPrice
                      ? formatRate(filters.maxPrice) + "/hr"
                      : "Any"}
                  </Label>
                  <Slider
                    value={[filters.maxPrice || maxAvailablePrice]}
                    onValueChange={([value]) =>
                      setFilters((f) => ({
                        ...f,
                        maxPrice: value === maxAvailablePrice ? null : value,
                      }))
                    }
                    max={maxAvailablePrice}
                    step={500}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$0</span>
                    <span>{formatRate(maxAvailablePrice)}</span>
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <Button variant="outline" className="w-full" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-11">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Joined</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="sessions">Most Sessions</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.verifiedOnly && (
            <Badge variant="secondary" className="gap-1">
              Verified Only
              <button onClick={() => setFilters((f) => ({ ...f, verifiedOnly: false }))}>
                <MdClose className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.hasRateOnly && (
            <Badge variant="secondary" className="gap-1">
              Accepting Bookings
              <button onClick={() => setFilters((f) => ({ ...f, hasRateOnly: false }))}>
                <MdClose className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.minRating > 0 && (
            <Badge variant="secondary" className="gap-1">
              {filters.minRating}+ Stars
              <button onClick={() => setFilters((f) => ({ ...f, minRating: 0 }))}>
                <MdClose className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.maxPrice && (
            <Badge variant="secondary" className="gap-1">
              Max {formatRate(filters.maxPrice)}/hr
              <button onClick={() => setFilters((f) => ({ ...f, maxPrice: null }))}>
                <MdClose className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-muted-foreground mb-6">
        {sortedSellers.length} {sortedSellers.length === 1 ? "seller" : "sellers"}{" "}
        available
      </p>

      {/* Sellers Grid */}
      {sortedSellers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MdStorefront className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery || activeFilterCount > 0
                ? "No sellers match your criteria"
                : "No sellers available yet"}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchQuery || activeFilterCount > 0
                ? "Try adjusting your search or filters to find more sellers."
                : "Be the first to offer your time! Set up your seller profile to get started."}
            </p>
            {(searchQuery || activeFilterCount > 0) && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  clearFilters();
                }}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSellers.map((seller) => (
            <SellerCard
              key={seller.userId}
              seller={seller}
              experienceId={experienceId}
              formatRate={formatRate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerCard({
  seller,
  experienceId,
  formatRate,
}: {
  seller: Seller;
  experienceId?: string;
  formatRate: (cents: number | null) => string | null;
}) {
  const hasRate = seller.hourlyRate !== null;
  const rate = formatRate(seller.hourlyRate);

  // Build URLs based on whether we have an experience context
  const profileUrl = experienceId
    ? `/experiences/${experienceId}/seller/${seller.user.id}`
    : `/sellers/${seller.user.id}`;
  const buyUrl = experienceId
    ? `/experiences/${experienceId}/seller/${seller.user.id}?action=buy`
    : `/sellers/${seller.user.id}?action=buy`;

  return (
    <Card className="group hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Top accent bar for verified sellers */}
      {seller.isVerified && (
        <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
      )}
      <CardContent className={cn("p-6", seller.isVerified && "pt-5")}>
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-sm">
              <AvatarImage src={seller.user.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-lg">
                {seller.user.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            {seller.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <MdVerified className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate text-lg">
                  {seller.user.name || "Anonymous"}
                </h3>
                {seller.tagline && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {seller.tagline}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              {seller.averageRating ? (
                <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                  <MdStar className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {seller.averageRating.toFixed(1)}
                  </span>
                </div>
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

        {seller.bio && (
          <p className="text-sm text-muted-foreground mt-4 line-clamp-2 leading-relaxed">
            {seller.bio}
          </p>
        )}

        <div className="flex items-center justify-between mt-5 pt-4 border-t">
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
