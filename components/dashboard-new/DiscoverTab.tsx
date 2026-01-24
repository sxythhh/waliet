"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Star,
  Filter,
  ChevronDown,
  MapPin,
  MessageCircle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Users,
  Globe,
  Heart,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SellerDetailSheet } from "./SellerDetailSheet";

const categories = ["All", "Business", "Design", "Engineering", "Marketing", "Finance"];

export interface Seller {
  id: string;
  name: string;
  title: string;
  avatar: string | null;
  coverColor: string;
  verified: boolean;
  rating: number;
  reviews: number;
  hourlyRate: number;
  category: string;
  bio: string;
  availability: string;
  availableNow: boolean;
  responseTime: string;
  completedSessions: number;
  repeatClients: number;
  skills: string[];
  languages: string[];
  location: string;
  featured: boolean;
}

// Color palette for seller cards
const coverColors = [
  "from-blue-500/20 to-purple-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-orange-500/20 to-red-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-indigo-500/20 to-blue-500/20",
  "from-amber-500/20 to-yellow-500/20",
];

function SellerCard({
  seller,
  onSelect,
}: {
  seller: Seller;
  onSelect: (seller: Seller) => void;
}) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <Card
      className="group relative bg-card border-border hover:border-primary/40 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => onSelect(seller)}
    >
      {/* Like Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsLiked(!isLiked);
        }}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
          }`}
        />
      </button>

      {/* Cover Gradient */}
      <div className={`h-20 bg-gradient-to-r ${seller.coverColor}`} />

      <CardContent className="relative pt-0 p-4">
        {/* Avatar - overlapping cover */}
        <div className="absolute -top-10 left-4">
          <Avatar className="w-20 h-20 border-4 border-card">
            <AvatarImage src={seller.avatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 text-muted-foreground text-xl font-semibold">
              {seller.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="pt-12 space-y-3">
          {/* Name & Verification */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">{seller.name}</h3>
              {seller.verified && (
                <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{seller.title}</p>
          </div>

          {/* Rating & Stats Row */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-semibold">{seller.rating}</span>
              <span className="text-muted-foreground">({seller.reviews})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{seller.completedSessions} sessions</span>
            </div>
          </div>

          {/* Bio */}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {seller.bio}
          </p>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5">
            {seller.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted text-muted-foreground"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {seller.location}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {seller.languages.join(", ")}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${seller.availableNow ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-xs font-medium">
                  {seller.availableNow ? "Available now" : `Next: ${seller.availability}`}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MessageCircle className="w-3 h-3" />
                <span>Replies {seller.responseTime}</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-primary">${seller.hourlyRate}</p>
              <p className="text-[10px] text-muted-foreground">per hour</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(seller);
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Message
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(seller);
              }}
            >
              <Calendar className="w-3.5 h-3.5" />
              Book Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiscoverTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sellers from API
  useEffect(() => {
    async function fetchSellers() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/app/sellers");
        if (response.ok) {
          const data = await response.json();
          // Transform API data to match Seller interface
          const transformedSellers: Seller[] = data.sellers.map((seller: any, index: number) => ({
            id: seller.userId,
            name: seller.user?.name || "Anonymous",
            title: seller.tagline || "Expert",
            avatar: seller.user?.avatar || null,
            coverColor: coverColors[index % coverColors.length],
            verified: seller.isVerified || false,
            rating: seller.averageRating || 0,
            reviews: seller.totalReviews || 0,
            hourlyRate: (seller.hourlyRate || 0) / 100, // Convert cents to dollars
            category: "Business", // Default category
            bio: seller.bio || "No bio available",
            availability: "Tomorrow",
            availableNow: true,
            responseTime: "within 24h",
            completedSessions: seller.totalSessionsCompleted || 0,
            repeatClients: 0,
            skills: [],
            languages: ["English"],
            location: "Remote",
            featured: seller.isVerified || false,
          }));
          setSellers(transformedSellers);
        }
      } catch (err) {
        console.error("Error fetching sellers:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSellers();
  }, []);

  const handleSelectSeller = (seller: Seller) => {
    setSelectedSeller(seller);
    setIsSheetOpen(true);
  };

  const filteredSellers = sellers.filter((seller) => {
    const matchesSearch =
      seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || seller.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort sellers
  const sortedSellers = [...filteredSellers].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.rating - a.rating;
      case "price-low":
        return a.hourlyRate - b.hourlyRate;
      case "price-high":
        return b.hourlyRate - a.hourlyRate;
      case "reviews":
        return b.reviews - a.reviews;
      default:
        // Recommended: sort by rating
        return b.rating - a.rating;
    }
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover Experts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Find and book sessions with top professionals
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span>{filteredSellers.length} experts available</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, expertise, skills, or keyword..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 rounded-xl">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">{selectedCategory}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-primary/10 text-primary" : ""}
                >
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 rounded-xl">
                Sort
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => setSortBy("recommended")}
                className={sortBy === "recommended" ? "bg-primary/10 text-primary" : ""}
              >
                Recommended
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("rating")}
                className={sortBy === "rating" ? "bg-primary/10 text-primary" : ""}
              >
                Highest Rated
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("reviews")}
                className={sortBy === "reviews" ? "bg-primary/10 text-primary" : ""}
              >
                Most Reviews
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("price-low")}
                className={sortBy === "price-low" ? "bg-primary/10 text-primary" : ""}
              >
                Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("price-high")}
                className={sortBy === "price-high" ? "bg-primary/10 text-primary" : ""}
              >
                Price: High to Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === category
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && sortedSellers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedSellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} onSelect={handleSelectSeller} />
          ))}
        </div>
      )}

      {/* Seller Detail Sheet */}
      <SellerDetailSheet
        seller={selectedSeller}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      {/* Empty State */}
      {!isLoading && filteredSellers.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No experts found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {sellers.length === 0
              ? "No sellers have registered yet. Be the first to list your services!"
              : "Try adjusting your search or filters"}
          </p>
          {sellers.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
