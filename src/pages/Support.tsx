import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { SupportChat } from "@/components/support/SupportChat";
import PublicNavbar from "@/components/PublicNavbar";
import {
  Search,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Mail,
  MessageCircle,
  Sparkles,
  HelpCircle,
  Rocket,
  Zap,
  Wallet,
  Share2,
  Users,
  Shield,
  ArrowLeft,
  Link2,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Help article categories
const CATEGORIES = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: Rocket,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    description: "Learn the basics and set up your account"
  },
  {
    id: "campaigns",
    name: "Campaigns",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Join and manage your campaigns"
  },
  {
    id: "earnings",
    name: "Earnings & Payouts",
    icon: Wallet,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    description: "Understand how you earn and get paid"
  },
  {
    id: "referrals",
    name: "Referrals",
    icon: Share2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    description: "Grow your network and earn bonuses"
  },
  {
    id: "account",
    name: "Account & Profile",
    icon: Users,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    description: "Manage your profile and settings"
  },
  {
    id: "security",
    name: "Security & Privacy",
    icon: Shield,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    description: "Keep your account secure"
  },
];

const FAQ_ITEMS = [
  // Getting Started
  {
    id: "1",
    category: "getting-started",
    question: "How do I create an account?",
    answer: "You can create an account by clicking 'Get Started' on the homepage. Sign up with your email, Google, Discord, or X account. Complete your profile to unlock all features and start joining campaigns.",
    popular: true
  },
  {
    id: "2",
    category: "getting-started",
    question: "What is Virality Nexus?",
    answer: "Virality Nexus is a creator platform that connects influencers with brands. Creators can join campaigns, complete tasks, and earn rewards. Brands can launch campaigns to boost their reach through authentic creator partnerships.",
    popular: true
  },
  {
    id: "3",
    category: "getting-started",
    question: "How do I connect my social accounts?",
    answer: "Go to your Dashboard and click on the Settings tab. Under 'Connected Accounts', you can link your Discord, X (Twitter), and other social platforms. Connected accounts help verify your reach and unlock more campaign opportunities."
  },
  {
    id: "4",
    category: "getting-started",
    question: "What platforms are supported?",
    answer: "We currently support TikTok, Instagram Reels, and YouTube Shorts. You can connect multiple accounts and post content across different platforms for the same campaign."
  },
  // Campaigns
  {
    id: "5",
    category: "campaigns",
    question: "How do I join a campaign?",
    answer: "Browse available campaigns in the Discover tab. Click on a campaign to view details, requirements, and rewards. If you meet the requirements, click 'Apply' or 'Join' to participate. Some campaigns accept instantly while others require approval.",
    popular: true
  },
  {
    id: "6",
    category: "campaigns",
    question: "What types of campaigns are available?",
    answer: "We offer various campaign types: Social Boost (share content on your platforms), Content Creation (create original content), Referral Campaigns (invite new users), Engagement Campaigns (like, comment, share), and Exclusive Brand Partnerships."
  },
  {
    id: "7",
    category: "campaigns",
    question: "How do I submit proof for a campaign?",
    answer: "After completing a campaign task, go to the campaign page and click 'Submit Proof'. Upload screenshots, links, or other required evidence. Our team reviews submissions within 24-48 hours."
  },
  {
    id: "8",
    category: "campaigns",
    question: "Why was my campaign submission rejected?",
    answer: "Submissions may be rejected if: the proof doesn't match requirements, content was deleted before verification, the engagement appears inauthentic, or guidelines weren't followed. Check the rejection reason and resubmit if allowed."
  },
  // Earnings & Payouts
  {
    id: "9",
    category: "earnings",
    question: "How do I get paid?",
    answer: "Earnings accumulate in your wallet balance. Once you reach the minimum payout threshold ($10), you can request a withdrawal. We support PayPal, bank transfer, and crypto payments. Payouts are processed within 3-5 business days.",
    popular: true
  },
  {
    id: "10",
    category: "earnings",
    question: "When do I receive my campaign earnings?",
    answer: "Campaign earnings are credited to your wallet after your submission is approved. Most submissions are reviewed within 24-48 hours. Your balance updates automatically once approved."
  },
  {
    id: "11",
    category: "earnings",
    question: "What is the minimum payout amount?",
    answer: "The minimum payout threshold is $10. This helps us reduce transaction fees and ensures efficient processing. You can accumulate earnings from multiple campaigns before requesting a payout."
  },
  {
    id: "12",
    category: "earnings",
    question: "How do payments work?",
    answer: "Payments are processed weekly based on your video performance. You'll earn based on the campaign's payment model - either CPM (cost per 1,000 views) or flat rate per video. Payouts are sent via your connected payment method."
  },
  // Referrals
  {
    id: "13",
    category: "referrals",
    question: "How does the referral program work?",
    answer: "Share your unique referral link or code with friends. When they sign up and complete their first campaign, you both earn a bonus! You can earn up to 10% of your referrals' earnings for their first 6 months.",
    popular: true
  },
  {
    id: "14",
    category: "referrals",
    question: "Where do I find my referral code?",
    answer: "Your referral code is in your Dashboard under the Referrals tab. You'll find your unique code and shareable link. Copy and share it on social media, DMs, or anywhere your audience is."
  },
  {
    id: "15",
    category: "referrals",
    question: "Is there a limit to how many people I can refer?",
    answer: "No limit! Refer as many people as you want. The more active referrals you have, the more you earn. Top referrers also get featured on our leaderboard and may receive exclusive perks."
  },
  // Account & Profile
  {
    id: "16",
    category: "account",
    question: "How do I update my profile?",
    answer: "Go to your Dashboard and click Settings or edit your profile. You can update your display name, bio, avatar, social links, and payment information. A complete profile helps you get accepted to more campaigns."
  },
  {
    id: "17",
    category: "account",
    question: "Can I change my username?",
    answer: "Yes, you can change your username once every 30 days. Go to Settings > Profile and update your username. Note that your public profile URL will also change."
  },
  {
    id: "18",
    category: "account",
    question: "What if my application gets rejected?",
    answer: "Don't worry! Brands have specific requirements for each campaign. Focus on improving your content quality and audience engagement, then apply to other campaigns that better match your style."
  },
  // Security & Privacy
  {
    id: "19",
    category: "security",
    question: "How do I reset my password?",
    answer: "Click 'Forgot Password' on the login page. Enter your email and we'll send a reset link. For security, links expire after 1 hour. If you don't receive the email, check your spam folder."
  },
  {
    id: "20",
    category: "security",
    question: "Is my data safe?",
    answer: "Yes! We use industry-standard encryption and security practices. Your data is stored securely and we never sell personal information. Read our Privacy Policy for detailed information about how we handle your data."
  },
  {
    id: "21",
    category: "security",
    question: "How do I enable two-factor authentication?",
    answer: "Go to Settings > Security > Two-Factor Authentication. You can enable 2FA using an authenticator app or SMS. We highly recommend enabling 2FA to protect your account and earnings."
  },
];

const POPULAR_ARTICLES = FAQ_ITEMS.filter(item => item.popular);

// Generate a URL-friendly slug from a question
function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
}

// Find FAQ item by hash (id or slug)
function findFaqByHash(hash: string): typeof FAQ_ITEMS[0] | undefined {
  const cleanHash = hash.replace('#', '');
  // First try to match by ID (e.g., #q-5)
  if (cleanHash.startsWith('q-')) {
    const id = cleanHash.replace('q-', '');
    return FAQ_ITEMS.find(item => item.id === id);
  }
  // Otherwise try to match by slug
  return FAQ_ITEMS.find(item => generateSlug(item.question) === cleanHash);
}

const Support = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const faqRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const faq = findFaqByHash(hash);
      if (faq) {
        // Auto-expand and set category
        setExpandedItems(new Set([faq.id]));
        setSelectedCategory(faq.category);

        // Scroll to the FAQ item after a short delay for DOM update
        setTimeout(() => {
          const element = faqRefs.current.get(faq.id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [location.hash]);

  const filteredFAQs = useMemo(() => {
    let items = FAQ_ITEMS;

    if (selectedCategory) {
      items = items.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
      );
    }

    return items;
  }, [searchQuery, selectedCategory]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
      // Clear hash when closing
      window.history.replaceState(null, '', location.pathname);
    } else {
      newExpanded.add(id);
      // Update URL hash when expanding
      const faq = FAQ_ITEMS.find(item => item.id === id);
      if (faq) {
        window.history.replaceState(null, '', `${location.pathname}#q-${id}`);
      }
    }
    setExpandedItems(newExpanded);
  };

  const copyFaqLink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/support#q-${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({
        title: "Link copied!",
        description: "FAQ link has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please copy the URL manually from your browser.",
      });
    }
  };

  const selectedCategoryData = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <SEOHead
        title="Help Center & Support"
        description="Get help with Virality. Browse FAQs, chat with our AI assistant, or contact our support team."
        keywords={["support", "help", "FAQ", "customer service", "AI assistant", "help center"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Support", url: "/support" },
        ]}
      />

      <PublicNavbar />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <div className="relative overflow-hidden border-b mb-12">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
          <div className="absolute inset-0">
            <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto px-6 py-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              How can we help you?
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Find answers to common questions or chat with our AI assistant for personalized help.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCategory(null);
                }}
                className="pl-12 pr-4 h-14 text-lg rounded-2xl border-border/50 bg-background/80 backdrop-blur-sm shadow-lg"
              />
            </div>

            {/* Chat Toggle */}
            <Button
              variant={showChat ? "default" : "outline"}
              size="lg"
              className="gap-2 rounded-xl"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageCircle className="w-5 h-5" />
              {showChat ? "Hide AI Chat" : "Chat with AI Assistant"}
            </Button>
          </div>
        </div>

        {/* AI Chat Section (collapsible) */}
        {showChat && (
          <div className="max-w-4xl mx-auto px-6 mb-12">
            <SupportChat />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-6">
          {/* Back Button when category selected */}
          {selectedCategory && (
            <Button
              variant="ghost"
              className="mb-6 gap-2"
              onClick={() => setSelectedCategory(null)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all categories
            </Button>
          )}

          {/* Category Header when selected */}
          {selectedCategoryData && (
            <div className="flex items-center gap-4 mb-8">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                selectedCategoryData.bgColor
              )}>
                <selectedCategoryData.icon className={cn("w-7 h-7", selectedCategoryData.color)} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedCategoryData.name}</h2>
                <p className="text-muted-foreground">{selectedCategoryData.description}</p>
              </div>
            </div>
          )}

          {/* Show categories grid when no category selected and no search */}
          {!selectedCategory && !searchQuery && (
            <>
              {/* Categories Grid */}
              <div className="mb-12">
                <h2 className="text-xl font-semibold mb-6">Browse by Category</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl border border-border/50 text-left",
                        "bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all",
                        "hover:border-border hover:shadow-lg group"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        category.bgColor
                      )}>
                        <category.icon className={cn("w-6 h-6", category.color)} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-0.5">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Articles */}
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-semibold">Popular Articles</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {POPULAR_ARTICLES.map((article) => {
                    const category = CATEGORIES.find(c => c.id === article.category);
                    return (
                      <button
                        key={article.id}
                        onClick={() => {
                          setSelectedCategory(article.category);
                          setExpandedItems(new Set([article.id]));
                        }}
                        className={cn(
                          "flex items-start gap-4 p-5 rounded-2xl border border-border/50 text-left",
                          "bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all",
                          "hover:border-border hover:shadow-lg group"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          category?.bgColor
                        )}>
                          {category && <category.icon className={cn("w-5 h-5", category.color)} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="text-[10px] mb-2">
                            {category?.name}
                          </Badge>
                          <h3 className="font-medium text-sm line-clamp-2">{article.question}</h3>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* FAQ List */}
          {(selectedCategory || searchQuery) && (
            <div className="space-y-3">
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-6">
                    We couldn't find any articles matching "{searchQuery}"
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                </div>
              ) : (
                filteredFAQs.map((item) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) faqRefs.current.set(item.id, el);
                    }}
                    className={cn(
                      "border border-border/50 rounded-xl overflow-hidden transition-all group/faq",
                      "bg-card/50 backdrop-blur-sm hover:bg-card/80",
                      expandedItems.has(item.id) && "border-primary/30 bg-card/80 ring-2 ring-primary/10"
                    )}
                  >
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <span className="font-medium pr-4">{item.question}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => copyFaqLink(item.id, e)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            "opacity-0 group-hover/faq:opacity-100",
                            "hover:bg-primary/10 text-muted-foreground hover:text-primary",
                            expandedItems.has(item.id) && "opacity-100"
                          )}
                          title="Copy link to this question"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                        </button>
                        <ChevronDown
                          className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform",
                            expandedItems.has(item.id) && "rotate-180"
                          )}
                        />
                      </div>
                    </button>
                    {expandedItems.has(item.id) && (
                      <div className="px-5 pb-5 pt-0">
                        <div className="border-t pt-4">
                          <p className="text-muted-foreground leading-relaxed">
                            {item.answer}
                          </p>
                          <div className="mt-4 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              onClick={(e) => copyFaqLink(item.id, e)}
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Link2 className="w-3.5 h-3.5" />
                                  Share this answer
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Contact Support Section */}
          <div className="mt-16 relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-card/50 to-violet-500/5">
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
            </div>
            <div className="relative p-8 md:p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Can't find what you're looking for? Chat with our AI or reach out to our support team directly.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  className="gap-2 rounded-xl"
                  onClick={() => {
                    setShowChat(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat with AI
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
                  <a href="mailto:support@virality.gg">
                    <Mail className="w-4 h-4" />
                    Email Support
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
                  <a href="https://discord.gg/virality" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Join Discord
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Links Footer */}
          <div className="mt-12 pt-8 border-t">
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="/creator-terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Creator Terms
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Support;
