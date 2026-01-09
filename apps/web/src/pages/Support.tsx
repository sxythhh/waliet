import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import PublicNavbar from "@/components/PublicNavbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SearchIcon from "@mui/icons-material/Search";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EmailIcon from "@mui/icons-material/Email";
import ChatIcon from "@mui/icons-material/Chat";
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
import AddIcon from "@mui/icons-material/Add";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import LoopIcon from "@mui/icons-material/Loop";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
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
import ReactMarkdown from "react-markdown";
import supportAvatar from "@/assets/support-avatar.png";

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

// AI Chat types
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ticketCreated?: {
    ticketNumber: string;
    ticketId: string;
  };
}

// Ticket categories
const TICKET_CATEGORIES = [
  { id: "billing", name: "Billing & Payments" },
  { id: "technical", name: "Technical Issue" },
  { id: "account", name: "Account & Profile" },
  { id: "campaign", name: "Campaign Issue" },
  { id: "payout", name: "Payout Request" },
  { id: "other", name: "Other" },
];

// Help article categories
const CATEGORIES = [
  {
    id: "getting-started",
    name: "Getting Started",
    icon: RocketLaunchIcon,
    description: "Learn the basics"
  },
  {
    id: "campaigns",
    name: "Campaigns",
    icon: BoltIcon,
    description: "Join campaigns"
  },
  {
    id: "earnings",
    name: "Earnings & Payouts",
    icon: AccountBalanceWalletIcon,
    description: "Get paid"
  },
  {
    id: "referrals",
    name: "Referrals",
    icon: ShareIcon,
    description: "Earn bonuses"
  },
  {
    id: "account",
    name: "Account",
    icon: GroupIcon,
    description: "Manage profile"
  },
  {
    id: "security",
    name: "Security",
    icon: ShieldIcon,
    description: "Stay safe"
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

// Status styling
function getStatusStyles(status: SupportTicket["status"]) {
  switch (status) {
    case "open":
      return { bg: "bg-blue-500/10", text: "text-blue-500", icon: HelpIcon };
    case "in_progress":
      return { bg: "bg-yellow-500/10", text: "text-yellow-500", icon: LoopIcon };
    case "awaiting_reply":
      return { bg: "bg-orange-500/10", text: "text-orange-500", icon: ScheduleIcon };
    case "resolved":
      return { bg: "bg-green-500/10", text: "text-green-500", icon: CheckCircleIcon };
    case "closed":
      return { bg: "bg-muted", text: "text-muted-foreground", icon: CancelIcon };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", icon: HelpIcon };
  }
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;

const Support = () => {
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const faqRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm the Virality AI assistant. How can I help you today?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Ticket state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    priority: "medium" as SupportTicket["priority"],
    description: "",
  });
  const [replyText, setReplyText] = useState("");

  // Scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch user's tickets
  const fetchUserTickets = async () => {
    if (!user) return;
    setTicketsLoading(true);
    try {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;

      const ticketsWithMessages = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          const { data: messagesData } = await supabase
            .from("ticket_messages")
            .select("*")
            .eq("ticket_id", ticket.id)
            .eq("is_internal", false)
            .order("created_at", { ascending: true });
          return { ...ticket, messages: messagesData || [] };
        })
      );
      setTickets(ticketsWithMessages as SupportTicket[]);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchUserTickets();
  }, [user]);

  // Handle URL hash
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const cleanHash = hash.replace('#', '');
      if (cleanHash.startsWith('q-')) {
        const id = cleanHash.replace('q-', '');
        const faq = FAQ_ITEMS.find(item => item.id === id);
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
      toast({ title: "Link copied!" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ variant: "destructive", title: "Failed to copy" });
    }
  };

  // AI Chat handlers
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    let assistantContent = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in to use the chat");

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.type === "ticket_created") {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
              ticketCreated: { ticketNumber: data.ticket_number, ticketId: data.ticket_id },
            },
          ]);
          toast({ title: "Support Ticket Created", description: `Ticket ${data.ticket_number} has been created.` });
          return;
        }
        if (data.error) throw new Error(data.error);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setChatMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > 1) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to send message", variant: "destructive" });
      setChatMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  // Ticket handlers
  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.category || !newTicket.description) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all required fields." });
      return;
    }
    if (!user) {
      toast({ variant: "destructive", title: "Not logged in", description: "Please log in to submit a ticket." });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: newTicket.subject,
          category: newTicket.category as any,
          priority: newTicket.priority as any,
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      await supabase.from("ticket_messages").insert({
        ticket_id: ticketData.id,
        sender_id: user.id,
        sender_type: "user",
        content: newTicket.description,
      });

      setNewTicket({ subject: "", category: "", priority: "medium", description: "" });
      setCreateDialogOpen(false);
      fetchUserTickets();
      toast({ title: "Ticket created!", description: `Ticket ${ticketData.ticket_number} has been submitted.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create ticket." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    try {
      await supabase.from("ticket_messages").insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        sender_type: "user",
        content: replyText.trim(),
      });
      await supabase.from("support_tickets").update({ status: "awaiting_reply" }).eq("id", selectedTicket.id);
      setReplyText("");
      toast({ title: "Reply sent" });
      fetchUserTickets();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send reply." });
    }
  };

  const openTicketCount = tickets.filter(t => t.status !== "resolved" && t.status !== "closed").length;
  const selectedCategoryData = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <SEOHead
        title="Help Center"
        description="Get help with Virality. Browse FAQs or chat with our AI assistant."
        keywords={["support", "help", "FAQ", "help center"]}
      />

      <PublicNavbar />

      <main className="pt-20 pb-16">
        {/* Hero - Compact */}
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Help Center
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Find answers or get help from our team
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto mb-8">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" sx={{ fontSize: 18 }} />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCategory(null);
              }}
              className="pl-11 h-12 rounded-xl border-border bg-muted/50"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="ghost"
              className="gap-2 rounded-full"
              onClick={() => setChatOpen(true)}
            >
              <ChatIcon sx={{ fontSize: 18 }} />
              Ask AI
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-full">
                  <AddIcon sx={{ fontSize: 18 }} />
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
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {TICKET_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                      placeholder="Please provide details..."
                      rows={4}
                      value={newTicket.description}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateTicket} disabled={isSubmitting}>
                    {isSubmitting && <LoopIcon className="animate-spin mr-2" sx={{ fontSize: 16 }} />}
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6">
          {/* Back button when category selected */}
          {selectedCategory && (
            <Button
              variant="ghost"
              className="mb-6 gap-2"
              onClick={() => setSelectedCategory(null)}
            >
              <ArrowBackIcon sx={{ fontSize: 18 }} />
              All categories
            </Button>
          )}

          {/* Category header */}
          {selectedCategoryData && (
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                <selectedCategoryData.icon sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedCategoryData.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedCategoryData.description}</p>
              </div>
            </div>
          )}

          {/* Categories Grid - Only when no category and no search */}
          {!selectedCategory && !searchQuery && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted flex-shrink-0">
                    <category.icon sx={{ fontSize: 24 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{category.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" sx={{ fontSize: 20 }} />
                </button>
              ))}
            </div>
          )}

          {/* Popular Articles - Only when no category and no search */}
          {!selectedCategory && !searchQuery && (
            <div className="mb-12">
              <h2 className="text-lg font-semibold mb-4">Popular Questions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POPULAR_ARTICLES.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedCategory(article.category);
                      setExpandedItems(new Set([article.id]));
                    }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{article.question}</p>
                    </div>
                    <ChevronRightIcon className="text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" sx={{ fontSize: 18 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FAQ List */}
          {(selectedCategory || searchQuery) && (
            <div className="space-y-2 mb-12">
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No results found for "{searchQuery}"</p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>Clear search</Button>
                </div>
              ) : (
                filteredFAQs.map((item) => (
                  <div
                    key={item.id}
                    ref={(el) => { if (el) faqRefs.current.set(item.id, el); }}
                    className={cn(
                      "border border-border rounded-xl overflow-hidden transition-colors",
                      expandedItems.has(item.id) ? "bg-muted/30" : "bg-card hover:bg-muted/20"
                    )}
                  >
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="font-medium text-sm pr-4">{item.question}</span>
                      <ExpandMoreIcon className={cn(
                        "text-muted-foreground transition-transform flex-shrink-0",
                        expandedItems.has(item.id) && "rotate-180"
                      )} sx={{ fontSize: 20 }} />
                    </button>
                    {expandedItems.has(item.id) && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </p>
                        <button
                          onClick={(e) => copyFaqLink(item.id, e)}
                          className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {copiedId === item.id ? <CheckIcon sx={{ fontSize: 14 }} /> : <LinkIcon sx={{ fontSize: 14 }} />}
                          {copiedId === item.id ? "Copied!" : "Copy link"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Contact Section */}
          <div className="border border-border rounded-2xl p-8 text-center bg-muted/20">
            <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
            <p className="text-muted-foreground mb-6 text-sm">Our team is here for you</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => setChatOpen(true)} className="gap-2">
                <ChatIcon sx={{ fontSize: 18 }} />
                Chat with AI
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a href="mailto:support@virality.gg">
                  <EmailIcon sx={{ fontSize: 18 }} />
                  Email Us
                </a>
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <a href="https://discord.gg/virality" target="_blank" rel="noopener noreferrer">
                  <OpenInNewIcon sx={{ fontSize: 18 }} />
                  Discord
                </a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* AI Chat Slide-out */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <img src={supportAvatar} alt="AI" className="w-6 h-6 rounded-full" />
              AI Assistant
            </SheetTitle>
          </SheetHeader>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((message, index) => (
              <div key={index} className={cn("flex gap-3", message.role === "user" && "justify-end")}>
                {message.role === "assistant" && (
                  <img src={supportAvatar} alt="AI" className="w-7 h-7 rounded-full flex-shrink-0" />
                )}
                <div className={cn(
                  "rounded-xl px-3 py-2 max-w-[85%]",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {message.ticketCreated && (
                    <Button variant="secondary" size="sm" className="mt-2 gap-1 text-xs">
                      <ConfirmationNumberIcon sx={{ fontSize: 14 }} />
                      {message.ticketCreated.ticketNumber}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && chatMessages[chatMessages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <img src={supportAvatar} alt="AI" className="w-7 h-7 rounded-full flex-shrink-0" />
                <div className="text-sm text-muted-foreground">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t">
            <form onSubmit={handleChatSubmit}>
              <div className="relative">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask a question..."
                  className="min-h-[60px] max-h-[100px] resize-none pr-12 rounded-xl"
                  disabled={chatLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!chatInput.trim() || chatLoading}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
                >
                  <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                </Button>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tickets Sheet */}
      <Sheet open={ticketSheetOpen} onOpenChange={setTicketSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTicket ? (
            <>
              <SheetHeader className="pb-4">
                <Button variant="ghost" size="sm" className="w-fit gap-1 -ml-2 mb-2" onClick={() => setSelectedTicket(null)}>
                  <ArrowBackIcon sx={{ fontSize: 18 }} />
                  Back
                </Button>
                <div className="text-xs text-muted-foreground font-mono mb-1">{selectedTicket.ticket_number}</div>
                <SheetTitle>{selectedTicket.subject}</SheetTitle>
                <div className="flex gap-2 mt-2">
                  {(() => {
                    const styles = getStatusStyles(selectedTicket.status);
                    return (
                      <Badge variant="outline" className={cn("capitalize", styles.text, styles.bg)}>
                        {selectedTicket.status.replace("_", " ")}
                      </Badge>
                    );
                  })()}
                </div>
              </SheetHeader>

              <div className="space-y-3 mb-6">
                {(selectedTicket.messages || []).map((message) => (
                  <div key={message.id} className={cn("p-3 rounded-xl text-sm", message.sender_type === "user" ? "bg-muted ml-6" : "bg-primary/10 mr-6")}>
                    <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                      <span className="font-medium">{message.sender_type === "user" ? "You" : "Support"}</span>
                      <span>{format(new Date(message.created_at), "MMM d, h:mm a")}</span>
                    </div>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                <div className="border-t pt-4">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    className="mb-3"
                  />
                  <Button onClick={handleSendReply} disabled={!replyText.trim()} className="w-full">
                    Send Reply
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <SheetHeader className="pb-6">
                <SheetTitle>My Tickets</SheetTitle>
                <SheetDescription>{tickets.length} total</SheetDescription>
              </SheetHeader>

              {tickets.length === 0 ? (
                <div className="text-center py-12">
                  <ConfirmationNumberIcon className="text-muted-foreground mx-auto mb-3" sx={{ fontSize: 40 }} />
                  <p className="text-sm text-muted-foreground mb-4">No tickets yet</p>
                  <Button onClick={() => { setTicketSheetOpen(false); setCreateDialogOpen(true); }}>
                    Create Ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => {
                    const styles = getStatusStyles(ticket.status);
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", styles.bg)}>
                          <styles.icon className={styles.text} sx={{ fontSize: 18 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ticket.updated_at), "MMM d")} · {ticket.status.replace("_", " ")}
                          </p>
                        </div>
                        <ChevronRightIcon className="text-muted-foreground flex-shrink-0" sx={{ fontSize: 18 }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Floating Chat Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-50"
        >
          <ChatIcon sx={{ fontSize: 24 }} />
        </button>
      )}

      {user && <UnifiedMessagesWidget />}
    </div>
  );
};

export default Support;
