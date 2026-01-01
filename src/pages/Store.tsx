import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ShoppingBag,
  Wallet,
  Search,
  Star,
  Sparkles,
  Crown,
  Zap,
  Gift,
  CheckCircle2,
  ChevronRight,
  X,
  Tag,
  Clock,
  Users,
  TrendingUp,
  Heart,
  ShoppingCart,
  ArrowRight,
  Gem,
  Award,
  Target,
  Flame,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

// Demo store items
const STORE_CATEGORIES = [
  { id: "all", label: "All Items", icon: ShoppingBag },
  { id: "boosts", label: "Boosts", icon: Zap },
  { id: "badges", label: "Badges", icon: Award },
  { id: "perks", label: "Perks", icon: Gift },
  { id: "exclusive", label: "Exclusive", icon: Crown },
];

const DEMO_ITEMS = [
  {
    id: "1",
    name: "Profile Spotlight",
    description: "Get your profile featured on the discover page for 24 hours. Increase your visibility to brands.",
    price: 25.00,
    category: "boosts",
    image: null,
    icon: Sparkles,
    color: "violet",
    popular: true,
    limited: false,
    stock: null,
  },
  {
    id: "2",
    name: "Verified Creator Badge",
    description: "Stand out with a verified badge on your profile. Shows brands you're a trusted creator.",
    price: 50.00,
    category: "badges",
    image: null,
    icon: CheckCircle2,
    color: "blue",
    popular: true,
    limited: false,
    stock: null,
  },
  {
    id: "3",
    name: "Priority Application",
    description: "Your next 5 campaign applications get priority review. Skip to the front of the queue.",
    price: 15.00,
    category: "boosts",
    image: null,
    icon: Zap,
    color: "amber",
    popular: false,
    limited: false,
    stock: null,
  },
  {
    id: "4",
    name: "Early Access Pass",
    description: "Get 48-hour early access to new campaigns before they go public. Limited monthly supply.",
    price: 75.00,
    category: "perks",
    image: null,
    icon: Clock,
    color: "emerald",
    popular: false,
    limited: true,
    stock: 23,
  },
  {
    id: "5",
    name: "Creator Pro Badge",
    description: "Exclusive badge for top-tier creators. Unlock premium features and higher commission rates.",
    price: 150.00,
    category: "exclusive",
    image: null,
    icon: Crown,
    color: "amber",
    popular: false,
    limited: true,
    stock: 10,
  },
  {
    id: "6",
    name: "Profile Theme Pack",
    description: "Customize your profile with exclusive themes and colors. Make your profile stand out.",
    price: 20.00,
    category: "perks",
    image: null,
    icon: Gem,
    color: "rose",
    popular: false,
    limited: false,
    stock: null,
  },
  {
    id: "7",
    name: "Analytics Boost",
    description: "Unlock detailed analytics for your content performance. See what works best.",
    price: 35.00,
    category: "boosts",
    image: null,
    icon: TrendingUp,
    color: "cyan",
    popular: true,
    limited: false,
    stock: null,
  },
  {
    id: "8",
    name: "Collaboration Badge",
    description: "Show you're open for brand collaborations. Appear in brand partner searches.",
    price: 30.00,
    category: "badges",
    image: null,
    icon: Users,
    color: "indigo",
    popular: false,
    limited: false,
    stock: null,
  },
  {
    id: "9",
    name: "Hot Creator Badge",
    description: "Limited edition badge for trending creators. Only available this month!",
    price: 100.00,
    category: "exclusive",
    image: null,
    icon: Flame,
    color: "orange",
    popular: true,
    limited: true,
    stock: 5,
  },
  {
    id: "10",
    name: "Milestone Reward Pack",
    description: "Celebrate your achievements with exclusive rewards. Includes badge + profile boost.",
    price: 45.00,
    category: "perks",
    image: null,
    icon: Target,
    color: "green",
    popular: false,
    limited: false,
    stock: null,
  },
];

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string | null;
  icon: any;
  color: string;
  popular: boolean;
  limited: boolean;
  stock: number | null;
}

interface WalletInfo {
  balance: number;
  totalEarned: number;
}

export default function Store() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWallet();
    }
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    setLoadingWallet(true);
    try {
      const { data } = await supabase
        .from("wallets")
        .select("balance, total_earned")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setWallet({
          balance: data.balance || 0,
          totalEarned: data.total_earned || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleItemClick = (item: StoreItem) => {
    setSelectedItem(item);
    setSheetOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedItem || !wallet) return;

    if (wallet.balance < selectedItem.price) {
      toast.error("Insufficient balance", {
        description: "You don't have enough funds to purchase this item.",
      });
      return;
    }

    setPurchasing(true);

    // Simulate purchase delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast.success("Purchase successful!", {
      description: `You've purchased ${selectedItem.name}`,
    });

    // Update local wallet balance
    setWallet(prev => prev ? { ...prev, balance: prev.balance - selectedItem.price } : null);
    setPurchasing(false);
    setSheetOpen(false);
  };

  const filteredItems = DEMO_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const popularItems = DEMO_ITEMS.filter(item => item.popular);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
      violet: {
        bg: "bg-violet-500/10",
        text: "text-violet-500",
        border: "border-violet-500/20",
        gradient: "from-violet-500 to-violet-600",
      },
      blue: {
        bg: "bg-blue-500/10",
        text: "text-blue-500",
        border: "border-blue-500/20",
        gradient: "from-blue-500 to-blue-600",
      },
      amber: {
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        border: "border-amber-500/20",
        gradient: "from-amber-500 to-amber-600",
      },
      emerald: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20",
        gradient: "from-emerald-500 to-emerald-600",
      },
      rose: {
        bg: "bg-rose-500/10",
        text: "text-rose-500",
        border: "border-rose-500/20",
        gradient: "from-rose-500 to-rose-600",
      },
      cyan: {
        bg: "bg-cyan-500/10",
        text: "text-cyan-500",
        border: "border-cyan-500/20",
        gradient: "from-cyan-500 to-cyan-600",
      },
      indigo: {
        bg: "bg-indigo-500/10",
        text: "text-indigo-500",
        border: "border-indigo-500/20",
        gradient: "from-indigo-500 to-indigo-600",
      },
      orange: {
        bg: "bg-orange-500/10",
        text: "text-orange-500",
        border: "border-orange-500/20",
        gradient: "from-orange-500 to-orange-600",
      },
      green: {
        bg: "bg-green-500/10",
        text: "text-green-500",
        border: "border-green-500/20",
        gradient: "from-green-500 to-green-600",
      },
    };
    return colors[color] || colors.violet;
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 overflow-auto">
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative max-w-7xl mx-auto px-6 py-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">Beta</Badge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                    Creator Store
                  </h1>
                  <p className="text-muted-foreground max-w-md">
                    Boost your profile, unlock exclusive perks, and stand out to brands with premium items.
                  </p>
                </div>

                {/* Wallet Card */}
                <div className={cn(
                  "p-5 rounded-2xl min-w-[240px]",
                  "bg-gradient-to-br from-emerald-500 to-emerald-600",
                  "shadow-lg shadow-emerald-500/20"
                )}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-emerald-100 text-sm font-medium">Your Balance</span>
                  </div>
                  <p className="text-white text-3xl font-bold tracking-tight">
                    {loadingWallet ? (
                      <Skeleton className="h-9 w-28 bg-white/20" />
                    ) : (
                      `$${wallet?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}`
                    )}
                  </p>
                  <p className="text-emerald-100 text-xs mt-1">
                    Available to spend
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-border/50 bg-muted/30"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                {STORE_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <category.icon className="w-4 h-4" />
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Section */}
            {activeCategory === "all" && searchQuery === "" && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">Popular Items</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {popularItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      colorClasses={getColorClasses(item.color)}
                      onClick={() => handleItemClick(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Items */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {activeCategory === "all" ? "All Items" : STORE_CATEGORIES.find(c => c.id === activeCategory)?.label}
                </h2>
                <span className="text-sm text-muted-foreground">{filteredItems.length} items</span>
              </div>

              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No items found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      colorClasses={getColorClasses(item.color)}
                      onClick={() => handleItemClick(item)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Item Detail Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            className={cn(
              "w-full sm:max-w-[480px] p-0 gap-0",
              "border-l border-border/40",
              "bg-gradient-to-b from-background via-background to-muted/20"
            )}
          >
            <ScrollArea className="h-full">
              {selectedItem && (
                <>
                  {/* Hero */}
                  <div className="relative overflow-hidden">
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-10",
                      `from-${selectedItem.color}-500 to-${selectedItem.color}-600`
                    )} />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="relative px-6 pt-6 pb-8">
                      <button
                        onClick={() => setSheetOpen(false)}
                        className={cn(
                          "absolute top-4 right-4 p-2 rounded-full",
                          "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10",
                          "transition-all duration-200 active:scale-95"
                        )}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>

                      <div className="flex flex-col items-center text-center">
                        <div className={cn(
                          "w-20 h-20 rounded-2xl flex items-center justify-center mb-4",
                          "bg-gradient-to-br shadow-lg",
                          getColorClasses(selectedItem.color).gradient
                        )}>
                          <selectedItem.icon className="w-10 h-10 text-white" />
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          {selectedItem.popular && (
                            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                              <Star className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                          {selectedItem.limited && (
                            <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">
                              <Clock className="w-3 h-3 mr-1" />
                              Limited
                            </Badge>
                          )}
                        </div>

                        <h2 className="text-2xl font-bold tracking-tight mb-2">
                          {selectedItem.name}
                        </h2>

                        <p className="text-muted-foreground text-sm max-w-sm">
                          {selectedItem.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price & Stock */}
                  <div className="px-6 pb-6">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Price</p>
                          <p className="text-3xl font-bold">${selectedItem.price.toFixed(2)}</p>
                        </div>
                        {selectedItem.limited && selectedItem.stock !== null && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">In Stock</p>
                            <p className={cn(
                              "text-lg font-semibold",
                              selectedItem.stock <= 10 ? "text-rose-500" : "text-foreground"
                            )}>
                              {selectedItem.stock} left
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Wallet Balance Check */}
                    {wallet && (
                      <div className={cn(
                        "p-4 rounded-2xl mb-6",
                        wallet.balance >= selectedItem.price
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "bg-rose-500/10 border border-rose-500/20"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className={cn(
                              "w-4 h-4",
                              wallet.balance >= selectedItem.price ? "text-emerald-500" : "text-rose-500"
                            )} />
                            <span className="text-sm">Your Balance</span>
                          </div>
                          <span className={cn(
                            "font-semibold",
                            wallet.balance >= selectedItem.price ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            ${wallet.balance.toFixed(2)}
                          </span>
                        </div>
                        {wallet.balance >= selectedItem.price && (
                          <p className="text-xs text-muted-foreground mt-2">
                            After purchase: ${(wallet.balance - selectedItem.price).toFixed(2)} remaining
                          </p>
                        )}
                        {wallet.balance < selectedItem.price && (
                          <p className="text-xs text-rose-500 mt-2">
                            You need ${(selectedItem.price - wallet.balance).toFixed(2)} more
                          </p>
                        )}
                      </div>
                    )}

                    {/* Purchase Button */}
                    <Button
                      onClick={handlePurchase}
                      disabled={purchasing || !wallet || wallet.balance < selectedItem.price}
                      className={cn(
                        "w-full h-12 rounded-xl font-medium text-base gap-2",
                        "bg-gradient-to-r shadow-lg transition-all duration-300",
                        getColorClasses(selectedItem.color).gradient,
                        "hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      )}
                    >
                      {purchasing ? (
                        <>Processing...</>
                      ) : wallet && wallet.balance < selectedItem.price ? (
                        <>Insufficient Balance</>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          Purchase for ${selectedItem.price.toFixed(2)}
                        </>
                      )}
                    </Button>

                    {/* Info */}
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Instant delivery to your account</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Deducted from wallet balance</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>No refunds after purchase</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ItemCard({
  item,
  colorClasses,
  onClick,
}: {
  item: StoreItem;
  colorClasses: { bg: string; text: string; border: string; gradient: string };
  onClick: () => void;
}) {
  const IconComponent = item.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-5 rounded-2xl cursor-pointer transition-all duration-300",
        "bg-card/50 border border-border/50 hover:border-border",
        "hover:shadow-lg hover:shadow-black/5 hover:scale-[1.02]",
        "active:scale-[0.98]"
      )}
    >
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {item.popular && (
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <Star className="w-3.5 h-3.5 text-orange-500" />
          </div>
        )}
        {item.limited && (
          <div className="p-1.5 rounded-lg bg-rose-500/10">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
          </div>
        )}
      </div>

      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
        "bg-gradient-to-br shadow-md",
        colorClasses.gradient,
        "group-hover:scale-110 transition-transform duration-300"
      )}>
        <IconComponent className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <h3 className="font-semibold text-base mb-1.5 group-hover:text-primary transition-colors">
        {item.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {item.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">${item.price.toFixed(2)}</span>
        {item.limited && item.stock !== null && (
          <span className={cn(
            "text-xs font-medium",
            item.stock <= 10 ? "text-rose-500" : "text-muted-foreground"
          )}>
            {item.stock} left
          </span>
        )}
      </div>
    </div>
  );
}
