import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { SupportChat } from "@/components/support/SupportChat";
import PublicNavbar from "@/components/PublicNavbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SearchIcon from "@mui/icons-material/Search";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EmailIcon from "@mui/icons-material/Email";
import ChatIcon from "@mui/icons-material/Chat";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HelpIcon from "@mui/icons-material/Help";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import BoltIcon from "@mui/icons-material/Bolt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShareIcon from "@mui/icons-material/Share";
import GroupIcon from "@mui/icons-material/Group";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LinkIcon from "@mui/icons-material/Link";
import CheckIcon from "@mui/icons-material/Check";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import AddIcon from "@mui/icons-material/Add";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CancelIcon from "@mui/icons-material/Cancel";
import LoopIcon from "@mui/icons-material/Loop";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SendIcon from "@mui/icons-material/Send";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { UnifiedMessagesWidget } from "@/components/shared/UnifiedMessagesWidget";

// Ticket types
interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "awaiting_reply" | "resolved" | "closed";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "admin";
  content: string;
  is_internal: boolean;
  created_at: string;
}

// Ticket categories
const TICKET_CATEGORIES = [
  { id: "billing", name: "Billing & Payments", icon: AccountBalanceWalletIcon },
  { id: "technical", name: "Technical Issue", icon: ErrorIcon },
  { id: "account", name: "Account & Profile", icon: GroupIcon },
  { id: "campaign", name: "Campaign Issue", icon: BoltIcon },
  { id: "payout", name: "Payout Request", icon: AccountBalanceWalletIcon },
  { id: "other", name: "Other", icon: HelpIcon },
];



// Help article categories
const CATEGORIES = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: RocketLaunchIcon,
    description: "Learn the basics and set up your account"
  },
  {
    id: "campaigns",
    name: "Campaigns",
    icon: BoltIcon,
    description: "Join and manage your campaigns"
  },
  {
    id: "earnings",
    name: "Earnings & Payouts",
    icon: AccountBalanceWalletIcon,
    description: "Understand how you earn and get paid"
  },
  {
    id: "referrals",
    name: "Referrals",
    icon: ShareIcon,
    description: "Grow your network and earn bonuses"
  },
  {
    id: "account",
    name: "Account & Profile",
    icon: GroupIcon,
    description: "Manage your profile and settings"
  },
  {
    id: "security",
    name: "Security & Privacy",
    icon: ShieldIcon,
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
  if (cleanHash.startsWith('q-')) {
    const id = cleanHash.replace('q-', '');
    return FAQ_ITEMS.find(item => item.id === id);
  }
  return FAQ_ITEMS.find(item => generateSlug(item.question) === cleanHash);
}

// Status styling
function getStatusStyles(status: SupportTicket["status"]) {
  switch (status) {
    case "open":
      return { bg: "bg-muted", text: "text-foreground", icon: ErrorIcon };
    case "in_progress":
      return { bg: "bg-muted", text: "text-foreground", icon: LoopIcon };
    case "awaiting_reply":
      return { bg: "bg-muted", text: "text-foreground", icon: ScheduleIcon };
    case "resolved":
      return { bg: "bg-muted", text: "text-foreground", icon: CheckCircleIcon };
    case "closed":
      return { bg: "bg-muted", text: "text-muted-foreground", icon: CancelIcon };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", icon: HelpIcon };
  }
}

function getPriorityStyles(priority: SupportTicket["priority"]) {
  switch (priority) {
    case "urgent":
      return { bg: "bg-muted", text: "text-foreground" };
    case "high":
      return { bg: "bg-muted", text: "text-foreground" };
    case "medium":
      return { bg: "bg-muted", text: "text-foreground" };
    case "low":
      return { bg: "bg-muted", text: "text-muted-foreground" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground" };
  }
}

const Support = () => {
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const faqRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const resultsRef = useRef<HTMLDivElement>(null);

  // Ticket state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    priority: "medium" as SupportTicket["priority"],
    description: "",
  });

  // Reply state
  const [replyText, setReplyText] = useState("");

  // Fetch user's tickets from database
  const fetchUserTickets = async () => {
    if (!user) return;

    setTicketsLoading(true);
    try {
      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch messages for each ticket
      const ticketsWithMessages = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          const { data: messagesData } = await supabase
            .from("ticket_messages")
            .select("*")
            .eq("ticket_id", ticket.id)
            .eq("is_internal", false)
            .order("created_at", { ascending: true });

          return {
            ...ticket,
            messages: messagesData || [],
          };
        })
      );

      setTickets(ticketsWithMessages as SupportTicket[]);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setTicketsLoading(false);
    }
  };

  // Fetch tickets when user is available
  useEffect(() => {
    if (user) {
      fetchUserTickets();
    }
  }, [user]);

  // Real-time subscription for ticket updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("user-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUserTickets();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
        },
        (payload) => {
          // Refresh tickets to get new messages
          fetchUserTickets();
          // Update selected ticket if it's the one with new message
          if (selectedTicket && payload.new.ticket_id === selectedTicket.id) {
            setSelectedTicket((prev) => {
              if (!prev) return prev;
              const newMessage = payload.new as TicketMessage;
              if (newMessage.is_internal) return prev; // Don't show internal notes
              return {
                ...prev,
                messages: [...(prev.messages || []), newMessage],
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedTicket?.id]);

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const faq = findFaqByHash(hash);
      if (faq) {
        setExpandedItems(new Set([faq.id]));
        setSelectedCategory(faq.category);
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
      window.history.replaceState(null, '', location.pathname);
    } else {
      newExpanded.add(id);
      window.history.replaceState(null, '', `${location.pathname}#q-${id}`);
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

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.category || !newTicket.description) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields.",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Not logged in",
        description: "Please log in to submit a support ticket.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the ticket - cast to any to work around type sync issues
      // ticket_number is generated by a database trigger
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: newTicket.subject,
          category: newTicket.category as "billing" | "technical" | "account" | "campaign" | "payout" | "other",
          priority: newTicket.priority as "low" | "medium" | "high" | "urgent",
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create the first message with the description
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketData.id,
          sender_id: user.id,
          sender_type: "user",
          content: newTicket.description,
        });

      if (messageError) throw messageError;

      setNewTicket({ subject: "", category: "", priority: "medium", description: "" });
      setCreateDialogOpen(false);
      setShowTickets(true);
      fetchUserTickets();

      toast({
        title: "Ticket created!",
        description: `Your ticket ${ticketData.ticket_number} has been submitted. We'll respond within 24 hours.`,
      });
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create ticket. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;

    try {
      // Insert the message
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: "user",
          content: replyText.trim(),
        });

      if (messageError) throw messageError;

      // Update ticket status to awaiting_reply
      await supabase
        .from("support_tickets")
        .update({ status: "awaiting_reply" })
        .eq("id", selectedTicket.id);

      setReplyText("");

      toast({
        title: "Reply sent",
        description: "Your message has been sent to support.",
      });

      // Refresh tickets to get latest data
      fetchUserTickets();
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reply. Please try again.",
      });
    }
  };

  const openTicketCount = tickets.filter(t => t.status !== "resolved" && t.status !== "closed").length;
  const selectedCategoryData = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="h-screen overflow-y-auto bg-background">
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

      <main className="pt-24 pb-16">
        {/* Hero Section - Compact */}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto px-6 py-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              How can we help?
            </h1>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Get instant help from our AI assistant or browse our knowledge base
            </p>

            {/* Search Bar - Minimal */}
            <div className="relative max-w-md mx-auto">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" sx={{ fontSize: 18 }} />
              <Input
                type="text"
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  setSelectedCategory(null);
                  if (value.trim()) {
                    setTimeout(() => {
                      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }}
                className="pl-11 pr-4 h-12 rounded-xl border-border/50 bg-background/80 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>

        {/* AI Chat Section - Always Visible, Primary Focus */}
        <div className="max-w-3xl mx-auto px-6 mb-8">
          <SupportChat />
        </div>

        {/* Quick Actions - Horizontal Pills */}
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant={showTickets ? "default" : "outline"}
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => setShowTickets(!showTickets)}
            >
              <ConfirmationNumberIcon sx={{ fontSize: 16 }} />
              My Tickets
              {openTicketCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {openTicketCount}
                </Badge>
              )}
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 rounded-full">
                  <AddIcon sx={{ fontSize: 16 }} />
                  Submit Ticket
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Submit a Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and we'll get back to you within 24 hours.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your issue"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select
                          value={newTicket.category}
                          onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {TICKET_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={newTicket.priority}
                          onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value as SupportTicket["priority"] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Please provide as much detail as possible..."
                        rows={5}
                        value={newTicket.description}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTicket} disabled={isSubmitting} className="gap-2">
                      {isSubmitting && <LoopIcon className="animate-spin" sx={{ fontSize: 16 }} />}
                      Submit Ticket
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </div>
        </div>

        {/* Tickets Section (collapsible) */}
        {showTickets && (
          <div className="max-w-4xl mx-auto px-6 mb-12">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <ConfirmationNumberIcon className="text-foreground" sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <h2 className="font-semibold">My Support Tickets</h2>
                    <p className="text-sm text-muted-foreground">
                      {tickets.length} ticket{tickets.length !== 1 && 's'} total
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowTickets(false)}>
                  <ExpandLessIcon sx={{ fontSize: 16 }} />
                </Button>
              </div>

              {tickets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <ConfirmationNumberIcon className="text-muted-foreground" sx={{ fontSize: 32 }} />
                  </div>
                  <h3 className="font-semibold mb-2">No tickets yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Submit a ticket when you need help from our team
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                    <AddIcon sx={{ fontSize: 16 }} />
                    Create Ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const statusStyles = getStatusStyles(ticket.status);
                    const priorityStyles = getPriorityStyles(ticket.priority);
                    const categoryData = TICKET_CATEGORIES.find(c => c.id === ticket.category);

                    return (
                      <button
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setTicketSheetOpen(true);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 text-left",
                          "bg-background/50 hover:bg-background/80 transition-all hover:shadow-md group"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", statusStyles.bg)}>
                          <statusStyles.icon className={cn(statusStyles.text, ticket.status === "in_progress" && "animate-spin")} sx={{ fontSize: 20 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-mono">{ticket.ticket_number}</span>
                            <Badge variant="outline" className={cn("text-[10px] capitalize", priorityStyles.text, priorityStyles.bg)}>
                              {ticket.priority}
                            </Badge>
                          </div>
                          <h4 className="font-medium truncate">{ticket.subject}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="capitalize">{ticket.status.replace("_", " ")}</span>
                            <span>•</span>
                            <span>Updated {format(new Date(ticket.updated_at), "MMM d, h:mm a")}</span>
                          </div>
                        </div>
                        <ChevronRightIcon className="text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" sx={{ fontSize: 20 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
              <ArrowBackIcon sx={{ fontSize: 16 }} />
              Back to all categories
            </Button>
          )}

          {/* Category Header when selected */}
          {selectedCategoryData && (
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-muted">
                <selectedCategoryData.icon className="text-foreground" sx={{ fontSize: 28 }} />
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
                      <div className="flex-1">
                        <h3 className="font-semibold mb-0.5">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      <ChevronRightIcon className="text-muted-foreground group-hover:translate-x-1 transition-transform" sx={{ fontSize: 20 }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Articles */}
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <AutoAwesomeIcon className="text-foreground" sx={{ fontSize: 20 }} />
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
                        <div className="flex-1 min-w-0">
                          <Badge variant="secondary" className="text-[10px] mb-2">
                            {category?.name}
                          </Badge>
                          <h3 className="font-medium text-sm line-clamp-2">{article.question}</h3>
                        </div>
                        <ChevronRightIcon className="text-muted-foreground shrink-0 mt-1 group-hover:translate-x-1 transition-transform" sx={{ fontSize: 16 }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* FAQ List */}
          {(selectedCategory || searchQuery) && (
            <div ref={resultsRef} className="space-y-3 scroll-mt-6">
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <SearchIcon className="text-muted-foreground" sx={{ fontSize: 32 }} />
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
                      expandedItems.has(item.id) && "border-border bg-card/80"
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
                            "hover:bg-muted text-muted-foreground hover:text-foreground",
                            expandedItems.has(item.id) && "opacity-100"
                          )}
                          title="Copy link to this question"
                        >
                          {copiedId === item.id ? (
                            <CheckIcon className="text-foreground" sx={{ fontSize: 16 }} />
                          ) : (
                            <LinkIcon sx={{ fontSize: 16 }} />
                          )}
                        </button>
                        <ExpandMoreIcon
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
                                  <CheckIcon className="text-foreground" sx={{ fontSize: 14 }} />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <LinkIcon sx={{ fontSize: 14 }} />
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
          <div className="mt-16 rounded-3xl border border-border/50 bg-muted/30">
            <div className="p-8 md:p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                <ChatIcon className="text-foreground" sx={{ fontSize: 32 }} />
              </div>
              <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Can't find what you're looking for? Submit a ticket and our team will help you.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  size="lg"
                  className="gap-2 rounded-xl"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                  Submit a Ticket
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
                  <a href="mailto:support@virality.gg">
                    <EmailIcon sx={{ fontSize: 16 }} />
                    Email Support
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
                  <a href="https://discord.gg/virality" target="_blank" rel="noopener noreferrer">
                    <OpenInNewIcon sx={{ fontSize: 16 }} />
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

      {/* Unified Messages Widget */}
      {user && <UnifiedMessagesWidget />}

      {/* Ticket Detail Sheet */}
      <Sheet open={ticketSheetOpen} onOpenChange={setTicketSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTicket && (
            <>
              <SheetHeader className="pb-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-2">
                  {selectedTicket.ticket_number}
                </div>
                <SheetTitle className="text-xl">{selectedTicket.subject}</SheetTitle>
                <SheetDescription>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {(() => {
                      const statusStyles = getStatusStyles(selectedTicket.status);
                      const priorityStyles = getPriorityStyles(selectedTicket.priority);
                      return (
                        <>
                          <Badge variant="outline" className={cn("capitalize", statusStyles.text, statusStyles.bg)}>
                            {selectedTicket.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className={cn("capitalize", priorityStyles.text, priorityStyles.bg)}>
                            {selectedTicket.priority} priority
                          </Badge>
                        </>
                      );
                    })()}
                  </div>
                </SheetDescription>
              </SheetHeader>

              {/* Messages */}
              <div className="space-y-4 mb-6">
                {(selectedTicket.messages || []).map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "p-4 rounded-xl",
                      message.sender_type === "user"
                        ? "bg-muted ml-8"
                        : "bg-muted/50 mr-8"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium">
                        {message.sender_type === "user" ? "You" : "Support Team"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply Section */}
              {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                <div className="border-t pt-6">
                  <Label className="mb-2 block">Reply</Label>
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                      <AttachFileIcon sx={{ fontSize: 16 }} />
                      Attach file
                    </Button>
                    <Button onClick={handleSendReply} disabled={!replyText.trim()} className="gap-2">
                      <SendIcon sx={{ fontSize: 16 }} />
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}

              {/* Closed/Resolved Message */}
              {(selectedTicket.status === "resolved" || selectedTicket.status === "closed") && (
                <div className="border-t pt-6">
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <CheckCircleIcon className="text-foreground mx-auto mb-2" sx={{ fontSize: 32 }} />
                    <p className="text-sm font-medium">This ticket has been {selectedTicket.status}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Need more help? Create a new ticket.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Support;
