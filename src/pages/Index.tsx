import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, DollarSign } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in and redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, hsl(235 86% 65% / 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(250 86% 70% / 0.1) 0%, transparent 50%)"
      }} />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        {/* Hero Content */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Performance-Based Creator Platform</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold">
            <span className="bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Virality
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Turn your content into cash. Join top creators earning through performance-based campaigns.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <TrendingUp className="h-8 w-8 text-success mb-3 mx-auto" />
            <h3 className="font-semibold text-lg mb-2">Performance Based</h3>
            <p className="text-sm text-muted-foreground">
              Get paid based on views. The more viral you go, the more you earn.
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <DollarSign className="h-8 w-8 text-primary mb-3 mx-auto" />
            <h3 className="font-semibold text-lg mb-2">Instant Campaigns</h3>
            <p className="text-sm text-muted-foreground">
              Access dozens of active campaigns from top brands instantly.
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <Sparkles className="h-8 w-8 text-warning mb-3 mx-auto" />
            <h3 className="font-semibold text-lg mb-2">Creator First</h3>
            <p className="text-sm text-muted-foreground">
              Built by creators, for creators. Fair rates, transparent tracking.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Button 
            size="lg" 
            className="text-lg px-8 shadow-glow"
            onClick={() => navigate("/auth")}
          >
            Get Started
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8"
            onClick={() => navigate("/leaderboard")}
          >
            View Leaderboard
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-border/50">
          <div>
            <p className="text-3xl font-bold text-primary">$2M+</p>
            <p className="text-sm text-muted-foreground">Paid to Creators</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-success">500+</p>
            <p className="text-sm text-muted-foreground">Active Creators</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-warning">50+</p>
            <p className="text-sm text-muted-foreground">Brand Partners</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
