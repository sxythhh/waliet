import { SEOHead } from "@/components/SEOHead";
import { SupportChat } from "@/components/support/SupportChat";
import PublicNavbar from "@/components/PublicNavbar";
import { ExternalLink, Mail, MessageCircle } from "lucide-react";

const Support = () => {
  return (
    <div className="min-h-screen bg-background">
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

      <main className="pt-24 pb-16 px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Support
          </h1>
          <p className="text-lg text-muted-foreground">
            Chat with us about product support, resolve billing questions, or provide feedback.
          </p>
        </div>

        {/* Chat Interface */}
        <div className="mb-16">
          <SupportChat />
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
