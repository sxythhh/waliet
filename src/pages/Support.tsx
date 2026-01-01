import { SEOHead } from "@/components/SEOHead";
import { SupportChat } from "@/components/support/SupportChat";
import PublicNavbar from "@/components/PublicNavbar";
import { ExternalLink, Mail, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I get started as a creator?",
    answer: "Sign up for a free account, complete your profile, and start browsing available campaigns. Apply to campaigns that match your content style and wait for brand approval."
  },
  {
    question: "How do payments work?",
    answer: "Payments are processed weekly based on your video performance. You'll earn based on the campaign's payment model - either CPM (cost per 1,000 views) or flat rate per video. Payouts are sent via your connected payment method."
  },
  {
    question: "What platforms are supported?",
    answer: "We currently support TikTok, Instagram Reels, and YouTube Shorts. You can connect multiple accounts and post content across different platforms for the same campaign."
  },
  {
    question: "How do I track my earnings?",
    answer: "Your dashboard shows real-time earnings, video performance metrics, and payment history. You can view detailed analytics for each campaign you're participating in."
  },
  {
    question: "What if my application gets rejected?",
    answer: "Don't worry! Brands have specific requirements for each campaign. Focus on improving your content quality and audience engagement, then apply to other campaigns that better match your style."
  },
  {
    question: "How do I contact a brand directly?",
    answer: "Once accepted into a campaign, you can message the brand directly through the platform. For general inquiries before applying, use the campaign's contact information if provided."
  },
];

const Support = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Support"
        description="Get help with Virality. Chat with our AI assistant about product support, billing questions, or provide feedback."
        keywords={["support", "help", "FAQ", "customer service", "AI assistant"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Support", url: "/support" },
        ]}
      />

      <PublicNavbar />

      <main className="flex-1 overflow-y-auto pt-24 pb-16 px-4">
        {/* Chat Interface */}
        <div className="mb-16">
          <SupportChat />
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Footer Links */}
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://join.virality.gg/support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">View the Help Center</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>

            <a
              href="mailto:support@virality.gg"
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Contact Support Team</span>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Support;
